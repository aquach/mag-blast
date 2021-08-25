import * as _ from 'lodash'
import {event, p} from '../events'
import {
    activableMinesweepers,
    blastableCommandShipPlayers,
    blastableShipIndices,
    canRespondToBlast,
    canRespondToSquadron,
    destroyShip,
    isDead,
    minesweeperTargets,
    moveableShips,
    playersThatCanRespondToActions,
    resolveBlastAttack,
    resolveSquadronAttack,
    shipCanFire,
    squadronableCommandShipPlayers,
    squadronableShipIndices,
    squadronDamage,
    stealThreeCardsAndGiveToActivePlayer
} from '../logic'
import {ActionError, ChooseShipAction, PlayerId} from '../shared-types'
import {CommandShip, GameState, Ship} from '../types'
import {stringList, warn} from '../utils'

export function applyChooseShipAction(
  state: GameState,
  playerId: PlayerId,
  action: ChooseShipAction
): ActionError | undefined {
  if (state.activePlayer !== playerId) {
    warn('A player acted that was not the active player.')
    return
  }
  const activePlayerState = state.getPlayerState(state.activePlayer)

  switch (state.turnState.type) {
    case 'ManeuverTurnState': {
      if (!Array.isArray(action.choice)) {
        warn('choice should be an array for choosing ship to move.')
        break
      }

      if (
        !moveableShips(playerId, activePlayerState).some((shipIndex) =>
          _.isEqual(shipIndex, action.choice)
        )
      ) {
        warn(`Player ${state.activePlayer} can't move the chosen ship.`)
      }

      const designatedShip = activePlayerState.ships[action.choice[1]]

      if (!state.turnState.originalLocations.has(designatedShip)) {
        state.turnState.originalLocations.set(
          designatedShip,
          designatedShip.location
        )
      }

      state.turnState = {
        type: 'ManeuverChooseTargetZoneState',
        originalLocations: state.turnState.originalLocations,
        ship: designatedShip,
      }

      break
    }

    case 'AttackChooseMinesweeperState': {
      if (!Array.isArray(action.choice)) {
        warn('choice should be an array for choosing ship to move.')
        break
      }

      if (action.choice[0] !== state.activePlayer) {
        warn(`Player ${state.activePlayer} doesn't own the selected ship.`)
        break
      }

      const designatedShip = activePlayerState.ships[action.choice[1]]

      if (!activableMinesweepers(activePlayerState).includes(designatedShip)) {
        warn(`Player ${state.activePlayer} can't activate the chosen ship.`)
        break
      }

      state.turnState = {
        type: 'AttackChoosePlayerToMinesweepState',
        minesweeper: designatedShip,
      }

      break
    }

    case 'AttackChoosePlayerToMinesweepState':
      {
        if (typeof action.choice !== 'string') {
          warn('choice should be an index for deciding Asteroids.')
          break
        }

        const targetPlayer = action.choice
        if (!minesweeperTargets(state, playerId).includes(targetPlayer)) {
          warn(`${targetPlayer} is not eligible for minesweeping.`)
          break
        }
        const targetPlayerState = state.getPlayerState(action.choice)

        const minesweeper = state.turnState.minesweeper

        if (minesweeper.hasFiredThisTurn) {
          warn(
            `Minesweeper ${minesweeper.shipType.name} has already fired this turn.`
          )
          break
        }

        const resolveActivation = () => {
          state.pushEventLog(
            event`${state.activePlayer} activates their Minesweeper ${
              minesweeper.shipType.name
            } on ${
              targetPlayer === state.activePlayer
                ? 'themselves'
                : p(targetPlayer)
            }!`
          )

          minesweeper.hasFiredThisTurn = true
        }

        const resolveAsteroids = () => {
          resolveActivation()
          targetPlayerState.asteroidsUntilBeginningOfPlayerTurn = undefined
          state.pushEventLog(
            event`${targetPlayer}'s ${'Asteroids'} are destroyed!`
          )

          state.turnState = { type: 'AttackTurnState' }
        }

        const resolveMinefield = () => {
          resolveActivation()
          targetPlayerState.minefieldUntilBeginningOfPlayerTurn = undefined
          state.pushEventLog(
            event`${targetPlayer}'s ${'Minefield'} is destroyed!`
          )

          state.turnState = { type: 'AttackTurnState' }
        }

        if (
          targetPlayerState.asteroidsUntilBeginningOfPlayerTurn !== undefined &&
          targetPlayerState.minefieldUntilBeginningOfPlayerTurn !== undefined
        ) {
          state.turnState = {
            type: 'AttackChooseAsteroidOrMinefieldToSweepState',
            resolveAsteroids,
            resolveMinefield,
          }
        } else if (
          targetPlayerState.asteroidsUntilBeginningOfPlayerTurn !== undefined
        ) {
          resolveAsteroids()
        } else if (
          targetPlayerState.minefieldUntilBeginningOfPlayerTurn !== undefined
        ) {
          resolveMinefield()
        } else {
          warn(`${targetPlayer} has neither Asteroids nor Minefields.`)
          break
        }
      }
      break

    case 'FreepChoosePlayerToStealCardsState':
      {
        if (typeof action.choice !== 'string') {
          warn('choice should be an index for deciding who to steal from.')
          break
        }

        stealThreeCardsAndGiveToActivePlayer(state, action.choice)
        state.turnState = state.turnState.originalState
      }
      break

    case 'AttackChooseAsteroidsPlayerTurnState':
      {
        if (typeof action.choice !== 'string') {
          warn('choice should be an index for deciding Asteroids.')
          break
        }
        const targetPlayer = action.choice
        const targetPlayerState = state.getPlayerState(action.choice)

        state.pushEventLog(
          event`${p(state.activePlayer)} plays ${'Asteroids'} on ${
            targetPlayer === state.activePlayer ? 'themselves' : p(targetPlayer)
          }.`
        )

        const respondablePlayers = playersThatCanRespondToActions(
          state,
          state.activePlayer
        )

        const resolveAction = () => {
          targetPlayerState.asteroidsUntilBeginningOfPlayerTurn =
            state.activePlayer
        }

        if (respondablePlayers.length > 0) {
          state.turnState = {
            type: 'PlayActionRespondState',
            playingPlayer: state.activePlayer,
            respondingPlayers: respondablePlayers,
            resolveAction(): boolean {
              resolveAction()
              return false
            },
            counterAction(): boolean {
              return false
            },
          }
        } else {
          resolveAction()
          state.turnState = { type: 'AttackTurnState' }
        }
      }
      break

    case 'AttackChooseMinefieldPlayerTurnState':
      {
        if (typeof action.choice !== 'string') {
          warn('choice should be an index for deciding Minefield.')
          break
        }
        const targetPlayer = action.choice
        const targetPlayerState = state.getPlayerState(action.choice)

        state.pushEventLog(
          event`${p(state.activePlayer)} plays a ${'Minefield'} on ${
            targetPlayer === state.activePlayer ? 'themselves' : p(targetPlayer)
          }.`
        )

        const respondablePlayers = playersThatCanRespondToActions(
          state,
          state.activePlayer
        )

        const resolveAction = () => {
          targetPlayerState.minefieldUntilBeginningOfPlayerTurn =
            state.activePlayer
        }

        if (respondablePlayers.length > 0) {
          state.turnState = {
            type: 'PlayActionRespondState',
            playingPlayer: state.activePlayer,
            respondingPlayers: respondablePlayers,
            resolveAction(): boolean {
              resolveAction()
              return false
            },
            counterAction(): boolean {
              return false
            },
          }
        } else {
          resolveAction()
          state.turnState = { type: 'AttackTurnState' }
        }
      }
      break

    case 'AttackChooseSpacedockShipState':
      {
        if (!Array.isArray(action.choice)) {
          warn('choice should be an index for deciding Spacedock.')
          break
        }
        const targetPlayer = action.choice[0]
        const targetShip =
          state.getPlayerState(targetPlayer).ships[action.choice[1]]

        if (targetShip.damage <= 0) {
          console.warn("Can't Spacedock an undamaged ship.")
          break
        }

        state.pushEventLog(
          event`${p(state.activePlayer)} plays ${'Spacedock'} on ${
            targetShip.shipType.name
          }.`
        )

        const respondablePlayers = playersThatCanRespondToActions(
          state,
          state.activePlayer
        )

        const resolveAction = () => {
          const healedDamage = _.max(targetShip.blastDamageHistory) ?? 0
          const damageList = stringList(targetShip.blastDamageHistory)
          targetShip.blastDamageHistory.splice(
            targetShip.blastDamageHistory.indexOf(healedDamage),
            1
          )
          targetShip.damage -= healedDamage
          state.pushEventLog(
            event`${targetShip.shipType.name} has been hit for ${damageList} damage, and so repairs ${healedDamage} damage (the largest single blast).`
          )
        }

        if (respondablePlayers.length > 0) {
          state.turnState = {
            type: 'PlayActionRespondState',
            playingPlayer: state.activePlayer,
            respondingPlayers: respondablePlayers,
            resolveAction(): boolean {
              resolveAction()
              return false
            },
            counterAction(): boolean {
              return false
            },
          }
        } else {
          resolveAction()
          state.turnState = { type: 'AttackTurnState' }
        }
      }
      break

    case 'PlayBlastChooseFiringShipState':
      {
        if (!Array.isArray(action.choice)) {
          warn('choice should be an array for choosing firing ship.')
          break
        }

        if (action.choice[0] !== state.activePlayer) {
          warn(
            `Player ${state.activePlayer} chose a firing ship that belongs to ${action.choice[0]}.`
          )
          break
        }

        if (
          action.choice[1] < 0 ||
          action.choice[1] >= activePlayerState.ships.length
        ) {
          warn(
            `Player ${state.activePlayer} chose invalid ship index ${action.choice[1]}.`
          )
          break
        }

        const designatedShip = activePlayerState.ships[action.choice[1]]

        if (
          state.turnState.blast.cardType !== 'RammingSpeedCard' &&
          !shipCanFire(designatedShip, state.turnState.blast)
        ) {
          warn(
            `Player ${state.activePlayer}'s chosen ship ${designatedShip.shipType.name} can't fire the selected blast ${state.turnState.blast.name}.`
          )
          break
        }

        state.turnState = {
          type: 'PlayBlastChooseTargetShipState',
          blast: state.turnState.blast,
          firingShip: activePlayerState.ships[action.choice[1]],
        }
      }
      break

    case 'PlayBlastChooseTargetShipState':
      {
        const targetPlayerId = Array.isArray(action.choice)
          ? action.choice[0]
          : action.choice
        const targetPlayerState = state.getPlayerState(targetPlayerId)

        let designatedShip: Ship | CommandShip

        if (Array.isArray(action.choice)) {
          if (
            !blastableShipIndices(state, state.turnState.firingShip).some(
              (tx) => _.isEqual(tx, action.choice)
            )
          ) {
            warn("Firing ship can't fire on target ship.")
            break
          }

          designatedShip = targetPlayerState.ships[action.choice[1]]
        } else {
          if (
            !blastableCommandShipPlayers(
              state,
              state.turnState.firingShip
            ).includes(action.choice)
          ) {
            warn("Firing ship can't fire on target ship.")
            break
          }
          designatedShip = targetPlayerState.commandShip
        }

        if (state.turnState.blast.cardType === 'RammingSpeedCard') {
          state.pushEventLog(
            event`${p(state.activePlayer)}'s ${
              state.turnState.firingShip.shipType.name
            } rams into ${p(targetPlayerId)}'s ${
              designatedShip.shipType.name
            }, dealing ${state.turnState.firingShip.shipType.movement} damage.`
          )
        } else {
          state.pushEventLog(
            event`${p(state.activePlayer)}'s ${
              state.turnState.firingShip.shipType.name
            } fires a ${state.turnState.blast.name} at ${p(targetPlayerId)}'s ${
              designatedShip.shipType.name
            }, dealing ${state.turnState.blast.damage} damage.`
          )
        }

        const turnState = state.turnState

        turnState.firingShip.hasFiredThisTurn = true

        if (canRespondToBlast(state, targetPlayerId)) {
          state.turnState = {
            type: 'PlayBlastRespondState',
            blast: turnState.blast,
            firingShip: turnState.firingShip,
            targetShip: designatedShip,
            resolveBlast: () =>
              resolveBlastAttack(
                state,
                turnState.firingShip,
                designatedShip,
                turnState.blast
              ),
          }
        } else {
          if (
            !resolveBlastAttack(
              state,
              turnState.firingShip,
              designatedShip,
              turnState.blast
            )
          ) {
            state.turnState = {
              type: 'AttackTurnState',
            }
          }
        }
      }
      break

    case 'BrotherhoodChooseShipToTransferFromState':
      {
        if (!Array.isArray(action.choice)) {
          warn('choice should be an array for choosing firing ship.')
          break
        }

        if (action.choice[0] !== state.activePlayer) {
          warn(
            `Player ${state.activePlayer} chose a firing ship that belongs to ${action.choice[0]}.`
          )
          break
        }

        if (
          action.choice[1] < 0 ||
          action.choice[1] >= activePlayerState.ships.length
        ) {
          warn(
            `Player ${state.activePlayer} chose invalid ship index ${action.choice[1]}.`
          )
          break
        }

        const designatedShip = activePlayerState.ships[action.choice[1]]

        if (designatedShip.damage <= 0) {
          warn(`Player ${state.activePlayer} chose a ship with no damage.`)
          break
        }

        state.turnState = {
          type: 'BrotherhoodChooseShipToTransferToState',
          fromShip: designatedShip,
        }
      }
      break

    case 'BrotherhoodChooseShipToTransferToState':
      {
        if (!Array.isArray(action.choice)) {
          warn('choice should be an array for choosing firing ship.')
          break
        }

        const targetPlayerId = action.choice[0]
        const targetPlayerState = state.getPlayerState(targetPlayerId)

        const toShip = targetPlayerState.ships[action.choice[1]]

        if (toShip === undefined) {
          warn('Player chose an invalid ship.')
          break
        }

        const fromShip = state.turnState.fromShip
        const healedDamage = _.max(fromShip.blastDamageHistory) ?? 0

        state.pushEventLog(
          event`${p(
            state.activePlayer
          )} transfers ${healedDamage} damage from ${
            fromShip.shipType.name
          } to ${p(targetPlayerId)}'s ${toShip.shipType.name}.`
        )

        fromShip.blastDamageHistory.splice(
          fromShip.blastDamageHistory.indexOf(healedDamage),
          1
        )
        fromShip.damage -= healedDamage

        toShip.damage += healedDamage

        if (toShip.type === 'Ship') {
          toShip.blastDamageHistory.push(healedDamage)
        }

        if (isDead(state.gameSettings.gameFlavor, toShip)) {
          destroyShip(state, toShip) // Can't end the game; only fleet ships allowed.
        }

        state.turnState = {
          type: 'DiscardTurnState',
          skipDraw: false,
        }
      }
      break

    case 'PlaySquadronChooseTargetShipState':
      {
        const targetPlayerId = Array.isArray(action.choice)
          ? action.choice[0]
          : action.choice
        const targetPlayerState = state.getPlayerState(targetPlayerId)

        let designatedShip: Ship | CommandShip

        if (Array.isArray(action.choice)) {
          if (
            !squadronableShipIndices(
              state,
              playerId,
              state.turnState.squadron
            ).some((tx) => _.isEqual(tx, action.choice))
          ) {
            warn(
              `${state.activePlayer} can't play a squadron on the target ship.`
            )
            break
          }

          designatedShip = targetPlayerState.ships[action.choice[1]]
        } else {
          if (
            !squadronableCommandShipPlayers(
              state,
              playerId,
              state.turnState.squadron
            ).includes(action.choice)
          ) {
            warn(
              `${state.activePlayer} can't play a squadron on the target ship.`
            )
            break
          }
          designatedShip = targetPlayerState.commandShip
        }

        const squadron = state.turnState.squadron

        state.pushEventLog(
          event`${p(state.activePlayer)} deploys a ${
            squadron.name
          } targeting ${p(targetPlayerId)}'s ${
            designatedShip.shipType.name
          }, dealing ${squadronDamage(state, designatedShip, squadron)} damage.`
        )

        if (
          targetPlayerState.hand.some((c) =>
            canRespondToSquadron(targetPlayerState, c)
          )
        ) {
          state.turnState = {
            type: 'PlaySquadronRespondState',
            squadron,
            targetShip: designatedShip,
            resolveSquadron: () =>
              resolveSquadronAttack(state, designatedShip, squadron),
          }
        } else {
          if (
            !resolveSquadronAttack(
              state,
              designatedShip,
              state.turnState.squadron
            )
          ) {
            state.turnState = {
              type: 'AttackTurnState',
            }
          }
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
