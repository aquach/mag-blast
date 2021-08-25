import * as _ from 'lodash'
import { MAX_ZONE_SHIPS } from '../constants'
import { bold, event, p } from '../events'
import {
  alivePlayerByTurnOffset,
  locationToString,
  resolveBlastAttack,
  resolveSquadronAttack,
} from '../logic'
import { ActionError, LOCATIONS, PassAction, PlayerId } from '../shared-types'
import { GameState } from '../types'
import { warn } from '../utils'

export function applyPassAction(
  state: GameState,
  playerId: PlayerId,
  action: PassAction
): ActionError | undefined {
  const activePlayerState = state.getPlayerState(state.activePlayer)

  switch (state.turnState.type) {
    case 'PlayBlastRespondState':
      if (
        !resolveBlastAttack(
          state,
          state.turnState.firingShip,
          state.turnState.targetShip,
          state.turnState.blast
        )
      ) {
        state.turnState = {
          type: 'AttackTurnState',
        }
      }
      break

    case 'PlaySquadronRespondState':
      if (
        !resolveSquadronAttack(
          state,
          state.turnState.targetShip,
          state.turnState.squadron
        )
      ) {
        state.turnState = {
          type: 'AttackTurnState',
        }
      }
      break

    case 'PlayActionRespondState':
      _.remove(state.turnState.respondingPlayers, (p) => p === playerId)

      if (state.turnState.respondingPlayers.length === 0) {
        // All players passed, which means that the playing card holds and should be resolved.
        if (!state.turnState.resolveAction()) {
          state.turnState = {
            type: 'AttackTurnState',
          }
        }
      }
      break

    case 'ReinforceTurnState':
      if (state.activePlayer !== playerId) {
        warn('A player acted that was not the active player.')
        break
      }
      state.turnState = {
        type: 'ManeuverTurnState',
        originalLocations: new Map(),
      }
      break

    case 'ManeuverTurnState':
      if (state.activePlayer !== playerId) {
        warn('A player acted that was not the active player.')
        break
      }
      {
        const shipsByLocation = _.groupBy(
          activePlayerState.ships,
          (s) => s.location
        )

        const zoneWithTooManyShips = LOCATIONS.find(
          (l) => (shipsByLocation[l] ?? []).length > MAX_ZONE_SHIPS
        )
        if (zoneWithTooManyShips !== undefined) {
          return {
            type: 'ActionError',
            message: `Too many ships in the ${locationToString(
              zoneWithTooManyShips
            )} zone (max ${MAX_ZONE_SHIPS}).`,
            time: new Date().getTime(),
          }
        } else {
          state.turnState = {
            type: 'AttackTurnState',
          }
        }
      }
      break

    case 'AttackTurnState':
      if (state.activePlayer !== playerId) {
        warn('A player acted that was not the active player.')
        break
      }

      // End of turn effects wear off.
      for (const [pid, ps] of state.playerState.entries()) {
        for (const s of ps.ships) {
          if (s.temporaryDamage > 0) {
            state.pushEventLog(
              event`${p(pid)}'s ${s.shipType.name}'s ${
                s.temporaryDamage
              } points of squadron damage wears off.`
            )
            s.temporaryDamage = 0
          }
        }

        if (ps.commandShip.temporaryDamage > 0) {
          state.pushEventLog(
            event`${p(pid)}'s ${ps.commandShip.shipType.name}'s ${
              ps.commandShip.temporaryDamage
            } points of squadron damage wears off.`
          )
          ps.commandShip.temporaryDamage = 0
        }

        ps.usedSquadronCards.forEach((c) => {
          state.pushEventLog(
            event`${p(pid)}'s deployed ${c.name} returns to their hand.`
          )
          ps.hand.push(c)
        })
        ps.usedSquadronCards = []
      }

      activePlayerState.ships.forEach((s) => {
        s.hasFiredThisTurn = false
      })

      // Go to next person's turn.
      const [nextPlayerIndex, nextPlayer] = alivePlayerByTurnOffset(
        state,
        state.activePlayer,
        1
      )

      if (nextPlayerIndex === 0) {
        state.turnNumber++
        state.pushEventLog(event`${bold(`=== Turn ${state.turnNumber} ===`)}`)
      }

      state.turnState = {
        type:
          state.turnNumber === 1 ? 'ReinforceTurnState' : 'DiscardTurnState',
        skipDraw: false,
      }

      state.activePlayer = nextPlayer
      state.directHitStateMachine = undefined

      state.pushEventLog(event`It is now ${p(state.activePlayer)}'s turn.`)

      // Beginning of turn effects.
      for (const [pid, ps] of state.playerState.entries()) {
        if (ps.asteroidsUntilBeginningOfPlayerTurn === state.activePlayer) {
          ps.asteroidsUntilBeginningOfPlayerTurn = undefined
          state.pushEventLog(event`${p(pid)}'s ${'Asteroids'} wears off.`)
        }
        if (ps.minefieldUntilBeginningOfPlayerTurn === state.activePlayer) {
          ps.minefieldUntilBeginningOfPlayerTurn = undefined
          state.pushEventLog(event`${p(pid)}'s ${'Minefield'} wears off.`)
        }
      }

      break

    default:
      console.warn(
        `Encountered unhandled turn state ${state.turnState.type} for action ${action.type}.`
      )
      return
  }
}
