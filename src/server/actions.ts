import * as _ from 'lodash'
import {GameState} from './types'

import {
  Action,
} from './shared-types'

export function applyAction(state: GameState, action: Action): void {
  const activePlayerState = state.playerState.get(state.activePlayer)

  if (activePlayerState === undefined) {
    throw new Error(`Player ID ${state.activePlayer} not found.`)
  }

  switch (action.type) {
    case 'DrawAction': {
      const card = state.actionDeck.shift()!
      activePlayerState?.hand.push(card)
      state.eventLog.push(`${state.activePlayer} draws a card.`)
      state.activePlayer = state.activePlayer === '#1' ? '#2' : '#1'

      break
    }

    case 'PlayCardAction': {
      const card = activePlayerState.hand[action.handIndex]

      if (!card) {
        break
      }

      switch (card.type) {
        case 'BlastCard':
          activePlayerState.hand.splice(action.handIndex, 1)
          state.turnState = {
            type: 'PlayBlastChooseFiringShipState',
            blast: card,
          }
      }
      break
    }

    case 'ChooseShipAction':
      switch (state.turnState.type) {
        case 'PlayBlastChooseFiringShipState':
          // TODO: validate choice
          state.turnState = {
            type: 'PlayBlastChooseTargetShipState',
            blast: state.turnState.blast,
            firingShip: state.playerState.get(action.choice[0])!.ships[
              action.choice[1]
            ],
          }
          break

        case 'PlayBlastChooseTargetShipState':
          // TODO: validate choice
          state.turnState = {
            type: 'PlayBlastRespondState',
            blast: state.turnState.blast,
            firingShip: state.turnState.firingShip,
            targetShip: state.playerState.get(action.choice[0])!.ships[
              action.choice[1]
            ],
          }
          break

        default:
          throw new Error('Should never get here!')
      }
      break

    case 'PassAction':
      switch (state.turnState.type) {
        case 'PlayBlastRespondState':
          // Resolve attack here.
          const targetShip = state.turnState.targetShip
          targetShip.damage += state.turnState.blast.damage
          const targetPlayer = Array.from(state.playerState.entries()).find(
            ([_, p]) => p.ships.some((s) => s === targetShip)
          )?.[0]
          if (targetPlayer === undefined) {
            throw new Error('Should never get here!')
          }

          state.eventLog.push(
            `${state.activePlayer}'s ${state.turnState.firingShip.shipType.name} fired a ${state.turnState.blast.name} at ${targetPlayer}'s ${targetShip.shipType.name}, dealing ${state.turnState.blast.damage} damage.`
          )

          if (targetShip.damage >= targetShip.shipType.hp) {
            state.playerState.forEach((player) => {
              _.remove(player.ships, (ship) => ship === targetShip)
            })
            state.eventLog.push(
              `${targetPlayer}'s ${targetShip.shipType.name} was destroyed!`
            )
          }

          state.turnState = {
            type: 'AttackTurnState',
          }
          break

        case 'AttackTurnState':
          // TODO: go to next person's turn
          break

        default:
          throw new Error('Should never get here!')
      }
      break

    default:
      const cantGetHere: never = action
      throw new Error('Should never get here!')
  }
}
