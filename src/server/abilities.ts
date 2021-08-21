import * as _ from 'lodash'
import { warn } from 'console'
import { owningPlayer, resources } from './logic'
import { CommandShipType, PlayerId } from './shared-types'
import { GameState } from './types'

interface ActivatedCommandShipAbility {
  commandType: CommandShipType
  activate: (_: GameState, playerId: PlayerId, dryRun: boolean) => boolean
}

const ABILITIES: ActivatedCommandShipAbility[] = [
  {
    commandType: 'CraniumConsortium',
    activate(s, playerId) {
      return (
        s.turnState.type === 'PlayBlastRespondState' &&
        owningPlayer(s.playerState, s.turnState.targetShip)[0] === playerId &&
        _.sum(Object.values(resources(s.getPlayerState(playerId).hand))) >= 2
      )
    },
  },
  {
    commandType: 'OverseersOfKalgon',
    activate(s, playerId) {
      return (
        s.turnState.type === 'DiscardTurnState' && s.activePlayer === playerId
      )
    },
  },
  {
    commandType: 'BrotherhoodOfPeace',
    activate(s, playerId) {
      return (
        s.turnState.type === 'DiscardTurnState' && s.activePlayer === playerId
      )
    },
  },
  {
    commandType: 'TriBot',
    activate(s, playerId) {
      return (
        s.turnState.type === 'ReinforceTurnState' && s.activePlayer === playerId
      )
    },
  },
  {
    commandType: 'Freep',
    activate(s, playerId) {
      return (
        s.turnState.type === 'ManeuverTurnState' && s.activePlayer === playerId
      )
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

  ability.activate(state, playerId, true)
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

  return ability.activate(state, playerId, false)
}
