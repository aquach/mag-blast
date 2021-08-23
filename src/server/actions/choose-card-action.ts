import * as _ from 'lodash';
import { GameState } from '../types';
import { ChooseCardAction, ActionError, PlayerId } from '../shared-types';
import { assert, partition, warn } from '../utils';
import {
  canPlayCard, discardActivePlayerCards,
  drawActivePlayerCards,
  drawShipCard,
  fullOnShips, sufficientForReinforcement, resolveActionCard,
  playersThatCanRespondToActions
} from '../logic';
import {
  NUM_STARTING_SHIPS,
  DRAW_UP_TO_HAND_SIZE
} from '../constants';
import { event, p } from '../events';

export function applyChooseCardAction(
  state: GameState,
  playerId: PlayerId,
  action: ChooseCardAction): ActionError | undefined {
  if (state.turnState.type === 'ChooseStartingShipsState') {
    const dealtShipCards = state.turnState.dealtShipCards.get(playerId);
    assert(
      dealtShipCards !== undefined,
      `Ship cards for player ${playerId} not found.`
    );
    if (!Array.isArray(action.handIndex)) {
      warn('handIndex should be an array for choosing starting ships.');
      return;
    }

    if (state.turnState.chosenShipCards.has(playerId)) {
      warn(`Player ${playerId} has already chosen starting ships.`);
      return;
    }

    const chosenCardIndices = action.handIndex;

    if (chosenCardIndices.length !== NUM_STARTING_SHIPS) {
      return {
        type: 'ActionError',
        message: `Please choose exactly ${NUM_STARTING_SHIPS} ships.`,
        time: new Date().getTime(),
      };
      return;
    }

    const [chosenCards, notChosenCards] = partition(dealtShipCards, (v, i) => chosenCardIndices.includes(i)
    );

    state.turnState.chosenShipCards.set(playerId, chosenCards);
    notChosenCards.forEach((c) => state.shipDiscardDeck.push(c));

    state.pushEventLog(event`${p(playerId)} chooses their ships.`);

    if (state.turnState.chosenShipCards.size === state.playerTurnOrder.length) {
      state.turnState = {
        type: 'PlaceStartingShipsState',
        chosenShipCards: state.turnState.chosenShipCards,
      };
    }

    return;
  }

  if (state.turnState.type === 'PlayBlastRespondState') {
    const playerState = state.getPlayerState(playerId);

    if (typeof action.handIndex !== 'number') {
      warn('handIndex should be a single number for playing cards.');
      return;
    }
    const card = playerState.hand[action.handIndex];

    if (!card) {
      warn(`Attempted to play a non-existent card ${action.handIndex}.`);
      return;
    }

    state.actionDiscardDeck.push(playerState.hand[action.handIndex]);
    playerState.hand.splice(action.handIndex, 1);

    if (card.cardType === 'TemporalFluxCard' ||
      card.cardType === 'EvasiveActionCard') {
      // Cancel effects by transitioning back to AttackTurnState without doing anything.
      state.pushEventLog(
        event`...but ${p(playerId)} responds with ${card.name}, canceling its effect!`
      );

      const respondablePlayers = playersThatCanRespondToActions(state, playerId);
      if (respondablePlayers.length > 0) {
        const resolveBlast = state.turnState.resolveBlast;

        state.turnState = {
          type: 'PlayActionRespondState',
          playingPlayer: playerId,
          respondingPlayers: respondablePlayers,
          resolveAction(): boolean {
            // The counter is successful, nothing happens.
            return false;
          },
          counterAction(): boolean {
            // The counter is countered, resolve the blast.
            return resolveBlast();
          },
        };
      } else {
        // Nobody to respond, so the effect is just canceled.
        state.turnState = {
          type: 'AttackTurnState',
        };
      }
    } else {
      warn(`Don't know what to do with card ${card.cardType}.`);
    }

    return;
  }

  if (state.turnState.type === 'PlaySquadronRespondState') {
    const playerState = state.getPlayerState(playerId);

    assert(
      typeof action.handIndex === 'number',
      'handIndex should be a single number for playing cards.'
    );
    const respondingCard = playerState.hand[action.handIndex];

    if (!respondingCard) {
      warn(`Attempted to respond with a non-existent card ${action.handIndex}.`);
      return;
    }

    if (!(
      respondingCard.cardType === 'TemporalFluxCard' ||
      respondingCard.cardType === 'EvasiveActionCard' ||
      respondingCard.cardType === 'FighterCard'
    )) {
      warn(`Don't know what to do with card ${respondingCard.cardType}.`);
      return;
    }

    const attackingPlayerState = state.getPlayerState(state.activePlayer);
    const attackingSquadronCard = state.turnState.squadron;
    state.pushEventLog(
      event`...but ${p(playerId)} responds with ${respondingCard.name}, canceling its effect!`
    );

    state.actionDiscardDeck.push(respondingCard);
    playerState.hand.splice(action.handIndex, 1);

    const resolveCounter = () => {
      // By default, squadrons will go back to the attacking player's hand.
      // But Temporal Flux and Fighters will destroy the attacking squadron.
      if (respondingCard.cardType === 'TemporalFluxCard' ||
        respondingCard.cardType === 'FighterCard') {
        _.remove(
          attackingPlayerState.usedSquadronCards,
          (c) => c === attackingSquadronCard
        );
        state.actionDiscardDeck.push(attackingSquadronCard);
        state.pushEventLog(
          event`${p(state.activePlayer)}'s ${attackingSquadronCard.name} is discarded.`
        );
      }

      if (respondingCard.cardType === 'FighterCard') {
        if (attackingSquadronCard.cardType === 'BomberCard') {
          // Responding to a Bomber with a Fighter lets you keep the Fighter.
          state.pushEventLog(
            event`${p(playerId)}'s ${respondingCard.name} will return to their hand at end of turn.`
          );
          _.remove(state.actionDiscardDeck, (c) => c === respondingCard);
          playerState.usedSquadronCards.push(respondingCard);
        } else {
          // Point out the Fighter loss.
          state.pushEventLog(
            event`${p(playerId)}'s ${respondingCard.name} is discarded.`
          );
        }
      }
    };

    const respondablePlayers = playersThatCanRespondToActions(state, playerId);
    if (respondablePlayers.length > 0) {
      const resolveSquadron = state.turnState.resolveSquadron;

      state.turnState = {
        type: 'PlayActionRespondState',
        playingPlayer: playerId,
        respondingPlayers: respondablePlayers,
        resolveAction(): boolean {
          // The counter is successful.
          resolveCounter();
          return false;
        },
        counterAction(): boolean {
          // The counter is countered, resolve the squadron. Also point out if we lost a Fighter in the process.
          if (respondingCard.cardType === 'FighterCard') {
            // Point out the Fighter loss.
            state.pushEventLog(
              event`${p(playerId)}'s ${respondingCard.name} is discarded.`
            );
          }
          return resolveSquadron();
        },
      };
    } else {
      // Nobody to respond to the counter, so the counter resolves immediately.
      resolveCounter();
      state.turnState = {
        type: 'AttackTurnState',
      };
    }

    return;
  }

  if (state.turnState.type === 'PlayActionRespondState') {
    if (playerId !== state.turnState.respondingPlayers[0]) {
      warn(`Wrong player to respond to action.`);
      return;
    }

    const playerState = state.getPlayerState(playerId);

    assert(
      typeof action.handIndex === 'number',
      'handIndex should be a single number for playing cards.'
    );
    const respondingCard = playerState.hand[action.handIndex];

    if (!respondingCard) {
      warn(`Attempted to respond with a non-existent card ${action.handIndex}.`);
      return;
    }

    if (respondingCard.cardType !== 'TemporalFluxCard') {
      warn(`Don't know what to do with card ${respondingCard.cardType}.`);
      return;
    }

    state.pushEventLog(
      event`...but ${p(playerId)} responds with ${respondingCard.name}, canceling its effect!`
    );

    state.actionDiscardDeck.push(respondingCard);
    playerState.hand.splice(action.handIndex, 1);

    const respondablePlayers = playersThatCanRespondToActions(state, playerId);
    if (respondablePlayers.length > 0) {
      const resolveAction = state.turnState.resolveAction;
      const counterAction = state.turnState.counterAction;

      state.turnState = {
        type: 'PlayActionRespondState',
        playingPlayer: playerId,
        respondingPlayers: respondablePlayers,
        resolveAction(): boolean {
          // The counter is successful.
          return counterAction();
        },
        counterAction(): boolean {
          // The counter is countered, resolve the action.
          return resolveAction();
        },
      };
    } else {
      if (!state.turnState.counterAction()) {
        state.turnState = {
          type: 'AttackTurnState',
        };
      }
    }

    return;
  }

  if (state.activePlayer !== playerId) {
    warn('A player acted that was not the active player.');
    return;
  }

  const activePlayerState = state.getPlayerState(state.activePlayer);

  switch (state.turnState.type) {
    case 'DiscardTurnState':
      // Discard, then draw.
      if (!Array.isArray(action.handIndex)) {
        warn('handIndex should be an array for discarding.');
        break;
      }

      const discardIndices = action.handIndex;
      discardActivePlayerCards(state, discardIndices);

      if (discardIndices.length > 0) {
        state.pushEventLog(
          event`${p(state.activePlayer)} discards ${discardIndices.length} cards.`
        );
      }

      if (activePlayerState.hand.length < DRAW_UP_TO_HAND_SIZE) {
        drawActivePlayerCards(
          state,
          DRAW_UP_TO_HAND_SIZE - activePlayerState.hand.length
        );
      }

      if (fullOnShips(activePlayerState.ships)) {
        state.turnState = {
          type: 'ManeuverTurnState',
          originalLocations: new Map(),
        };
      } else {
        state.turnState = { type: 'ReinforceTurnState' };
      }

      break;

    case 'ReinforceTurnState':
      if (!Array.isArray(action.handIndex)) {
        warn('handIndex should be an array for reinforcing.');
        break;
      }
      const reinforceIndices = action.handIndex;

      if (sufficientForReinforcement(
        reinforceIndices.map((i) => activePlayerState.hand[i])
      )) {
        discardActivePlayerCards(state, reinforceIndices);

        state.pushEventLog(
          event`${p(state.activePlayer)} uses ${reinforceIndices.length} cards to draw reinforcements.`
        );

        const newShip = drawShipCard(state);

        state.turnState = {
          type: 'ReinforcePlaceShipState',
          newShip,
        };
      } else {
        return {
          type: 'ActionError',
          message: "You didn't select enough resources to reinforce.",
          time: new Date().getTime(),
        };
      }
      break;

    case 'AttackTurnState':
      if (typeof action.handIndex !== 'number') {
        warn('handIndex should be a single number for playing cards.');
        break;
      }
      const card = activePlayerState.hand[action.handIndex];

      if (!card) {
        warn(`Attempted to play a non-existent card ${action.handIndex}.`);
        return;
      }

      if (!canPlayCard(state, activePlayerState, card)) {
        warn(`${state.activePlayer} current can't play ${card.name}.`);
        return;
      }

      // Consume the card.
      activePlayerState.hand.splice(action.handIndex, 1);

      const playingCardHasMoreStates = card.isSquadron ||
        card.isBlast ||
        card.cardType === 'RammingSpeedCard' ||
        card.cardType === 'AsteroidsCard' ||
        card.cardType === 'MinefieldCard' ||
        card.cardType === 'SpacedockCard';

      if (!playingCardHasMoreStates) {
        // These will get announced later by their respective states.
        const punctuation = card.isDirectHit || card.isDirectHitEffect ? '!' : '.';
        state.pushEventLog(
          event`${p(state.activePlayer)} plays ${card.name}${punctuation}`
        );
      }

      const respondablePlayers = playersThatCanRespondToActions(
        state,
        state.activePlayer
      );

      if (!playingCardHasMoreStates && respondablePlayers.length > 0) {
        state.turnState = {
          type: 'PlayActionRespondState',
          playingPlayer: state.activePlayer,
          respondingPlayers: respondablePlayers,
          resolveAction(): boolean {
            return resolveActionCard(state, card);
          },
          counterAction(): boolean {
            // The action is countered. Nothing happens. Card should be
            // discarded (it normally gets discarded in resolveActionCard).
            state.actionDiscardDeck.push(card);
            return false;
          },
        };
      } else {
        // If the card has more states, it'll transition to that state in
        // resolveActionCard, and only then will go into
        // PlayActionRespondState if need be.
        resolveActionCard(state, card);
      }

      break;

    default:
      console.warn(
        `Encountered unhandled turn state ${state.turnState.type} for action ${action.type}.`
      );
  }
}
