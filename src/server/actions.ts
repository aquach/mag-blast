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
  CancelAction,
  ChooseShipAction,
  ChooseZoneAction,
  PassAction,
  ChooseCardAction,
} from './shared-types'
import { assert, partition } from './utils'
import {
  canFire,
  canRespondToAttack,
  discardActivePlayerCards,
  drawActivePlayerCards,
  drawShipCard,
  executeCardEffect,
  fullOnShips,
  locationToString,
  movableZones,
  owningPlayer,
  resolveBlastAttack,
  sufficientForReinforcement,
} from './logic'

const STARTING_HAND_SIZE = 5
const NUM_STARTING_SHIPS = 4

function applyChooseCardAction(
  state: GameState,
  playerId: string,
  action: ChooseCardAction
): void {
  if (state.turnState.type === 'ChooseStartingShipsState') {
    const dealtShipCards = state.turnState.dealtShipCards.get(playerId)
    assert(
      dealtShipCards !== undefined,
      `Ship cards for player ${playerId} not found.`
    )
    assert(
      Array.isArray(action.handIndex),
      'handIndex should be an array for choosing starting ships.'
    )

    if (state.turnState.chosenShipCards.has(playerId)) {
      console.warn(`Player ${playerId} has already chosen starting ships.`)
      return
    }

    const chosenCardIndices = action.handIndex

    if (chosenCardIndices.length !== NUM_STARTING_SHIPS) {
      return
    }

    const [chosenCards, notChosenCards] = partition(dealtShipCards, (v, i) =>
      chosenCardIndices.includes(i)
    )

    state.turnState.chosenShipCards.set(playerId, chosenCards)
    notChosenCards.forEach((c) => state.shipDiscardDeck.push(c))

    state.eventLog.push(`${playerId} chooses their ships.`)

    if (state.turnState.chosenShipCards.size === state.playerTurnOrder.length) {
      state.turnState = {
        type: 'PlaceStartingShipsState',
        chosenShipCards: state.turnState.chosenShipCards,
      }
    }

    return
  }

  if (state.turnState.type === 'PlayBlastRespondState') {
    const playerState = state.playerState.get(playerId)
    assert(playerState !== undefined, `Player ID ${playerId} not found.`)

    assert(
      typeof action.handIndex === 'number',
      'handIndex should be a single number for playing cards.'
    )
    const card = playerState.hand[action.handIndex]

    if (!card) {
      console.warn(`Attempted to play a non-existent card ${action.handIndex}.`)
      return
    }

    state.actionDiscardDeck.push(playerState.hand[action.handIndex])
    playerState.hand.splice(action.handIndex, 1)

    const firingShip = state.turnState.firingShip

    if (
      card.cardType === 'TemporalFluxCard' ||
      card.cardType === 'EvasiveActionCard'
    ) {
      // Cancel effects by transitioning back to AttackTurnState without doing anything.
      const [firingPlayer, firingPlayerState] = owningPlayer(
        state.playerState,
        firingShip
      )
      state.eventLog.push(
        `${firingPlayer} attempts to play a ${state.turnState.blast.name} targeting ${playerId}'s ${state.turnState.targetShip.shipType.name}, but ${playerId} responds with ${card.name}, canceling its effect!`
      )
      state.turnState = {
        type: 'AttackTurnState',
      }
      // TODO: if squadron and evasive action, return to hand.
    } else {
      console.warn(`Don't know what to do with card ${card.cardType}.`)
    }

    return
  }

  assert(
    state.activePlayer === playerId,
    'A player acted that was not the active player.'
  )

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

      if (fullOnShips(activePlayerState.ships)) {
        state.turnState = {
          type: 'ManeuverTurnState',
          originalLocations: new Map(),
        }
      } else {
        state.turnState = { type: 'ReinforceTurnState' }
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

      executeCardEffect(state, card)

      // Consume the card.
      state.actionDiscardDeck.push(activePlayerState.hand[action.handIndex])
      activePlayerState.hand.splice(action.handIndex, 1)

      if (!card.isDirectHit) {
        state.directHitStateMachine = undefined
      }
      break

    default:
      assert(false, `Encountered unhandled turn state ${state.turnState.type}`)
  }
}

function applyChooseShipAction(
  state: GameState,
  playerId: string,
  action: ChooseShipAction
): void {
  assert(
    state.activePlayer === playerId,
    'A player acted that was not the active player.'
  )
  const activePlayerState = state.playerState.get(state.activePlayer)
  assert(
    activePlayerState !== undefined,
    `Player ID ${state.activePlayer} not found.`
  )

  switch (state.turnState.type) {
    case 'ManeuverTurnState': {
      assert(
        Array.isArray(action.choice),
        'choice should be an array for choosing ship to move.'
      )

      if (action.choice[0] !== state.activePlayer) {
        console.warn(
          `Player ${state.activePlayer} chose a ship to move that belongs to ${action.choice[0]}.`
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

      if (designatedShip.shipType.movement === 0) {
        console.warn(
          `Player ${state.activePlayer} chose a ship that can't move.`
        )
        break
      }

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
        const targetPlayerState = state.playerState.get(
          Array.isArray(action.choice) ? action.choice[0] : action.choice
        )
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
            action.choice[1] >= targetPlayerState.ships.length
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

        if (designatedShip.type === 'Ship') {
          if (state.turnState.firingShip.location !== designatedShip.location) {
            console.warn("Ship can't fire on a ship in a different zone.")
            break
          }
        } else {
          const firingShip = state.turnState.firingShip
          if (
            targetPlayerState.ships.some(
              (s) => s.location === firingShip.location
            )
          ) {
            console.warn(
              "Ship can't fire on the command ship when there are ships in the way."
            )
            break
          }
        }

        state.turnState.firingShip.hasFiredThisTurn = true

        if (canRespondToAttack(targetPlayerState)) {
          state.turnState = {
            type: 'PlayBlastRespondState',
            blast: state.turnState.blast,
            firingShip: state.turnState.firingShip,
            targetShip: designatedShip,
          }
        } else {
          resolveBlastAttack(
            state,
            state.turnState.firingShip,
            designatedShip,
            state.turnState.blast
          )
          state.turnState = {
            type: 'AttackTurnState',
          }
        }
      }
      break

    default:
      assert(false, `Encountered unhandled turn state ${state.turnState.type}`)
  }
}

function applyPassAction(
  state: GameState,

  playerId: string,
  action: PassAction
): void {
  const activePlayerState = state.playerState.get(state.activePlayer)
  assert(
    activePlayerState !== undefined,
    `Player ID ${state.activePlayer} not found.`
  )

  switch (state.turnState.type) {
    case 'PlayBlastRespondState':
      resolveBlastAttack(
        state,
        state.turnState.firingShip,
        state.turnState.targetShip,
        state.turnState.blast
      )
      state.turnState = {
        type: 'AttackTurnState',
      }
      break

    case 'ReinforceTurnState':
      assert(
        state.activePlayer === playerId,
        'A player acted that was not the active player.'
      )
      state.turnState = {
        type: 'ManeuverTurnState',
        originalLocations: new Map(),
      }
      break

    case 'ManeuverTurnState':
      assert(
        state.activePlayer === playerId,
        'A player acted that was not the active player.'
      )
      {
        const shipsByLocation = _.groupBy(
          activePlayerState.ships,
          (s) => s.location
        )

        if (_.some(shipsByLocation, (zone) => zone.length > MAX_ZONE_SHIPS)) {
          // TODO: report error
        } else {
          state.turnState = {
            type: 'AttackTurnState',
          }
        }
      }
      break

    case 'AttackTurnState':
      assert(
        state.activePlayer === playerId,
        'A player acted that was not the active player.'
      )
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

      activePlayerState.ships.forEach((s) => {
        s.hasFiredThisTurn = false
      })

      if (nextPlayerIndex === 0) {
        state.turnNumber++
        state.eventLog.push(`=== Turn ${state.turnNumber} ===`)
      }

      state.turnState = {
        type:
          state.turnNumber === 1 ? 'ReinforceTurnState' : 'DiscardTurnState',
      }

      state.activePlayer = state.playerTurnOrder[nextPlayerIndex]
      state.directHitStateMachine = undefined
      state.eventLog.push(`It is now ${state.activePlayer}'s turn.`)

      break

    default:
      assert(false, `Encountered unhandled turn state ${state.turnState.type}`)
  }
}

function applyChooseZoneAction(
  state: GameState,
  playerId: string,
  action: ChooseZoneAction
): void {
  if (state.turnState.type === 'PlaceStartingShipsState') {
    const chosenShipCards = state.turnState.chosenShipCards.get(playerId)
    assert(
      chosenShipCards !== undefined,
      `Ship cards for player ${playerId} not found.`
    )
    const playerState = state.playerState.get(playerId)
    assert(playerState !== undefined, `Player ${playerId}'s state not found.`)

    if (chosenShipCards.length === 0) {
      console.warn(`Player ${playerId} has no more ships to place.`)
      return
    }

    const card = chosenShipCards.shift()!

    playerState.ships.push({
      type: 'Ship',
      location: action.location,
      shipType: card,
      damage: 0,
      hasFiredThisTurn: false,
    })

    state.eventLog.push(`${playerId} places a ship.`)

    if (
      Array.from(state.turnState.chosenShipCards.values()).every(
        (c) => c.length === 0
      )
    ) {
      const playerWithLowestHullStrength = _.minBy(state.playerTurnOrder, (p) =>
        _.sum(state.playerState.get(p)!.ships.map((s) => s.shipType.hp))
      )!
      const index = state.playerTurnOrder.indexOf(playerWithLowestHullStrength)

      state.playerTurnOrder = [
        ..._.drop(state.playerTurnOrder, index),
        ..._.take(state.playerTurnOrder, index),
      ]

      state.playerState.forEach((player) => {
        _.times(STARTING_HAND_SIZE, () =>
          player.hand.push(state.actionDeck.shift()!)
        )
      })

      state.eventLog.push(
        `All players have placed their ships and the game can now begin.`
      )
      state.eventLog.push(
        `${playerWithLowestHullStrength} has the lowest total hull strength and thus goes first.`
      )
      state.eventLog.push(`=== Turn 1 ===`)
      state.turnState = {
        type: 'ReinforceTurnState',
      }
      state.activePlayer = state.playerTurnOrder[0]
    }

    return
  }

  assert(
    state.activePlayer === playerId,
    'A player acted that was not the active player.'
  )
  const activePlayerState = state.playerState.get(state.activePlayer)
  assert(
    activePlayerState !== undefined,
    `Player ID ${state.activePlayer} not found.`
  )

  switch (state.turnState.type) {
    case 'ReinforcePlaceShipState':
    case 'AttackPlaceShipState':
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

      switch (state.turnState.type) {
        case 'ReinforcePlaceShipState':
          if (fullOnShips(activePlayerState.ships)) {
            state.turnState = {
              type: 'ManeuverTurnState',
              originalLocations: new Map(),
            }
          } else {
            state.turnState = { type: 'ReinforceTurnState' }
          }
          break

        case 'AttackPlaceShipState':
          state.turnState = { type: 'AttackTurnState' }
          break
      }
      break

    case 'AttackPlaceStolenShipState':
      state.turnState.stolenShip.location = action.location
      activePlayerState.ships.push(state.turnState.stolenShip)

      state.eventLog.push(
        `${state.activePlayer} places the stolen ${
          state.turnState.stolenShip.shipType.name
        } into their ${locationToString(action.location)} zone.`
      )
      state.turnState = { type: 'AttackTurnState' }
      break

    case 'ManeuverChooseTargetZoneState':
      const originalLocation = state.turnState.originalLocations.get(
        state.turnState.ship
      )
      assert(
        originalLocation !== undefined,
        `originalLocations must be populated.`
      )

      const zones = movableZones(
        originalLocation,
        state.turnState.ship.shipType.movement
      )
      if (!zones.includes(action.location)) {
        console.warn(
          `Player ${state.activePlayer} chose a zone that the ship can't move to.`
        )
        break
      }

      state.turnState.ship.location = action.location

      state.eventLog.push(
        `${state.activePlayer} moves their ${
          state.turnState.ship.shipType.name
        } to the ${locationToString(action.location)} Zone.`
      )

      state.turnState = {
        type: 'ManeuverTurnState',
        originalLocations: state.turnState.originalLocations,
      }
      break

    default:
      assert(false, `Encountered unhandled turn state ${state.turnState.type}`)
  }
}

function applyCancelAction(
  state: GameState,
  playerId: string,
  action: CancelAction
): void {
  assert(
    state.activePlayer === playerId,
    'A player acted that was not the active player.'
  )
  const activePlayerState = state.playerState.get(state.activePlayer)
  assert(
    activePlayerState !== undefined,
    `Player ID ${state.activePlayer} not found.`
  )

  switch (state.turnState.type) {
    case 'PlayBlastChooseFiringShipState':
    case 'PlayBlastChooseTargetShipState':
      activePlayerState.hand.push(state.turnState.blast)
      state.turnState = {
        type: 'AttackTurnState',
      }
      break
  }
}

export function applyAction(
  state: GameState,
  playerId: string,
  action: Action
): void {
  switch (action.type) {
    case 'ChooseCardAction':
      applyChooseCardAction(state, playerId, action)
      break

    case 'ChooseShipAction':
      applyChooseShipAction(state, playerId, action)
      break

    case 'PassAction':
      applyPassAction(state, playerId, action)
      break

    case 'ChooseZoneAction':
      applyChooseZoneAction(state, playerId, action)
      break

    case 'CancelAction':
      applyCancelAction(state, playerId, action)
      break

    default:
      const cantGetHere: never = action
  }
}
