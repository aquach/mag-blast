import * as _ from 'lodash';
import { GameState } from '../types';
import {
  CancelAction,
  ActionCard,
  ActionError, PlayerId
} from '../shared-types';
import { warn } from '../utils';

export function applyCancelAction(
  state: GameState,
  playerId: PlayerId,
  action: CancelAction): ActionError | undefined {
  if (state.activePlayer !== playerId) {
    warn('A player acted that was not the active player.');
    return;
  }
  const activePlayerState = state.getPlayerState(state.activePlayer);

  let card: ActionCard | undefined;

  switch (state.turnState.type) {
    case 'PlayBlastChooseFiringShipState':
    case 'PlayBlastChooseTargetShipState':
      card = state.turnState.blast;
      break;
    case 'PlaySquadronChooseTargetShipState':
      card = state.turnState.squadron;
      _.remove(activePlayerState.usedSquadronCards, (c) => c === card);
      break;
    case 'AttackChooseMinesweeperState':
    case 'AttackChoosePlayerToMinesweepState':
    case 'AttackChooseAsteroidOrMinefieldToSweepState':
      card = undefined;
      break;
    case 'AttackChooseAsteroidsPlayerTurnState':
    case 'AttackChooseMinefieldPlayerTurnState':
    case 'AttackChooseSpacedockShipState':
      card = state.turnState.card;
      break;
    default:
      console.warn(
        `Don't know how to cancel from ${state.turnState.type} state.`
      );
      return;
  }

  if (card !== undefined) {
    activePlayerState.hand.push(card);
    _.remove(state.actionDiscardDeck, (c) => c === card);
  }

  state.turnState = {
    type: 'AttackTurnState',
  };
}
