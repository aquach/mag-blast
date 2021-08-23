import { GameState } from '../types';
import {
  ActionError, PlayerId,
  ChooseAction
} from '../shared-types';
import { warn } from '../utils';

export function applyChooseAction(
  state: GameState,
  playerId: PlayerId,
  action: ChooseAction): ActionError | undefined {
  if (state.activePlayer !== playerId) {
    warn('A player acted that was not the active player.');
    return;
  }

  switch (state.turnState.type) {
    case 'AttackChooseAsteroidOrMinefieldToSweepState':
      switch (action.choice) {
        case 'Asteroids':
          state.turnState.resolveAsteroids();
          break;
        case 'Minefield':
          state.turnState.resolveMinefield();
          break;
        default:
          console.warn(`Unknown choice ${action.choice}.`);
          break;
      }
      break;
    default:
      console.warn(
        `Don't know how to choose from ${state.turnState.type} state.`
      );
  }
}
