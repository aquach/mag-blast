import * as _ from 'lodash'
import { GameState, DRAW_UP_TO_HAND_SIZE } from './types'

import {
  Action,
  ChooseShipAction,
  PassAction,
  SelectCardAction,
} from './shared-types'
import { assert } from './utils'
import { drawActivePlayerCards } from './logic'

function applySelectCardAction(
  state: GameState,
  action: SelectCardAction
): void {
  const activePlayerState = state.playerState.get(state.activePlayer)
  assert(
    activePlayerState !== undefined,
    `Player ID ${state.activePlayer} not found.`
  )

  switch (state.turnState.type) {
    case 'DiscardTurnState':
      // Discard, then draw.
      assert(
        Array.isArray(action.handIndex),
        'handIndex should be an array for discarding.'
      )
      const discardIndices = action.handIndex
      activePlayerState.hand = activePlayerState.hand.filter(
        (c, i) => !discardIndices.includes(i)
      )
      state.eventLog.push(
        `${state.activePlayer} discards ${discardIndices.length} cards.`
      )

      if (activePlayerState.hand.length < DRAW_UP_TO_HAND_SIZE) {
        drawActivePlayerCards(
          state,
          DRAW_UP_TO_HAND_SIZE - activePlayerState.hand.length
        )
      }

      state.turnState = {
        type: 'ReinforceTurnState',
      }
      break

    case 'AttackTurnState':
      assert(
        typeof action.handIndex === 'number',
        'handIndex should be a single number for playing cards.'
      )
      const card = activePlayerState.hand[action.handIndex]

      if (!card) {
        console.warn(
          `Attempted to play a non-existent card ${action.handIndex}.`
        )
        return
      }

      switch (card.type) {
        case 'BlastCard':
          state.actionDiscardDeck.push(activePlayerState.hand[action.handIndex])
          activePlayerState.hand.splice(action.handIndex, 1)
          state.turnState = {
            type: 'PlayBlastChooseFiringShipState',
            blast: card,
          }
      }
      break

    default:
      assert(false, `Encountered unhandled turn state ${state.turnState.type}`)
  }
}

function applyChooseShipAction(
  state: GameState,
  action: ChooseShipAction
): void {
  const activePlayerState = state.playerState.get(state.activePlayer)
  assert(
    activePlayerState !== undefined,
    `Player ID ${state.activePlayer} not found.`
  )

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
      assert(false, `Encountered unhandled turn state ${state.turnState.type}`)
  }
}

function applyPassAction(state: GameState, action: PassAction): void {
  const activePlayerState = state.playerState.get(state.activePlayer)
  assert(
    activePlayerState !== undefined,
    `Player ID ${state.activePlayer} not found.`
  )

  switch (state.turnState.type) {
    case 'PlayBlastRespondState':
      // Resolve attack.
      const targetShip = state.turnState.targetShip
      targetShip.damage += state.turnState.blast.damage
      const targetPlayer = Array.from(state.playerState.entries()).find(
        ([_, p]) => p.ships.includes(targetShip)
      )?.[0]
      assert(targetPlayer !== undefined, 'Target ship must belong to a player.')

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
      // Go to next person's turn.
      const currentPlayerIndex = state.playerTurnOrder.indexOf(
        state.activePlayer
      )

      assert(
        currentPlayerIndex !== -1,
        "Couldn't find active player in player turn order"
      )

      const nextPlayerIndex =
        (currentPlayerIndex + 1) % state.playerTurnOrder.length

      state.turnState = {
        type:
          state.turnNumber === 1 ? 'ReinforceTurnState' : 'DiscardTurnState',
      }

      if (nextPlayerIndex === 0) {
        state.turnNumber++
        state.eventLog.push(`It is now turn ${state.turnNumber}.`)
      }

      state.activePlayer = state.playerTurnOrder[nextPlayerIndex]
      state.eventLog.push(`It is now ${state.activePlayer}'s turn.`)

      break

    default:
      assert(false, `Encountered unhandled turn state ${state.turnState.type}`)
  }
}

export function applyAction(state: GameState, action: Action): void {
  switch (action.type) {
    case 'SelectCardAction':
      applySelectCardAction(state, action)
      break

    case 'ChooseShipAction':
      applyChooseShipAction(state, action)
      break

    case 'PassAction':
      applyPassAction(state, action)
      break

    default:
      const cantGetHere: never = action
  }
}
