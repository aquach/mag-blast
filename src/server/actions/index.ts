import { GameState } from '../types'

import { Action, ActionError, PlayerId } from '../shared-types'
import { applyChooseCardAction } from './choose-card-action'
import { applyChooseShipAction } from './choose-ship-action'
import { applyPassAction } from './pass-action'
import { applyChooseZoneAction } from './choose-zone-action'
import { applyCancelAction } from './cancel-action'
import { applyActivateCommandShipAbilityAction } from './activate-command-ship-ability-action'
import { applyActivateMinesweeperAbilityAction } from './activate-minesweeper-ability-action'
import { applyChooseAction } from './choose-action'

export function applyAction(
  state: GameState,
  playerId: PlayerId,
  action: Action
): ActionError | undefined {
  switch (action.type) {
    case 'ChooseCardAction':
      return applyChooseCardAction(state, playerId, action)
      break

    case 'ChooseShipAction':
      return applyChooseShipAction(state, playerId, action)
      break

    case 'PassAction':
      return applyPassAction(state, playerId, action)
      break

    case 'ChooseZoneAction':
      return applyChooseZoneAction(state, playerId, action)
      break

    case 'CancelAction':
      return applyCancelAction(state, playerId, action)
      break

    case 'ActivateCommandShipAbilityAction':
      return applyActivateCommandShipAbilityAction(state, playerId, action)
      break

    case 'ActivateMinesweeperAbilityAction':
      return applyActivateMinesweeperAbilityAction(state, playerId, action)
      break

    case 'ChooseAction':
      return applyChooseAction(state, playerId, action)
      break

    default:
      const cantGetHere: never = action
  }
}
