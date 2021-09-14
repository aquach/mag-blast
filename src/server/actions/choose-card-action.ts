import * as _ from 'lodash'
import { DRAW_UP_TO_HAND_SIZE, NUM_STARTING_SHIPS } from '../constants'
import { event, p } from '../events'
import {
  canPlayCardDuringAttackPhase,
  discardPlayerHandCards,
  drawAndChooseShipCard,
  drawCards,
  fullOnShips,
  owningPlayer,
  playersThatCanRespondToActions,
  resolveActionCard,
  sufficientForCraniumCounter,
  sufficientForReinforcement,
} from '../logic'
import { ActionError, ChooseCardAction, PlayerId } from '../shared-types'
import {
  ChooseStartingShipsState,
  CraniumConsortiumChooseResourcesToDiscardState,
  GameState,
  PlayActionRespondState,
  PlayBlastRespondState,
  PlaySquadronRespondState,
} from '../types'
import { assert, partition, warn } from '../utils'

function handleChooseStartingShipState(
  state: GameState,
  turnState: ChooseStartingShipsState,
  playerId: PlayerId,
  action: ChooseCardAction
): ActionError | undefined {
  const dealtShipCards = turnState.dealtShipCards.get(playerId)
  assert(
    dealtShipCards !== undefined,
    `Ship cards for player ${playerId} not found.`
  )
  if (!Array.isArray(action.cardIndex)) {
    warn('cardIndex should be an array for choosing starting ships.')
    return
  }

  if (turnState.chosenShipCards.has(playerId)) {
    warn(`Player ${playerId} has already chosen starting ships.`)
    return
  }

  const chosenCardIndices = action.cardIndex

  if (chosenCardIndices.length !== NUM_STARTING_SHIPS) {
    return {
      type: 'ActionError',
      message: `Please choose exactly ${NUM_STARTING_SHIPS} ships.`,
      time: new Date().getTime(),
    }
  }

  const [chosenCards, notChosenCards] = partition(dealtShipCards, (v, i) =>
    chosenCardIndices.includes(i)
  )

  turnState.chosenShipCards.set(playerId, chosenCards)
  notChosenCards.forEach((c) => state.shipDiscardDeck.push(c))

  state.pushEventLog(event`${p(playerId)} chooses their ships.`)

  if (turnState.chosenShipCards.size === state.playerTurnOrder.length) {
    state.turnState = {
      type: 'PlaceStartingShipsState',
      chosenShipCards: turnState.chosenShipCards,
    }
  }
}

function handlePlayBlastRespondState(
  state: GameState,
  turnState: PlayBlastRespondState,
  playerId: PlayerId,
  action: ChooseCardAction
): ActionError | undefined {
  if (owningPlayer(state.playerState, turnState.targetShip)[0] !== playerId) {
    warn('Only the owner of the target ship can respond.')
    return
  }

  const playerState = state.getPlayerState(playerId)

  if (typeof action.cardIndex !== 'number') {
    warn('cardIndex should be a single number for playing cards.')
    return
  }
  const card = playerState.hand[action.cardIndex]

  if (!card) {
    warn(`Attempted to play a non-existent card ${action.cardIndex}.`)
    return
  }

  state.actionDiscardDeck.push(playerState.hand[action.cardIndex])
  playerState.hand.splice(action.cardIndex, 1)

  if (
    card.cardType === 'TemporalFluxCard' ||
    card.cardType === 'EvasiveActionCard'
  ) {
    // Cancel effects by transitioning back to AttackTurnState without doing anything.
    state.pushEventLog(
      event`...but ${p(playerId)} responds with ${
        card.name
      }, canceling its effect!`
    )

    const respondablePlayers = playersThatCanRespondToActions(state, playerId)
    if (respondablePlayers.length > 0) {
      const resolveBlast = turnState.resolveBlast

      state.turnState = {
        type: 'PlayActionRespondState',
        playingPlayer: playerId,
        respondingPlayers: respondablePlayers,
        resolveAction(): boolean {
          // The counter is successful, nothing happens.
          return false
        },
        counterAction(): boolean {
          // The counter is countered, resolve the blast.
          return resolveBlast()
        },
      }
    } else {
      // Nobody to respond, so the effect is just canceled.
      state.turnState = {
        type: 'AttackTurnState',
      }
    }
  } else {
    warn(`Don't know what to do with card ${card.cardType}.`)
  }

  return
}

function handlePlaySquadronResponseState(
  state: GameState,
  turnState: PlaySquadronRespondState,
  playerId: PlayerId,
  action: ChooseCardAction
): ActionError | undefined {
  if (owningPlayer(state.playerState, turnState.targetShip)[0] !== playerId) {
    warn('Only the owner of the target ship can respond.')
    return
  }
  const playerState = state.getPlayerState(playerId)

  assert(
    typeof action.cardIndex === 'number',
    'cardIndex should be a single number for playing cards.'
  )
  const respondingCard = playerState.hand[action.cardIndex]

  if (!respondingCard) {
    warn(`Attempted to respond with a non-existent card ${action.cardIndex}.`)
    return
  }

  if (
    !(
      respondingCard.cardType === 'TemporalFluxCard' ||
      respondingCard.cardType === 'EvasiveActionCard' ||
      respondingCard.cardType === 'FighterCard'
    )
  ) {
    warn(`Don't know what to do with card ${respondingCard.cardType}.`)
    return
  }

  const attackingPlayerState = state.getPlayerState(state.activePlayer)
  const attackingSquadronCard = turnState.squadron
  state.pushEventLog(
    event`...but ${p(playerId)} responds with ${
      respondingCard.name
    }, canceling its effect!`
  )

  state.actionDiscardDeck.push(respondingCard)
  playerState.hand.splice(action.cardIndex, 1)

  const resolveCounter = () => {
    // By default, squadrons will go back to the attacking player's hand.
    // But Temporal Flux and Fighters will destroy the attacking squadron.
    if (
      respondingCard.cardType === 'TemporalFluxCard' ||
      respondingCard.cardType === 'FighterCard'
    ) {
      _.remove(
        attackingPlayerState.usedSquadronCards,
        (c) => c === attackingSquadronCard
      )
      state.actionDiscardDeck.push(attackingSquadronCard)
      state.pushEventLog(
        event`${p(state.activePlayer)}'s ${
          attackingSquadronCard.name
        } is discarded.`
      )
    }

    if (respondingCard.cardType === 'FighterCard') {
      if (attackingSquadronCard.cardType === 'BomberCard') {
        // Responding to a Bomber with a Fighter lets you keep the Fighter.
        state.pushEventLog(
          event`${p(playerId)}'s ${
            respondingCard.name
          } will return to their hand at end of turn.`
        )
        _.remove(state.actionDiscardDeck, (c) => c === respondingCard)
        playerState.usedSquadronCards.push(respondingCard)
      } else {
        // Point out the Fighter loss.
        state.pushEventLog(
          event`${p(playerId)}'s ${respondingCard.name} is discarded.`
        )
      }
    }
  }

  const respondablePlayers = playersThatCanRespondToActions(state, playerId)
  if (respondablePlayers.length > 0) {
    const resolveSquadron = turnState.resolveSquadron

    state.turnState = {
      type: 'PlayActionRespondState',
      playingPlayer: playerId,
      respondingPlayers: respondablePlayers,
      resolveAction(): boolean {
        // The counter is successful.
        resolveCounter()
        return false
      },
      counterAction(): boolean {
        // The counter is countered, resolve the squadron. Also point out if we lost a Fighter in the process.
        if (respondingCard.cardType === 'FighterCard') {
          // Point out the Fighter loss.
          state.pushEventLog(
            event`${p(playerId)}'s ${respondingCard.name} is discarded.`
          )
        }
        return resolveSquadron()
      },
    }
  } else {
    // Nobody to respond to the counter, so the counter resolves immediately.
    resolveCounter()
    state.turnState = {
      type: 'AttackTurnState',
    }
  }
}

function handlePlayActionResponseState(
  state: GameState,
  turnState: PlayActionRespondState,
  playerId: PlayerId,
  action: ChooseCardAction
): ActionError | undefined {
  if (playerId !== turnState.respondingPlayers[0]) {
    warn(`Wrong player to respond to action.`)
    return
  }

  const playerState = state.getPlayerState(playerId)

  assert(
    typeof action.cardIndex === 'number',
    'cardIndex should be a single number for playing cards.'
  )
  const respondingCard = playerState.hand[action.cardIndex]

  if (!respondingCard) {
    warn(`Attempted to respond with a non-existent card ${action.cardIndex}.`)
    return
  }

  if (respondingCard.cardType !== 'TemporalFluxCard') {
    warn(`Don't know what to do with card ${respondingCard.cardType}.`)
    return
  }

  state.pushEventLog(
    event`...but ${p(playerId)} responds with ${
      respondingCard.name
    }, canceling its effect!`
  )

  state.actionDiscardDeck.push(respondingCard)
  playerState.hand.splice(action.cardIndex, 1)

  const respondablePlayers = playersThatCanRespondToActions(state, playerId)
  if (respondablePlayers.length > 0) {
    const resolveAction = turnState.resolveAction
    const counterAction = turnState.counterAction

    state.turnState = {
      type: 'PlayActionRespondState',
      playingPlayer: playerId,
      respondingPlayers: respondablePlayers,
      resolveAction(): boolean {
        // The counter is successful.
        return counterAction()
      },
      counterAction(): boolean {
        // The counter is countered, resolve the action.
        return resolveAction()
      },
    }
  } else {
    if (!turnState.counterAction()) {
      state.turnState = {
        type: 'AttackTurnState',
      }
    }
  }

  return
}

function handleCraniumConsortiumChooseResourcesToDiscardState(
  state: GameState,
  turnState: CraniumConsortiumChooseResourcesToDiscardState,
  playerId: PlayerId,
  action: ChooseCardAction
): ActionError | undefined {
  if (turnState.respondingPlayer !== playerId) {
    warn('Only the responding player can respond.')
    return
  }

  if (!Array.isArray(action.cardIndex)) {
    warn('cardIndex should be an array for reinforcing.')
    return
  }
  const discardIndices = action.cardIndex

  const respondingPlayer = turnState.respondingPlayer
  const respondingPlayerState = state.getPlayerState(respondingPlayer)

  if (
    sufficientForCraniumCounter(
      discardIndices.map((i) => respondingPlayerState.hand[i])
    )
  ) {
    discardPlayerHandCards(state, respondingPlayer, discardIndices)

    state.pushEventLog(
      event`${p(state.activePlayer)} discards ${discardIndices.length} card${
        discardIndices.length === 1 ? '' : 's'
      } to cancel the incoming blast!`
    )

    state.turnState = {
      type: 'AttackTurnState',
    }

    return
  } else {
    return {
      type: 'ActionError',
      message: "You didn't select enough resources (two of any kind required).",
      time: new Date().getTime(),
    }
  }
}

export function applyChooseCardAction(
  state: GameState,
  playerId: PlayerId,
  action: ChooseCardAction
): ActionError | undefined {
  if (state.turnState.type === 'ChooseStartingShipsState') {
    return handleChooseStartingShipState(
      state,
      state.turnState,
      playerId,
      action
    )
  }

  if (state.turnState.type === 'PlayBlastRespondState') {
    return handlePlayBlastRespondState(state, state.turnState, playerId, action)
  }

  if (state.turnState.type === 'PlaySquadronRespondState') {
    return handlePlaySquadronResponseState(
      state,
      state.turnState,
      playerId,
      action
    )
  }

  if (state.turnState.type === 'PlayActionRespondState') {
    return handlePlayActionResponseState(
      state,
      state.turnState,
      playerId,
      action
    )
  }

  if (
    state.turnState.type === 'CraniumConsortiumChooseResourcesToDiscardState'
  ) {
    return handleCraniumConsortiumChooseResourcesToDiscardState(
      state,
      state.turnState,
      playerId,
      action
    )
  }

  if (state.activePlayer !== playerId) {
    warn('A player acted that was not the active player.')
    return
  }

  const activePlayerState = state.getPlayerState(state.activePlayer)

  switch (state.turnState.type) {
    case 'DiscardTurnState':
      // Discard, then draw.
      if (!Array.isArray(action.cardIndex)) {
        warn('cardIndex should be an array for discarding.')
        break
      }

      const discardIndices = action.cardIndex
      discardPlayerHandCards(state, state.activePlayer, discardIndices)

      if (discardIndices.length > 0) {
        state.pushEventLog(
          event`${p(state.activePlayer)} discards ${
            discardIndices.length
          } cards.`
        )
      }

      if (
        activePlayerState.hand.length < DRAW_UP_TO_HAND_SIZE &&
        !state.turnState.skipDraw
      ) {
        drawCards(
          state,
          state.activePlayer,
          DRAW_UP_TO_HAND_SIZE - activePlayerState.hand.length
        )
      }

      if (fullOnShips(activePlayerState.ships)) {
        state.turnState = {
          type: 'ManeuverTurnState',
          originalLocations: new Map(),
        }
      } else {
        state.turnState = { type: 'ReinforceTurnState' }
      }

      break

    case 'OverseersChooseBlastsState':
      {
        if (!Array.isArray(action.cardIndex)) {
          warn(
            'cardIndex should be an array for choosing OverseersOfKalgon ships.'
          )
          break
        }

        const chosenIndices = action.cardIndex

        const [chosenCards, notChosenCards] = partition(
          state.actionDiscardDeck,
          (v, i) => chosenIndices.includes(i)
        )

        if (chosenCards.length > 3) {
          return {
            type: 'ActionError',
            message: 'Please choose up to three blasts.',
            time: new Date().getTime(),
          }
        }

        if (!chosenCards.every((c) => c.isBlast)) {
          warn(
            `${state.activePlayer} chose more than 3 cards or chose non-blasts.`
          )
          break
        }

        chosenCards.forEach((c) => activePlayerState.hand.push(c))
        state.actionDiscardDeck = notChosenCards

        state.turnState = {
          type: 'DiscardTurnState',
          skipDraw: true,
        }
      }
      break

    case 'MheeChooseShipState':
      {
        if (Array.isArray(action.cardIndex)) {
          warn(
            'cardIndex should be a single value for choosing MheeYowMeex ship.'
          )
          break
        }

        const chosenCardIndex = action.cardIndex
        const chosenCard = state.turnState.ships[chosenCardIndex]
        const notChosenCards = state.turnState.ships.filter(
          (v, i) => chosenCardIndex !== i
        )

        if (notChosenCards.length !== state.turnState.ships.length - 1) {
          warn('Invalid cardIndex for choosing MheeYowMeex ship.')
          break
        }

        notChosenCards.forEach((c) => state.shipDiscardDeck.push(c))

        state.pushEventLog(
          event`${p(
            state.activePlayer
          )} draws two ships and chooses one, thanks to ${
            state.getPlayerState(state.activePlayer).commandShip.shipType.name
          }.`
        )

        state.turnState = state.turnState.nextState(chosenCard)
      }
      break

    case 'TribotChooseShipState':
      {
        if (Array.isArray(action.cardIndex)) {
          warn('cardIndex should be a single value for choosing Tribot ship.')
          break
        }

        const chosenCardIndex = action.cardIndex
        const chosenCard = state.shipDiscardDeck[chosenCardIndex]

        if (!chosenCard) {
          warn(
            `${state.activePlayer} chose invalid card index ${chosenCardIndex}.`
          )
          break
        }

        state.shipDiscardDeck.splice(chosenCardIndex, 1)

        state.turnState = {
          type: 'ReinforcePlaceShipState',
          newShip: chosenCard,
        }
      }

      break

    case 'ReinforceTurnState':
      {
        if (!Array.isArray(action.cardIndex)) {
          warn('cardIndex should be an array for reinforcing.')
          break
        }
        const reinforceIndices = action.cardIndex

        if (
          sufficientForReinforcement(
            reinforceIndices.map((i) => activePlayerState.hand[i])
          )
        ) {
          discardPlayerHandCards(state, state.activePlayer, reinforceIndices)

          state.pushEventLog(
            event`${p(state.activePlayer)} discards ${
              reinforceIndices.length
            } cards to draw reinforcements.`
          )
          state.turnState = drawAndChooseShipCard(state, (newShip) => ({
            type: 'ReinforcePlaceShipState',
            newShip,
          }))
        } else {
          return {
            type: 'ActionError',
            message: "You didn't select enough resources to reinforce.",
            time: new Date().getTime(),
          }
        }
      }
      break

    case 'TribotReinforceTurnState':
      {
        if (!Array.isArray(action.cardIndex)) {
          warn('cardIndex should be an array for reinforcing.')
          break
        }
        const reinforceIndices = action.cardIndex

        if (
          sufficientForReinforcement(
            reinforceIndices.map((i) => activePlayerState.hand[i])
          )
        ) {
          discardPlayerHandCards(state, state.activePlayer, reinforceIndices)

          state.pushEventLog(
            event`${p(state.activePlayer)} discards ${
              reinforceIndices.length
            } cards to draw reinforcements from the ship discard pile.`
          )
          state.turnState = {
            type: 'TribotChooseShipState',
          }
        } else {
          return {
            type: 'ActionError',
            message: "You didn't select enough resources to reinforce.",
            time: new Date().getTime(),
          }
        }
      }
      break

    case 'AttackDiscardCardState':
      {
        if (typeof action.cardIndex !== 'number') {
          warn('cardIndex should be a single number for discarding a card.')
          break
        }

        const card = activePlayerState.hand[action.cardIndex]

        if (!card) {
          warn(`Attempted to discard a non-existent card ${action.cardIndex}.`)
          return
        }

        // Consume the card.
        activePlayerState.hand.splice(action.cardIndex, 1)
        state.actionDiscardDeck.push(card)

        state.turnState.onResolve()
      }
      break

    case 'AttackTurnState':
      if (typeof action.cardIndex !== 'number') {
        warn('cardIndex should be a single number for playing cards.')
        break
      }
      const card = activePlayerState.hand[action.cardIndex]

      if (!card) {
        warn(`Attempted to play a non-existent card ${action.cardIndex}.`)
        return
      }

      if (!canPlayCardDuringAttackPhase(state, activePlayerState, card)) {
        warn(`${state.activePlayer} current can't play ${card.name}.`)
        return
      }

      // Consume the card.
      activePlayerState.hand.splice(action.cardIndex, 1)

      const playingCardHasMoreStates =
        card.isSquadron ||
        card.isBlast ||
        card.cardType === 'RammingSpeedCard' ||
        card.cardType === 'AsteroidsCard' ||
        card.cardType === 'MinefieldCard' ||
        card.cardType === 'SpacedockCard'

      if (!playingCardHasMoreStates) {
        // These will get announced later by their respective states.
        const punctuation =
          card.isDirectHit || card.isDirectHitEffect ? '!' : '.'
        state.pushEventLog(
          event`${p(state.activePlayer)} plays ${card.name}${punctuation}`
        )
      }

      const respondablePlayers = playersThatCanRespondToActions(
        state,
        state.activePlayer
      )

      if (!playingCardHasMoreStates && respondablePlayers.length > 0) {
        state.turnState = {
          type: 'PlayActionRespondState',
          playingPlayer: state.activePlayer,
          respondingPlayers: respondablePlayers,
          resolveAction(): boolean {
            return resolveActionCard(state, card)
          },
          counterAction(): boolean {
            // The action is countered. Nothing happens. Card should be
            // discarded (it normally gets discarded in resolveActionCard).
            state.actionDiscardDeck.push(card)
            return false
          },
        }
      } else {
        // If the card has more states, it'll transition to that state in
        // resolveActionCard, and only then will go into
        // PlayActionRespondState if need be.
        resolveActionCard(state, card)
      }

      break

    default:
      console.warn(
        `Encountered unhandled turn state ${state.turnState.type} for action ${action.type}.`
      )
  }
}
