import * as _ from 'lodash'
import {
  GameState,
  DRAW_UP_TO_HAND_SIZE,
  MAX_ZONE_SHIPS,
  CommandShip,
  Ship,
} from './types'

import {
  Action,
  ChooseShipAction,
  ChooseZoneAction,
  PassAction,
  SelectCardAction,
} from './shared-types'
import { assert } from './utils'
import {
  canFire,
  discardActivePlayerCards,
  drawActivePlayerCards,
  drawShipCard,
  locationToString,
  sufficientForReinforcement,
} from './logic'

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
      discardActivePlayerCards(state, discardIndices)

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
        type:
          activePlayerState.ships.length == MAX_ZONE_SHIPS * 4
            ? 'ManeuverTurnState'
            : 'ReinforceTurnState',
      }
      break

    case 'ReinforceTurnState':
      assert(
        Array.isArray(action.handIndex),
        'handIndex should be an array for reinforcing.'
      )
      const reinforceIndices = action.handIndex

      if (
        sufficientForReinforcement(
          reinforceIndices.map((i) => activePlayerState.hand[i])
        )
      ) {
        discardActivePlayerCards(state, reinforceIndices)

        state.eventLog.push(
          `${state.activePlayer} uses ${reinforceIndices.length} cards to draw reinforcements.`
        )

        const newShip = drawShipCard(state)

        state.turnState = {
          type: 'ReinforcePlaceShipState',
          newShip,
        }
      } else {
        // TODO
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

      if (card.isBlast) {
        state.actionDiscardDeck.push(activePlayerState.hand[action.handIndex])
        activePlayerState.hand.splice(action.handIndex, 1)
        state.turnState = {
          type: 'PlayBlastChooseFiringShipState',
          blast: card,
        }
      } else {
        // TODO
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
      {
        assert(
          Array.isArray(action.choice),
          'choice should be an array for choosing firing ship.'
        )

        if (action.choice[0] !== state.activePlayer) {
          console.warn(
            `Player ${state.activePlayer} chose a firing ship that belongs to ${action.choice[0]}.`
          )
          break
        }

        if (
          action.choice[1] < 0 ||
          action.choice[1] >= activePlayerState.ships.length
        ) {
          console.warn(
            `Player ${state.activePlayer} chose invalid ship index ${action.choice[1]}.`
          )
          break
        }

        const designatedShip = activePlayerState.ships[action.choice[1]]

        if (!canFire(designatedShip.shipType, state.turnState.blast.cardType)) {
          console.warn(
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
        const targetPlayerState = state.playerState.get(action.choice[0])
        if (targetPlayerState === undefined) {
          console.warn(
            `Player ${state.activePlayer} chose a target player that doesn't exist.`
          )
          break
        }

        let designatedShip: Ship | CommandShip

        if (Array.isArray(action.choice)) {
          if (
            action.choice[1] < 0 ||
            action.choice[1] >= activePlayerState.ships.length
          ) {
            console.warn(
              `Player ${state.activePlayer} chose invalid ship index ${action.choice[1]}.`
            )
            break
          }

          designatedShip = targetPlayerState.ships[action.choice[1]]
        } else {
          designatedShip = targetPlayerState.commandShip
        }

        state.turnState = {
          type: 'PlayBlastRespondState',
          blast: state.turnState.blast,
          firingShip: state.turnState.firingShip,
          targetShip: designatedShip,
        }
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
      const targetPlayerEntry = Array.from(state.playerState.entries()).find(
        ([_, p]) =>
          targetShip.type === 'Ship'
            ? p.ships.includes(targetShip)
            : p.commandShip === targetShip
      )
      assert(
        targetPlayerEntry !== undefined,
        'Target ship must belong to a player.'
      )
      const [targetPlayer, targetPlayerState] = targetPlayerEntry

      state.eventLog.push(
        `${state.activePlayer}'s ${state.turnState.firingShip.shipType.name} fired a ${state.turnState.blast.name} at ${targetPlayer}'s ${targetShip.shipType.name}, dealing ${state.turnState.blast.damage} damage.`
      )

      if (targetShip.damage >= targetShip.shipType.hp) {
        state.eventLog.push(
          `${targetPlayer}'s ${targetShip.shipType.name} is destroyed!`
        )

        if (targetShip.type === 'Ship') {
          _.remove(targetPlayerState.ships, (ship) => ship === targetShip)
        } else {
          state.eventLog.push(`${targetPlayer} is eliminated.`)
          targetPlayerState.alive = false
        }
      }

      state.turnState = {
        type: 'AttackTurnState',
      }
      break

    case 'ReinforceTurnState':
      state.turnState = {
        type: 'ManeuverTurnState',
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

      activePlayerState.ships.forEach((s) => {
        s.hasFiredThisTurn = false
      })

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

function applyChooseZoneAction(
  state: GameState,
  action: ChooseZoneAction
): void {
  const activePlayerState = state.playerState.get(state.activePlayer)
  assert(
    activePlayerState !== undefined,
    `Player ID ${state.activePlayer} not found.`
  )

  switch (state.turnState.type) {
    case 'ReinforcePlaceShipState':
      activePlayerState.ships.push({
        type: 'Ship',
        location: action.location,
        shipType: state.turnState.newShip,
        damage: 0,
        hasFiredThisTurn: false,
      })

      state.eventLog.push(
        `${state.activePlayer} places a new ${
          state.turnState.newShip.name
        } into their ${locationToString(action.location)} zone.`
      )

      state.turnState = {
        type:
          activePlayerState.ships.length == MAX_ZONE_SHIPS * 4
            ? 'ManeuverTurnState'
            : 'ReinforceTurnState',
      }
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

    case 'ChooseZoneAction':
      applyChooseZoneAction(state, action)
      break

    default:
      const cantGetHere: never = action
  }
}
