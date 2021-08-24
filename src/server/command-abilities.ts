import { warn } from 'console'
import { owningPlayer, sufficientForCraniumCounter } from './logic'
import { CommandShipType, PlayerId } from './shared-types'
import { GameState } from './types'

interface ActivatedCommandShipAbility {
  commandType: CommandShipType
  activate: (_: GameState, playerId: PlayerId, dryRun: boolean) => boolean
}

const ABILITIES: ActivatedCommandShipAbility[] = [
  {
    commandType: 'CraniumConsortium',
    activate(s, playerId, dryRun) {
      if (s.turnState.type === 'PlayBlastRespondState') {
        const [respondingPlayer, respondingPlayerState] = owningPlayer(
          s.playerState,
          s.turnState.targetShip
        )

        if (
          respondingPlayer === playerId &&
          sufficientForCraniumCounter(respondingPlayerState.hand) &&
          s.turnState.targetShip.type === 'Ship'
        ) {
          if (dryRun) {
            return true
          }

          s.turnState = {
            type: 'CraniumConsortiumChooseResourcesToDiscardState',
            respondingPlayer,
          }

          return true
        }
      }

      return false
    },
  },
  {
    commandType: 'OverseersOfKalgon',
    activate(s, playerId, dryRun) {
      if (
        s.turnState.type === 'DiscardTurnState' &&
        s.activePlayer === playerId
      ) {
        if (dryRun) {
          return true
        }

        s.turnState = {
          type: 'OverseersChooseBlastsState',
        }

        return true
      }

      return false
    },
  },
  {
    commandType: 'BrotherhoodOfPeace',
    activate(s, playerId, dryRun) {
      if (
        s.turnState.type === 'DiscardTurnState' &&
        s.activePlayer === playerId
      ) {
        if (dryRun) {
          return true
        }

        s.turnState = {
          type: 'BrotherhoodChooseShipToTransferFromState',
        }

        return true
      }

      return false
    },
  },
  {
    commandType: 'TriBot',
    activate(s, playerId, dryRun) {
      if (
        s.turnState.type === 'ReinforceTurnState' &&
        s.activePlayer === playerId
      ) {
        if (dryRun) {
          return true
        }

        // TODO

        return true
      }

      return false
    },
  },
  {
    commandType: 'Freep',
    activate(s, playerId, dryRun) {
      if (
        s.turnState.type === 'ManeuverTurnState' &&
        s.activePlayer === playerId
      ) {
        if (dryRun) {
          return true
        }

        s.turnState = {
          type: 'FreepChoosePlayerToStealCardsState',
          originalState: s.turnState,
        }

        return true
      }

      return false
    },
  },
  {
    commandType: 'AlphaMazons',
    activate(s, playerId, dryRun) {
      if (
        s.turnState.type === 'AttackTurnState' &&
        s.directHitStateMachine?.type === 'BlastPlayedDirectHitState' &&
        s.activePlayer === playerId
      ) {
        if (dryRun) {
          return true
        }
        s.directHitStateMachine = {
          type: 'DirectHitPlayedDirectHitState',
          firingShip: s.directHitStateMachine.firingShip,
          targetShip: s.directHitStateMachine.targetShip,
          canBlastAgain: false,
        }
        return true
      }
      return false
    },
  },
]

export function executeAbility(state: GameState, playerId: PlayerId): void {
  const playerState = state.getPlayerState(playerId)
  const ability = ABILITIES.find(
    (a) => a.commandType === playerState.commandShip.shipType.commandType
  )

  if (ability === undefined) {
    warn(
      `Don't know how to activate ${playerState.commandShip.shipType.commandType}'s ability in state ${state.turnState.type}.`
    )
    return
  }

  ability.activate(state, playerId, false)
}

export function canExecuteAbility(
  state: GameState,
  playerId: PlayerId
): boolean {
  const playerState = state.getPlayerState(playerId)
  const ability = ABILITIES.find(
    (a) => a.commandType === playerState.commandShip.shipType.commandType
  )

  if (ability === undefined) {
    return false
  }

  return ability.activate(state, playerId, true)
}
