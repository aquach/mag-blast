import * as _ from 'lodash';
import { GameState } from '../types';
import { ChooseZoneAction, ActionError, PlayerId } from '../shared-types';
import { assert, warn } from '../utils';
import {
  fullOnShips,
  locationToString,
  movableZones,
  nonfullZones,
  owningPlayer
} from '../logic';
import { bold, event, p } from '../events';

export function applyChooseZoneAction(
  state: GameState,
  playerId: PlayerId,
  action: ChooseZoneAction): ActionError | undefined {
  if (state.turnState.type === 'PlaceStartingShipsState') {
    const chosenShipCards = state.turnState.chosenShipCards.get(playerId);
    assert(
      chosenShipCards !== undefined,
      `Ship cards for player ${playerId} not found.`
    );
    const playerState = state.getPlayerState(playerId);

    if (chosenShipCards.length === 0) {
      warn(`Player ${playerId} has no more ships to place.`);
      return;
    }

    const card = chosenShipCards.shift()!;

    playerState.ships.push({
      type: 'Ship',
      location: action.location,
      shipType: card,
      damage: 0,
      temporaryDamage: 0,
      hasFiredThisTurn: false,
      blastDamageHistory: [],
    });

    state.pushEventLog(event`${p(playerId)} places a ship.`);

    if (Array.from(state.turnState.chosenShipCards.values()).every(
      (c) => c.length === 0
    )) {
      const playerWithLowestHullStrength = _.minBy(state.playerTurnOrder, (p) => _.sum(state.playerState.get(p)!.ships.map((s) => s.shipType.hp))
      )!;
      const index = state.playerTurnOrder.indexOf(playerWithLowestHullStrength);

      state.playerTurnOrder = [
        ..._.drop(state.playerTurnOrder, index),
        ..._.take(state.playerTurnOrder, index),
      ];

      state.playerState.forEach((player) => {
        _.times(state.gameSettings.startingHandSize, () => player.hand.push(state.actionDeck.shift()!)
        );
      });

      state.pushEventLog(
        event`All players have placed their ships and the game can now begin.`
      );
      state.pushEventLog(
        event`${p(
          playerWithLowestHullStrength
        )} has the lowest total hull strength and thus goes first.`
      );
      state.pushEventLog(event`${bold('=== Turn 1 ===')}`);
      state.turnState = {
        type: 'ReinforceTurnState',
      };
      state.activePlayer = state.playerTurnOrder[0];
    }

    return;
  }

  if (state.activePlayer !== playerId) {
    warn('A player acted that was not the active player.');
    return;
  }
  const activePlayerState = state.getPlayerState(state.activePlayer);

  switch (state.turnState.type) {
    case 'ReinforcePlaceShipState':
    case 'AttackPlaceShipState':
      activePlayerState.ships.push({
        type: 'Ship',
        location: action.location,
        shipType: state.turnState.newShip,
        damage: 0,
        temporaryDamage: 0,
        hasFiredThisTurn: false,
        blastDamageHistory: [],
      });

      state.pushEventLog(
        event`${p(state.activePlayer)} places a new ${state.turnState.newShip.name} into their ${locationToString(action.location)} zone.`
      );

      switch (state.turnState.type) {
        case 'ReinforcePlaceShipState':
          if (fullOnShips(activePlayerState.ships)) {
            state.turnState = {
              type: 'ManeuverTurnState',
              originalLocations: new Map(),
            };
          } else {
            state.turnState = { type: 'ReinforceTurnState' };
          }
          break;

        case 'AttackPlaceShipState':
          state.turnState = { type: 'AttackTurnState' };
          break;
      }
      break;

    case 'AttackPlaceStolenShipState':
      state.turnState.stolenShip.location = action.location;
      activePlayerState.ships.push(state.turnState.stolenShip);

      state.pushEventLog(
        event`${p(state.activePlayer)} places the stolen ${state.turnState.stolenShip.shipType.name} into their ${locationToString(action.location)} zone.`
      );
      state.turnState = { type: 'AttackTurnState' };
      break;

    case 'AttackPlaceConcussiveBlastedShipsState':
      const ship = state.turnState.ships.shift();
      assert(ship !== undefined, 'ships must be nonempty.');

      const [targetPlayer, targetPlayerState] = owningPlayer(
        state.playerState,
        ship
      );

      if (!nonfullZones(targetPlayerState.ships).includes(action.location)) {
        warn(
          `Can't move ${ship.shipType.name} to the ${action.location} zone because it's full.`
        );
        break;
      }

      ship.location = action.location;

      state.pushEventLog(
        event`Through Concussive Blast, ${p(state.activePlayer)} moves ${p(
          targetPlayer
        )}'s ${ship.shipType.name} to the ${locationToString(
          action.location
        )} zone.`
      );
      if (state.turnState.ships.length === 0) {
        state.turnState = { type: 'AttackTurnState' };
      }
      break;

    case 'ManeuverChooseTargetZoneState':
      const originalLocation = state.turnState.originalLocations.get(
        state.turnState.ship
      );
      assert(
        originalLocation !== undefined,
        `originalLocations must be populated.`
      );

      const zones = movableZones(
        originalLocation,
        state.turnState.ship.shipType.movement
      );
      if (!zones.includes(action.location)) {
        warn(
          `Player ${state.activePlayer} chose a zone that the ship can't move to.`
        );
        break;
      }

      state.turnState.ship.location = action.location;

      state.pushEventLog(
        event`${p(state.activePlayer)} moves their ${state.turnState.ship.shipType.name} to the ${locationToString(action.location)} Zone.`
      );

      state.turnState = {
        type: 'ManeuverTurnState',
        originalLocations: state.turnState.originalLocations,
      };
      break;

    default:
      console.warn(
        `Encountered unhandled turn state ${state.turnState.type} for action ${action.type}.`
      );
  }
}
