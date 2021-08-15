import { CommandShip, GameState, PlayerState, Ship } from './types'
import * as _ from 'lodash'
import { ascribe, assert, filterIndices, partition, warn } from './utils'
import {
  ActionCard,
  Location,
  LOCATIONS,
  PlayerId,
  ShipCard,
} from './shared-types'
import { MAX_ZONE_SHIPS } from './constants'

export function drawActivePlayerCards(
  state: GameState,
  numCards: number
): void {
  const activePlayerState = state.getPlayerState(state.activePlayer)

  state.eventLog.push(
    `${state.activePlayer} draws ${numCards} card${numCards > 1 ? 's' : ''}.`
  )

  _.times(numCards, () => {
    const topCard = state.actionDeck.shift()
    assert(topCard !== undefined, 'Action card deck must not be empty.')
    activePlayerState.hand.push(topCard)

    if (state.actionDeck.length === 0) {
      state.eventLog.push('Action card deck is reshuffled.')

      state.actionDeck = _.shuffle(state.actionDiscardDeck)
      state.actionDiscardDeck = []
    }
  })
}

export function drawShipCard(state: GameState): ShipCard {
  const topCard = state.shipDeck.shift()
  assert(topCard !== undefined, 'Ship card deck must not be empty.')

  if (state.shipDeck.length === 0) {
    state.eventLog.push('Ship card deck is reshuffled.')

    state.shipDeck = _.shuffle(state.shipDiscardDeck)
    state.shipDiscardDeck = []
  }

  return topCard
}

export function discardActivePlayerCards(
  state: GameState,
  cardIndices: number[]
): void {
  const activePlayerState = state.getPlayerState(state.activePlayer)

  const [discardedCards, newHand] = partition(activePlayerState.hand, (c, i) =>
    cardIndices.includes(i)
  )
  activePlayerState.hand = newHand
  discardedCards.forEach((c) => state.actionDiscardDeck.push(c))
}

export function sufficientForReinforcement(cards: ActionCard[]): boolean {
  const numStars = _.sum(cards.map((c) => c.resources.stars))
  const numCircles = _.sum(cards.map((c) => c.resources.circles))
  const numDiamonds = _.sum(cards.map((c) => c.resources.diamonds))

  return (
    numStars === 3 ||
    numCircles === 3 ||
    numDiamonds === 3 ||
    (numStars >= 1 && numCircles >= 1 && numDiamonds >= 1)
  )
}

export function shipClassCanFire(ship: ShipCard, blastType: string): boolean {
  switch (blastType) {
    case 'LaserBlastCard':
      return ship.firesLasers
    case 'BeamBlastCard':
      return ship.firesBeams
    case 'MagBlastCard':
      return ship.firesMags
    default:
      assert(
        false,
        `shipClassCanFire received card type ${blastType} instead of a valid blast.`
      )
  }
}

export function locationToString(l: Location): string {
  switch (l) {
    case 'n':
      return 'North'
    case 'w':
      return 'West'
    case 'e':
      return 'East'
    case 's':
      return 'South'
  }
}

export function movableZones(l: Location, movement: number): Location[] {
  if (movement <= 0) {
    return [l]
  }

  if (movement >= 2) {
    return LOCATIONS
  }

  switch (l) {
    case 'n':
      return ['w', 'n', 'e']
    case 'w':
      return ['s', 'w', 'n']
    case 'e':
      return ['s', 'e', 'n']
    case 's':
      return ['w', 's', 'e']
  }
}

export function onePlayerLeft(playerState: Map<string, PlayerState>): boolean {
  return (
    Array.from(playerState.values()).filter((ps) => ps.isAlive).length === 1
  )
}

export function owningPlayer(
  playerState: Map<string, PlayerState>,
  ship: Ship | CommandShip
): [string, PlayerState] {
  const playerEntry = Array.from(playerState.entries()).find(([_, p]) =>
    ship.type === 'Ship' ? p.ships.includes(ship) : p.commandShip === ship
  )
  assert(playerEntry !== undefined, 'Target ship must belong to a player.')

  return playerEntry
}

export function destroyShip(state: GameState, ship: Ship | CommandShip): void {
  const [targetPlayer, targetPlayerState] = owningPlayer(
    state.playerState,
    ship
  )

  state.eventLog.push(`${targetPlayer}'s ${ship.shipType.name} is destroyed!`)

  if (ship.type === 'Ship') {
    _.remove(targetPlayerState.ships, (s) => s === ship)
    state.shipDiscardDeck.push(ship.shipType)
  } else {
    state.eventLog.push(`${targetPlayer} is eliminated.`)
    targetPlayerState.isAlive = false

    if (onePlayerLeft(state.playerState)) {
      state.eventLog.push(
        `${state.activePlayer} is the only player left and wins the game!`
      )
      state.turnState = {
        type: 'EndGameState',
      }
      state.activePlayer = ''
    }
  }
}

export function resolveBlastAttack(
  state: GameState,
  firingShip: Ship,
  targetShip: Ship | CommandShip,
  blast: ActionCard
): void {
  targetShip.damage += blast.damage

  const [targetPlayer, targetPlayerState] = owningPlayer(
    state.playerState,
    targetShip
  )

  state.eventLog.push(
    `${state.activePlayer}'s ${firingShip.shipType.name} fires a ${blast.name} at ${targetPlayer}'s ${targetShip.shipType.name}, dealing ${blast.damage} damage.`
  )

  if (isDead(targetShip)) {
    destroyShip(state, targetShip)
  } else {
    state.directHitStateMachine = {
      type: 'BlastPlayedDirectHitState',
      firingShip: firingShip,
      targetShip,
    }
  }
}

export function resolveSquadronAttack(
  state: GameState,
  attackingPlayer: PlayerId,
  targetShip: Ship | CommandShip,
  squadron: ActionCard
): void {
  targetShip.temporaryDamage += squadron.damage

  const [targetPlayer, targetPlayerState] = owningPlayer(
    state.playerState,
    targetShip
  )

  state.eventLog.push(
    `${state.activePlayer} deploys a ${squadron.name} targeting ${targetPlayer}'s ${targetShip.shipType.name}, dealing ${squadron.damage} damage.`
  )

  if (isDead(targetShip)) {
    destroyShip(state, targetShip)
  }
}

export function executeCardEffect(state: GameState, card: ActionCard): void {
  const activePlayerState = state.getPlayerState(state.activePlayer)

  if (card.isBlast) {
    if (state.directHitStateMachine?.type === 'DirectHitPlayedDirectHitState') {
      const firingShip = state.directHitStateMachine.firingShip
      const targetShip = state.directHitStateMachine.targetShip
      targetShip.damage += card.damage

      const [targetPlayer, targetPlayerState] = owningPlayer(
        state.playerState,
        targetShip
      )

      state.eventLog.push(
        `${state.activePlayer}'s ${firingShip.shipType.name} fires an additional ${card.name} at ${targetPlayer}'s ${targetShip.shipType.name}, dealing ${card.damage} damage.`
      )

      if (isDead(targetShip)) {
        destroyShip(state, targetShip)
      }

      state.turnState = {
        type: 'AttackTurnState',
      }
    } else {
      state.turnState = {
        type: 'PlayBlastChooseFiringShipState',
        blast: card,
      }
    }
  } else if (card.isSquadron) {
    state.turnState = {
      type: 'PlaySquadronChooseTargetShipState',
      squadron: card,
    }
  } else if (card.cardType === 'ReinforcementsCard') {
    state.eventLog.push(`${state.activePlayer} plays ${card.name}.`)
    const newShip = drawShipCard(state)

    state.turnState = {
      type: 'AttackPlaceShipState',
      newShip,
    }
  } else if (card.cardType === 'StrategicAllocationCard') {
    state.eventLog.push(`${state.activePlayer} plays ${card.name}.`)
    drawActivePlayerCards(state, 3)
  } else if (card.isDirectHit) {
    if (state.directHitStateMachine?.type !== 'BlastPlayedDirectHitState') {
      warn(
        `Wrong state ${state.directHitStateMachine?.type} to play direct hit.`
      )
      return
    }

    state.eventLog.push(`${state.activePlayer} plays a Direct Hit!`)
    state.directHitStateMachine = {
      type: 'DirectHitPlayedDirectHitState',
      firingShip: state.directHitStateMachine.firingShip,
      targetShip: state.directHitStateMachine.targetShip,
    }
  } else if (card.isDirectHitEffect) {
    if (state.directHitStateMachine?.type !== 'DirectHitPlayedDirectHitState') {
      warn(
        `Wrong state ${state.directHitStateMachine?.type} to play a direct hit effect.`
      )
      return
    }

    state.eventLog.push(`${state.activePlayer} plays a ${card.name}!`)
    const targetShip = state.directHitStateMachine.targetShip

    const [targetPlayer, targetPlayerState] = owningPlayer(
      state.playerState,
      targetShip
    )

    switch (card.cardType) {
      case 'CatastrophicDamageCard':
        destroyShip(state, targetShip)
        break

      case 'BoardingPartyCard':
        if (targetShip.type !== 'Ship') {
          warn(
            `Can only play Boarding Party on a Ship, not a ${targetShip.type}.`
          )
          break
        }

        state.eventLog.push(
          `${state.activePlayer} steals ${targetPlayer}'s ${targetShip.shipType.name}!`
        )
        _.remove(targetPlayerState.ships, (s) => s === targetShip)
        state.turnState = {
          type: 'AttackPlaceStolenShipState',
          stolenShip: targetShip,
        }
        break

      case 'ConcussiveBlastCard':
        if (targetShip.type !== 'Ship') {
          warn(
            `Can only play Concussive Blast on a Ship, not a ${targetShip.type}.`
          )
          break
        }
        state.turnState = {
          type: 'AttackPlaceConcussiveBlastedShipsState',
          ships: targetPlayerState.ships.filter(
            (s) => s.location === targetShip.location
          ),
        }
        break

      case 'BridgeHitCard':
        state.eventLog.push(
          `${state.activePlayer} takes three cards at random from ${targetPlayer}'s hand.`
        )
        const stealCards = _.take(_.shuffle(targetPlayerState.hand), 3)
        stealCards.forEach((c) => {
          activePlayerState.hand.push(c)
        })
        targetPlayerState.hand = targetPlayerState.hand.filter(
          (c) => !stealCards.includes(c)
        )
        break

      default:
        warn(`Don't know how to handle choosing a ${card.cardType} card.`)
    }
  } else if (card.cardType === 'AsteroidsCard') {
    state.turnState = {
      type: 'AttackChooseAsteroidsPlayerTurnState',
    }
  } else if (card.cardType === 'MinefieldCard') {
    state.turnState = {
      type: 'AttackChooseMinefieldPlayerTurnState',
    }
  } else {
    warn(`Don't know how to handle choosing a ${card.cardType} card.`)
  }
}

export function canRespondToBlast(c: ActionCard): boolean {
  return c.canRespondToBlast
}

export function canRespondToSquadron(
  targetPlayerState: PlayerState,
  respondingCard: ActionCard
): boolean {
  return (
    respondingCard.canRespondToBlast ||
    (respondingCard.canRespondToSquadron &&
      ownsCarrier(targetPlayerState.ships))
  )
}

export function nonfullZones(ships: Ship[]): Location[] {
  const shipsByLocation = _.groupBy(ships, (s) => s.location)
  return LOCATIONS.filter(
    (l) => (shipsByLocation[l] ?? []).length < MAX_ZONE_SHIPS
  )
}

export function fullOnShips(ships: Ship[]): boolean {
  return ships.length == MAX_ZONE_SHIPS * 4
}

export function canTargetPlayerWithBlastsOrSquadrons(
  state: GameState,
  fromPlayerId: string,
  toPlayerId: string
): boolean {
  const toPlayerState = state.getPlayerState(toPlayerId)

  if (toPlayerState.asteroidsUntilBeginningOfPlayerTurn) {
    return false
  }

  // Enforce attack-right.

  const playerIndex = state.playerTurnOrder.indexOf(fromPlayerId)
  assert(
    playerIndex !== -1,
    "Couldn't find active player in player turn order."
  )
  const playerIndexToTheRight = (playerIndex + 1) % state.playerTurnOrder.length

  if (state.playerTurnOrder[playerIndexToTheRight] !== toPlayerId) {
    return false
  }

  return true
}

export function canPlayCard(
  state: GameState,
  playerState: PlayerState,
  card: ActionCard
): boolean {
  if (card.canRespondToBlast) {
    return false
  }

  if (
    (card.isBlast || card.isSquadron) &&
    playerState.minefieldUntilBeginningOfPlayerTurn !== undefined
  ) {
    return false
  }

  if (card.isDirectHit) {
    return state.directHitStateMachine?.type === 'BlastPlayedDirectHitState'
  }

  if (card.isDirectHitEffect) {
    if (state.directHitStateMachine?.type !== 'DirectHitPlayedDirectHitState') {
      return false
    }

    // These can't target command ships. All other cards can target all ships.
    if (
      state.directHitStateMachine.targetShip.type === 'CommandShip' &&
      (card.cardType === 'BoardingPartyCard' ||
        card.cardType === 'ConcussiveBlastCard')
    ) {
      return false
    }

    if (
      card.cardType === 'BoardingPartyCard' &&
      fullOnShips(playerState.ships)
    ) {
      return false
    }

    return true
  }

  if (card.isSquadron) {
    return ownsCarrier(playerState.ships)
  }

  return true
}

export function ownsCarrier(ships: Ship[]): boolean {
  return ships.some((s) => s.shipType.shipClass === 'Carrier')
}

export function zoneEmpty(ships: Ship[], location: Location): boolean {
  return ships.every((s) => s.location !== location)
}

export function isDead(ship: Ship | CommandShip): boolean {
  return ship.damage + ship.temporaryDamage >= ship.shipType.hp
}

export function shipCanFire(s: Ship, blast: ActionCard): boolean {
  return !s.hasFiredThisTurn && shipClassCanFire(s.shipType, blast.cardType)
}

export function blastableShipIndices(
  state: GameState,
  firingShip: Ship
): [PlayerId, number][] {
  const [firingPlayerId, firingPlayerState] = owningPlayer(
    state.playerState,
    firingShip
  )

  return _.flatMap(
    Array.from(state.playerState.entries()),
    ([targetPlayerId, targetPlayerState]) => {
      if (targetPlayerId === firingPlayerId) {
        return []
      }

      if (
        !canTargetPlayerWithBlastsOrSquadrons(
          state,
          firingPlayerId,
          targetPlayerId
        )
      ) {
        return []
      }

      return filterIndices(
        targetPlayerState.ships,
        (s) => s.location === firingShip.location
      ).map<[PlayerId, number]>((shipIndex) => [targetPlayerId, shipIndex])
    }
  )
}

export function blastableCommandShipPlayers(
  state: GameState,
  firingShip: Ship
): PlayerId[] {
  const [firingPlayerId, firingPlayerState] = owningPlayer(
    state.playerState,
    firingShip
  )

  return _.flatMap(
    Array.from(state.playerState.entries()),
    ([targetPlayerId, targetPlayerState]) => {
      if (targetPlayerId === firingPlayerId) {
        return []
      }

      if (
        !canTargetPlayerWithBlastsOrSquadrons(
          state,
          firingPlayerId,
          targetPlayerId
        )
      ) {
        return []
      }

      const shipInTheWay = targetPlayerState.ships.some(
        (s) => s.location === firingShip.location
      )

      return shipInTheWay ? [] : [targetPlayerId]
    }
  )
}

export function moveableShips(
  playerId: PlayerId,
  playerState: PlayerState
): [PlayerId, number][] {
  return playerState.minefieldUntilBeginningOfPlayerTurn
    ? []
    : filterIndices(playerState.ships, (s) => s.shipType.movement > 0).map(
        (i) => ascribe<[PlayerId, number]>([playerId, i])
      )
}

export function squadronableShipIndices(
  state: GameState,
  playerId: PlayerId,
  squadronCard: ActionCard
): [PlayerId, number][] {
  const playerState = state.getPlayerState(playerId)
  const carrierLocations = _.uniq(
    playerState.ships
      .filter((s) => s.shipType.shipClass === 'Carrier')
      .map((s) => s.location)
  )
  return _.flatMap(
    Array.from(state.playerState.entries()),
    ([targetPlayerId, targetPlayerState]) => {
      if (targetPlayerId === playerId) {
        return []
      }

      if (
        !canTargetPlayerWithBlastsOrSquadrons(state, playerId, targetPlayerId)
      ) {
        return []
      }

      return filterIndices(
        targetPlayerState.ships,
        (s) =>
          squadronCard.cardType === 'FighterCard' ||
          carrierLocations.includes(s.location)
      ).map<[string, number]>((shipIndex) => [targetPlayerId, shipIndex])
    }
  )
}

export function squadronableCommandShipPlayers(
  state: GameState,
  playerId: PlayerId,
  squadronCard: ActionCard
): PlayerId[] {
  const playerState = state.getPlayerState(playerId)
  const carrierLocations = _.uniq(
    playerState.ships
      .filter((s) => s.shipType.shipClass === 'Carrier')
      .map((s) => s.location)
  )
  return _.flatMap(
    Array.from(state.playerState.entries()),
    ([targetPlayerId, targetPlayerState]) => {
      if (targetPlayerId === playerId) {
        return []
      }

      if (
        !canTargetPlayerWithBlastsOrSquadrons(state, playerId, targetPlayerId)
      ) {
        return []
      }

      const attackingLocations =
        squadronCard.cardType === 'FighterCard' ? LOCATIONS : carrierLocations
      const hasAccess = attackingLocations.some((l) =>
        zoneEmpty(targetPlayerState.ships, l)
      )
      return hasAccess ? [targetPlayerId] : []
    }
  )
}
