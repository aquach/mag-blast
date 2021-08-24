import { Action, ActionError, PlayerId } from '../shared-types'
import { GameState } from '../types'
import { applyActivateCommandShipAbilityAction } from './activate-command-ship-ability-action'
import { applyActivateMinesweeperAbilityAction } from './activate-minesweeper-ability-action'
import { applyCancelAction } from './cancel-action'
import { applyChooseAction } from './choose-action'
import { applyChooseCardAction } from './choose-card-action'
import { applyChooseShipAction } from './choose-ship-action'
import { applyChooseZoneAction } from './choose-zone-action'
import { applyPassAction } from './pass-action'

export function applyAction(
  state: GameState,
  playerId: PlayerId,
  action: Action
): ActionError | undefined {
  switch (action.type) {
    case 'ChooseCardAction':
      return applyChooseCardAction(state, playerId, action)

    case 'ChooseShipAction':
      return applyChooseShipAction(state, playerId, action)

    case 'PassAction':
      return applyPassAction(state, playerId, action)

    case 'ChooseZoneAction':
      return applyChooseZoneAction(state, playerId, action)

    case 'CancelAction':
      return applyCancelAction(state, playerId, action)

    case 'ActivateCommandShipAbilityAction':
      return applyActivateCommandShipAbilityAction(state, playerId, action)

    case 'ActivateMinesweeperAbilityAction':
      return applyActivateMinesweeperAbilityAction(state, playerId, action)

    case 'ChooseAction':
      return applyChooseAction(state, playerId, action)

    default:
      const cantGetHere: never = action
  }
}
