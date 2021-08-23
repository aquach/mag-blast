import { GameState } from '../types';
import {
  ActionError,
  ActivateCommandShipAbilityAction, PlayerId
} from '../shared-types';
import { warn } from '../utils';
import { hasCommandShipAbilityActivations } from '../logic';
import { event } from '../events';
import { executeAbility } from '../abilities';

export function applyActivateCommandShipAbilityAction(
  state: GameState,
  playerId: PlayerId,
  action: ActivateCommandShipAbilityAction): ActionError | undefined {
  const playerState = state.getPlayerState(playerId);

  if (!hasCommandShipAbilityActivations(playerState)) {
    warn(`${playerId} can't use their command ship ability.`);
    return;
  }

  state.pushEventLog(
    event`${state.activePlayer} activates ${playerState.commandShip.shipType.name}!`
  );
  playerState.commandShip.remainingAbilityActivations! -= 1;
  executeAbility(state, playerId);
}
