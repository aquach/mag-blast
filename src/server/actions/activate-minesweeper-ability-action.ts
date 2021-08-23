import { GameState } from '../types'
import {
  ActionError,
  PlayerId,
  ActivateMinesweeperAbilityAction,
} from '../shared-types'
import { warn } from '../utils'
import { minesweeperTargets } from '../logic'

export function applyActivateMinesweeperAbilityAction(
  state: GameState,
  playerId: PlayerId,
  action: ActivateMinesweeperAbilityAction
): ActionError | undefined {
  if (state.activePlayer !== playerId) {
    warn('A player acted that was not the active player.')
    return
  }

  if (!minesweeperTargets(state, playerId)) {
    warn(`${playerId} has no valid minesweeper targets.`)
    return
  }

  state.turnState = {
    type: 'AttackChooseMinesweeperState',
  }
}
