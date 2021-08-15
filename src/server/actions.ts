import * as _ from 'lodash'
import { GameState, CommandShip, Ship } from './types'

import {
  Action,
  CancelAction,
  ChooseShipAction,
  ChooseZoneAction,
  PassAction,
  ChooseCardAction,
} from './shared-types'
import { assert, partition, warn } from './utils'
import {
  canPlayCard,
  canRespondToBlast,
  discardActivePlayerCards,
  drawActivePlayerCards,
  drawShipCard,
  executeCardEffect,
  fullOnShips,
  locationToString,
  movableZones,
  nonfullZones,
  owningPlayer,
  resolveBlastAttack,
  sufficientForReinforcement,
  shipCanFire,
  blastableCommandShipPlayers,
  blastableShipIndices,
  moveableShips,
  squadronableCommandShipPlayers,
  squadronableShipIndices,
  canRespondToSquadron,
  resolveSquadronAttack,
} from './logic'
import {
  NUM_STARTING_SHIPS,
  DRAW_UP_TO_HAND_SIZE,
  MAX_ZONE_SHIPS,
} from './constants'

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
    if (!Array.isArray(action.handIndex)) {
      warn('handIndex should be an array for choosing starting ships.')
      return
    }

    if (state.turnState.chosenShipCards.has(playerId)) {
      warn(`Player ${playerId} has already chosen starting ships.`)
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
    const playerState = state.getPlayerState(playerId)

    if (typeof action.handIndex !== 'number') {
      warn('handIndex should be a single number for playing cards.')
      return
    }
    const card = playerState.hand[action.handIndex]

    if (!card) {
      warn(`Attempted to play a non-existent card ${action.handIndex}.`)
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
    } else {
      warn(`Don't know what to do with card ${card.cardType}.`)
    }

    return
  }

  if (state.turnState.type === 'PlaySquadronRespondState') {
    const playerState = state.getPlayerState(playerId)

    assert(
      typeof action.handIndex === 'number',
      'handIndex should be a single number for playing cards.'
    )
    const respondingCard = playerState.hand[action.handIndex]

    if (!respondingCard) {
      warn(`Attempted to respond with a non-existent card ${action.handIndex}.`)
      return
    }

    if (
      respondingCard.cardType === 'TemporalFluxCard' ||
      respondingCard.cardType === 'EvasiveActionCard' ||
      respondingCard.cardType === 'FighterCard'
    ) {
      // Cancel effects by transitioning back to AttackTurnState without doing anything.
      const attackingPlayerState = state.getPlayerState(
        state.turnState.attackingPlayer
      )
      const attackingSquadronCard = state.turnState.squadron
      state.eventLog.push(
        `${state.turnState.attackingPlayer} attempts to play a ${attackingSquadronCard.name} targeting ${playerId}'s ${state.turnState.targetShip.shipType.name}, but ${playerId} responds with ${respondingCard.name}, canceling its effect!`
      )

      // By default, squadrons will go back to the attacking player's hand.
      // But Temporal Flux and Fighters will destroy the attacking squadron.

      if (
        respondingCard.cardType === 'TemporalFluxCard' ||
        respondingCard.cardType === 'FighterCard'
      ) {
        _.remove(
          attackingPlayerState.usedSquadronCards,
          (c) => c === attackingSquadronCard
        )
        state.actionDiscardDeck.push(attackingSquadronCard)
        state.eventLog.push(
          `${state.turnState.attackingPlayer}'s ${attackingSquadronCard.name} is discarded.`
        )
      }

      if (
        respondingCard.cardType === 'FighterCard' &&
        attackingSquadronCard.cardType === 'BomberCard'
      ) {
        // Responding to a Bomber with a Fighter lets you keep the Fighter.
        state.eventLog.push(
          `${playerId}'s ${respondingCard.name} returns to their hand.`
        )
      } else {
        // Otherwise, the responding card is consumed. Point it out explicitly if it's a Fighter.
        if (respondingCard.cardType === 'FighterCard') {
          state.eventLog.push(
            `${playerId}'s ${respondingCard.name} is discarded.`
          )
        }
        state.actionDiscardDeck.push(respondingCard)
        playerState.hand.splice(action.handIndex, 1)
      }

      state.turnState = {
        type: 'AttackTurnState',
      }
    } else {
      warn(`Don't know what to do with card ${respondingCard.cardType}.`)
    }

    return
  }

  if (state.activePlayer !== playerId) {
    warn('A player acted that was not the active player.')
    return
  }

  const activePlayerState = state.getPlayerState(state.activePlayer)

  switch (state.turnState.type) {
    case 'DiscardTurnState':
      // Discard, then draw.
      if (!Array.isArray(action.handIndex)) {
        warn('handIndex should be an array for discarding.')
        break
      }

      const discardIndices = action.handIndex
      discardActivePlayerCards(state, discardIndices)

      if (discardIndices.length > 0) {
        state.eventLog.push(
          `${state.activePlayer} discards ${discardIndices.length} cards.`
        )
      }

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
      if (!Array.isArray(action.handIndex)) {
        warn('handIndex should be an array for reinforcing.')
        break
      }
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
      if (typeof action.handIndex !== 'number') {
        warn('handIndex should be a single number for playing cards.')
        break
      }
      const card = activePlayerState.hand[action.handIndex]

      if (!card) {
        warn(`Attempted to play a non-existent card ${action.handIndex}.`)
        return
      }

      if (!canPlayCard(state, activePlayerState, card)) {
        warn(`${state.activePlayer} current can't play ${card.name}.`)
        return
      }

      executeCardEffect(state, card)

      // Consume the card.
      activePlayerState.hand.splice(action.handIndex, 1)

      if (card.isSquadron) {
        activePlayerState.usedSquadronCards.push(card)
      } else {
        state.actionDiscardDeck.push(card)
      }

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

    case 'AttackChooseAsteroidsPlayerTurnState':
      {
        if (typeof action.choice !== 'string') {
          warn('choice should be an index for deciding Asteroids.')
          break
        }
        const targetPlayer = action.choice
        const targetPlayerState = state.getPlayerState(action.choice)

        state.eventLog.push(
          `${state.activePlayer} plays Asteroids on ${
            targetPlayer === state.activePlayer ? 'themselves' : targetPlayer
          }.`
        )
        targetPlayerState.asteroidsUntilBeginningOfPlayerTurn =
          state.activePlayer
        state.turnState = { type: 'AttackTurnState' }
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

        state.eventLog.push(
          `${state.activePlayer} plays a Minefield on ${
            targetPlayer === state.activePlayer ? 'themselves' : targetPlayer
          }.`
        )
        targetPlayerState.minefieldUntilBeginningOfPlayerTurn =
          state.activePlayer
        state.turnState = { type: 'AttackTurnState' }
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

        if (!shipCanFire(designatedShip, state.turnState.blast)) {
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

        state.turnState.firingShip.hasFiredThisTurn = true

        if (targetPlayerState.hand.some(canRespondToBlast)) {
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

        if (
          targetPlayerState.hand.some((c) =>
            canRespondToSquadron(targetPlayerState, c)
          )
        ) {
          state.turnState = {
            type: 'PlaySquadronRespondState',
            squadron: state.turnState.squadron,
            attackingPlayer: state.activePlayer,
            targetShip: designatedShip,
          }
        } else {
          resolveSquadronAttack(
            state,
            state.activePlayer,
            designatedShip,
            state.turnState.squadron
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
  const activePlayerState = state.getPlayerState(state.activePlayer)

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

    case 'PlaySquadronRespondState':
      resolveSquadronAttack(
        state,
        state.turnState.attackingPlayer,
        state.turnState.targetShip,
        state.turnState.squadron
      )
      state.turnState = {
        type: 'AttackTurnState',
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
      if (state.activePlayer !== playerId) {
        warn('A player acted that was not the active player.')
        break
      }

      // End of turn effects wear off.

      for (const [pid, ps] of state.playerState.entries()) {
        for (const s of ps.ships) {
          if (s.temporaryDamage > 0) {
            state.eventLog.push(
              `${pid}'s ${s.shipType.name}'s ${s.temporaryDamage} points of squadron damage wears off.`
            )
            s.temporaryDamage = 0
          }
        }
      }

      activePlayerState.usedSquadronCards.forEach((c) => {
        state.eventLog.push(
          `${state.activePlayer}'s deployed ${c.name} makes it way home to ${state.activePlayer}'s hand.`
        )
        activePlayerState.hand.push(c)
      })
      activePlayerState.usedSquadronCards = []

      activePlayerState.ships.forEach((s) => {
        s.hasFiredThisTurn = false
      })

      // Go to next person's turn.
      const currentPlayerIndex = state.playerTurnOrder.indexOf(
        state.activePlayer
      )

      assert(
        currentPlayerIndex !== -1,
        "Couldn't find active player in player turn order."
      )

      const nextPlayerIndex =
        (currentPlayerIndex + 1) % state.playerTurnOrder.length

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

      // Beginning of turn effects.

      for (const [pid, ps] of state.playerState.entries()) {
        if (ps.asteroidsUntilBeginningOfPlayerTurn === state.activePlayer) {
          ps.asteroidsUntilBeginningOfPlayerTurn = undefined
          state.eventLog.push(`${pid}'s Asteroids wears off.`)
        }
        if (ps.minefieldUntilBeginningOfPlayerTurn === state.activePlayer) {
          ps.minefieldUntilBeginningOfPlayerTurn = undefined
          state.eventLog.push(`${pid}'s Minefield wears off.`)
        }
      }

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
    const playerState = state.getPlayerState(playerId)

    if (chosenShipCards.length === 0) {
      warn(`Player ${playerId} has no more ships to place.`)
      return
    }

    const card = chosenShipCards.shift()!

    playerState.ships.push({
      type: 'Ship',
      location: action.location,
      shipType: card,
      damage: 0,
      temporaryDamage: 0,
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
        _.times(state.gameSettings.startingHandSize, () =>
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

  if (state.activePlayer !== playerId) {
    warn('A player acted that was not the active player.')
    return
  }
  const activePlayerState = state.getPlayerState(state.activePlayer)

  switch (state.turnState.type) {
    case 'ReinforcePlaceShipState':
    case 'AttackPlaceShipState':
      activePlayerState.ships.push({
        type: 'Ship',
        location: action.location,
        shipType: state.turnState.newShip,
        damage: 0,
        temporaryDamage: 0,
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

    case 'AttackPlaceConcussiveBlastedShipsState':
      const ship = state.turnState.ships.shift()
      assert(ship !== undefined, 'ships must be nonempty.')

      const [targetPlayer, targetPlayerState] = owningPlayer(
        state.playerState,
        ship
      )

      if (!nonfullZones(targetPlayerState.ships).includes(action.location)) {
        warn(
          `Can't move ${ship.shipType.name} to the ${action.location} zone because it's full.`
        )
        break
      }

      ship.location = action.location

      state.eventLog.push(
        `Through Concussive Blast, ${
          state.activePlayer
        } moves ${targetPlayer}'s ${
          ship.shipType.name
        } to the ${locationToString(action.location)} zone.`
      )
      if (state.turnState.ships.length === 0) {
        state.turnState = { type: 'AttackTurnState' }
      }
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
        warn(
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
  if (state.activePlayer !== playerId) {
    warn('A player acted that was not the active player.')
    return
  }
  const activePlayerState = state.getPlayerState(state.activePlayer)

  switch (state.turnState.type) {
    case 'PlayBlastChooseFiringShipState':
    case 'PlayBlastChooseTargetShipState':
      activePlayerState.hand.push(state.turnState.blast)
      state.turnState = {
        type: 'AttackTurnState',
      }
      break
    case 'PlaySquadronChooseTargetShipState':
      activePlayerState.hand.push(state.turnState.squadron)
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
