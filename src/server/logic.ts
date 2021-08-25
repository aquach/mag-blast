import * as _ from 'lodash'
import { MAX_ZONE_SHIPS } from './constants'
import { event, p } from './events'
import {
  ActionCard,
  GameFlavor,
  Location,
  LOCATIONS,
  PlayerId,
  ShipCard,
} from './shared-types'
import { CommandShip, GameState, PlayerState, Ship, TurnState } from './types'
import { ascribe, assert, filterIndices, partition, warn } from './utils'

export function drawCards(
  state: GameState,
  playerId: PlayerId,
  numCards: number
): void {
  const playerState = state.getPlayerState(playerId)

  state.pushEventLog(
    event`${p(playerId)} draws ${numCards} card${numCards > 1 ? 's' : ''}.`
  )

  _.times(numCards, () => {
    const topCard = state.actionDeck.shift()
    assert(topCard !== undefined, 'Action card deck must not be empty.')
    playerState.hand.push(topCard)

    if (state.actionDeck.length === 0) {
      state.pushEventLog(event`Action card deck is reshuffled.`)

      state.actionDeck = _.shuffle(state.actionDiscardDeck)
      state.actionDiscardDeck = []
    }
  })
}

export function drawShipCard(state: GameState): ShipCard {
  const topCard = state.shipDeck.shift()
  assert(topCard !== undefined, 'Ship card deck must not be empty.')

  if (state.shipDeck.length === 0) {
    state.pushEventLog(event`Ship card deck is reshuffled.`)

    state.shipDeck = _.shuffle(state.shipDiscardDeck)
    state.shipDiscardDeck = []
  }

  return topCard
}

export function drawAndChooseShipCard(
  state: GameState,
  nextState: (_: ShipCard) => TurnState
): TurnState {
  if (
    state.getPlayerState(state.activePlayer).commandShip.shipType
      .commandType === 'MheeYowMeex'
  ) {
    const newShips = [drawShipCard(state), drawShipCard(state)]
    return {
      type: 'MheeChooseShipState',
      ships: newShips,
      nextState,
    }
  } else {
    return nextState(drawShipCard(state))
  }
}

export function discardPlayerHandCards(
  state: GameState,
  playerId: PlayerId,
  cardIndices: number[]
): void {
  const playerState = state.getPlayerState(playerId)

  const [discardedCards, newHand] = partition(playerState.hand, (c, i) =>
    cardIndices.includes(i)
  )
  playerState.hand = newHand
  discardedCards.forEach((c) => state.actionDiscardDeck.push(c))
}

export function resources(cards: ActionCard[]): {
  numStars: number
  numCircles: number
  numDiamonds: number
} {
  const numStars = _.sum(cards.map((c) => c.resources.stars))
  const numCircles = _.sum(cards.map((c) => c.resources.circles))
  const numDiamonds = _.sum(cards.map((c) => c.resources.diamonds))
  return {
    numDiamonds,
    numCircles,
    numStars,
  }
}

export function sufficientForReinforcement(cards: ActionCard[]): boolean {
  const { numStars, numCircles, numDiamonds } = resources(cards)

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

export function destroyShip(
  state: GameState,
  ship: Ship | CommandShip
): boolean {
  const gameFlavor = state.gameSettings.gameFlavor

  const [targetPlayer, targetPlayerState] = owningPlayer(
    state.playerState,
    ship
  )

  state.pushEventLog(
    event`${p(targetPlayer)}'s ${ship.shipType.name} is destroyed!`
  )

  const recyclonsPlayer = Array.from(state.playerState.entries()).find(
    (e) =>
      e[1].commandShip.shipType.commandType === 'Recyclonsv40K' && e[1].isAlive
  )

  if (ship.type === 'Ship') {
    _.remove(targetPlayerState.ships, (s) => s === ship)
    state.shipDiscardDeck.push(ship.shipType)

    // In Original, this triggers whenever any ship dies. In Rebalanced, it
    // triggers only if a Recyclons fleet ship dies.
    if (
      recyclonsPlayer !== undefined &&
      (gameFlavor === 'Original' || targetPlayer === recyclonsPlayer[0])
    ) {
      const [recyclonsPlayerId, recyclonsPlayerState] = recyclonsPlayer
      state.pushEventLog(
        event`${recyclonsPlayerId}'s ${recyclonsPlayerState.commandShip.shipType.name} activates!`
      )
      drawCards(state, recyclonsPlayerId, gameFlavor === 'Original' ? 1 : 2)
    }
  } else {
    state.pushEventLog(event`${p(targetPlayer)} is eliminated.`)
    targetPlayerState.isAlive = false

    if (onePlayerLeft(state.playerState)) {
      state.pushEventLog(
        event`${p(
          state.activePlayer
        )} is the only player left and wins the game!`
      )
      state.turnState = {
        type: 'EndGameState',
      }
      state.activePlayer = ''
      return true
    } else if (recyclonsPlayer !== undefined && gameFlavor === 'Original') {
      const [recyclonsPlayerId, recyclonsPlayerState] = recyclonsPlayer
      state.pushEventLog(
        event`${p(recyclonsPlayerId)}'s ${
          recyclonsPlayerState.commandShip.shipType.name
        } activates!`
      )
      drawCards(state, recyclonsPlayerId, 3)
    }
  }

  return false
}

export function resolveBlastAttack(
  state: GameState,
  firingShip: Ship,
  targetShip: Ship | CommandShip,
  blast: ActionCard
): boolean {
  let damage
  if (blast.cardType === 'RammingSpeedCard') {
    destroyShip(state, firingShip)
    damage =
      firingShip.shipType.movement *
      (state.gameSettings.gameFlavor === 'Rebalanced' ? 2 : 1)
  } else {
    damage = blast.damage
  }

  targetShip.damage += damage

  if (targetShip.type === 'Ship') {
    targetShip.blastDamageHistory.push(damage)
  }

  const [targetPlayer, targetPlayerState] = owningPlayer(
    state.playerState,
    targetShip
  )

  if (isDead(state.gameSettings.gameFlavor, targetShip)) {
    return destroyShip(state, targetShip)
  } else if (blast.cardType !== 'RammingSpeedCard') {
    state.directHitStateMachine = {
      type: 'BlastPlayedDirectHitState',
      firingShip: firingShip,
      targetShip,
    }
    return false
  } else {
    return false
  }
}

export function squadronDamage(
  state: GameState,
  targetShip: Ship | CommandShip,
  squadron: ActionCard
): number {
  if (
    owningPlayer(state.playerState, targetShip)[1].commandShip.shipType
      .commandType === 'TheGlorp' &&
    targetShip.type === 'Ship'
  ) {
    return squadron.damage / 2
  }
  return squadron.damage
}

export function resolveSquadronAttack(
  state: GameState,
  targetShip: Ship | CommandShip,
  squadron: ActionCard
): boolean {
  targetShip.temporaryDamage += squadronDamage(state, targetShip, squadron)

  if (isDead(state.gameSettings.gameFlavor, targetShip)) {
    return destroyShip(state, targetShip)
  }

  return false
}

export function executeCardEffect(state: GameState, card: ActionCard): boolean {
  const activePlayerState = state.getPlayerState(state.activePlayer)

  if (card.isBlast) {
    if (
      state.directHitStateMachine?.type === 'DirectHitPlayedDirectHitState' &&
      state.directHitStateMachine?.canBlastAgain
    ) {
      const firingShip = state.directHitStateMachine.firingShip
      const targetShip = state.directHitStateMachine.targetShip

      const [targetPlayer, targetPlayerState] = owningPlayer(
        state.playerState,
        targetShip
      )

      state.pushEventLog(
        event`${p(state.activePlayer)}'s ${
          firingShip.shipType.name
        } fires an additional ${card.name} at ${p(targetPlayer)}'s ${
          targetShip.shipType.name
        }, dealing ${card.damage} damage.`
      )

      const respondablePlayers = playersThatCanRespondToActions(
        state,
        state.activePlayer
      )
      if (respondablePlayers.length > 0) {
        state.turnState = {
          type: 'PlayActionRespondState',
          playingPlayer: state.activePlayer,
          respondingPlayers: respondablePlayers,
          resolveAction(): boolean {
            return resolveBlastAttack(state, firingShip, targetShip, card)
          },
          counterAction(): boolean {
            return false
          },
        }
      } else {
        resolveBlastAttack(state, firingShip, targetShip, card)
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
  } else if (card.cardType === 'RammingSpeedCard') {
    state.turnState = {
      type: 'PlayBlastChooseFiringShipState',
      blast: card,
    }
  } else if (card.cardType === 'SpacedockCard') {
    state.turnState = {
      type: 'AttackChooseSpacedockShipState',
      card,
    }
  } else if (card.cardType === 'ReinforcementsCard') {
    state.turnState = drawAndChooseShipCard(state, (newShip) => ({
      type: 'AttackPlaceShipState',
      newShip,
    }))

    // The boolean is technically used to indicate that the game is over, which
    // suppresses future state transitions, but the game is not over here. We
    // just want the PassAction on PlayActionRespondState to not go back to
    // AttackTurnState.
    return true
  } else if (card.cardType === 'StrategicAllocationCard') {
    drawCards(state, state.activePlayer, 3)
  } else if (card.isDirectHit) {
    if (state.directHitStateMachine?.type !== 'BlastPlayedDirectHitState') {
      warn(
        `Wrong state ${state.directHitStateMachine?.type} to play direct hit.`
      )
      return false
    }

    state.directHitStateMachine = {
      type: 'DirectHitPlayedDirectHitState',
      firingShip: state.directHitStateMachine.firingShip,
      targetShip: state.directHitStateMachine.targetShip,
      canBlastAgain: true,
    }
  } else if (card.isDirectHitEffect) {
    if (state.directHitStateMachine?.type !== 'DirectHitPlayedDirectHitState') {
      warn(
        `Wrong state ${state.directHitStateMachine?.type} to play a direct hit effect.`
      )
      return false
    }

    const targetShip = state.directHitStateMachine.targetShip

    const [targetPlayer, targetPlayerState] = owningPlayer(
      state.playerState,
      targetShip
    )

    switch (card.cardType) {
      case 'CatastrophicDamageCard':
        return destroyShip(state, targetShip)
        break

      case 'BoardingPartyCard':
        if (targetShip.type !== 'Ship') {
          warn(
            `Can only play Boarding Party on a Ship, not a ${targetShip.type}.`
          )
          break
        }

        state.pushEventLog(
          event`${p(state.activePlayer)} steals ${p(targetPlayer)}'s ${
            targetShip.shipType.name
          }!`
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
        stealThreeCardsAndGiveToActivePlayer(state, targetPlayer)
        break

      default:
        warn(`Don't know how to handle choosing a ${card.cardType} card.`)
    }
  } else if (card.cardType === 'AsteroidsCard') {
    state.turnState = {
      type: 'AttackChooseAsteroidsPlayerTurnState',
      card,
    }
  } else if (card.cardType === 'MinefieldCard') {
    state.turnState = {
      type: 'AttackChooseMinefieldPlayerTurnState',
      card,
    }
  } else {
    warn(`Don't know how to handle choosing a ${card.cardType} card.`)
  }

  return false
}

export function stealThreeCardsAndGiveToActivePlayer(
  state: GameState,
  targetPlayer: PlayerId
): void {
  const activePlayerState = state.getPlayerState(state.activePlayer)
  const targetPlayerState = state.getPlayerState(targetPlayer)
  state.pushEventLog(
    event`${p(state.activePlayer)} takes three cards at random from ${p(
      targetPlayer
    )}'s hand.`
  )
  const stealCards = _.take(_.shuffle(targetPlayerState.hand), 3)
  stealCards.forEach((c) => {
    activePlayerState.hand.push(c)
  })
  targetPlayerState.hand = targetPlayerState.hand.filter(
    (c) => !stealCards.includes(c)
  )
}

export function canRespondToBlast(
  state: GameState,
  playerId: PlayerId
): boolean {
  const playerState = state.getPlayerState(playerId)
  return (
    playerState.hand.some((c) => c.canRespondToBlast) ||
    (playerState.commandShip.shipType.commandType === 'CraniumConsortium' &&
      sufficientForCraniumCounter(playerState.hand))
  )
}

export function sufficientForCraniumCounter(cards: ActionCard[]): boolean {
  return _.sum(Object.values(resources(cards))) >= 2
}

export function canRespondToAnything(c: ActionCard): boolean {
  return c.canRespondToAnything
}

export function canRespondToSquadron(
  targetPlayerState: PlayerState,
  respondingCard: ActionCard
): boolean {
  return (
    respondingCard.canRespondToBlast ||
    (respondingCard.canRespondToSquadron &&
      targetPlayerState.minefieldUntilBeginningOfPlayerTurn === undefined &&
      carriers(targetPlayerState).length > 0)
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
  toPlayerId: string,
  options: { ignoreAsteroids: boolean }
): boolean {
  const toPlayerState = state.getPlayerState(toPlayerId)

  if (
    toPlayerState.asteroidsUntilBeginningOfPlayerTurn &&
    !options.ignoreAsteroids
  ) {
    return false
  }

  if (!toPlayerState.isAlive) {
    return false
  }

  const [_p, prevPlayer] = alivePlayerByTurnOffset(state, fromPlayerId, -1)
  const [_n, nextPlayer] = alivePlayerByTurnOffset(state, fromPlayerId, 1)

  switch (state.gameSettings.attackMode) {
    case 'FreeForAll':
      return true
    case 'AttackRight':
      return nextPlayer === toPlayerId
    case 'AttackLeftRight':
      return nextPlayer === toPlayerId || prevPlayer === toPlayerId
  }
}

export function alivePlayers(state: GameState): PlayerId[] {
  return state.playerTurnOrder.filter((p) => state.getPlayerState(p).isAlive)
}

export function alivePlayerByTurnOffset(
  state: GameState,
  playerId: PlayerId,
  offset: number
): [number, PlayerId] {
  const players = alivePlayers(state)

  const playerIndex = players.indexOf(playerId)
  assert(playerIndex !== -1, "Couldn't find player in player turn order.")
  const otherIndex = (playerIndex + offset + players.length) % players.length
  return [otherIndex, players[otherIndex]]
}

export function canPlayCardDuringAttackPhase(
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
    return carriers(playerState).length > 0
  }

  return true
}

export function carriers(playerState: PlayerState): Ship[] {
  return playerState.ships.filter(
    (s) =>
      s.shipType.shipClass === 'Carrier' ||
      (playerState.commandShip.shipType.commandType === 'BZZGZZRT' &&
        s.shipType.movement === 1)
  )
}

export function zoneEmpty(ships: Ship[], location: Location): boolean {
  return ships.every((s) => s.location !== location)
}

export function isDead(
  gameFlavor: GameFlavor,
  ship: Ship | CommandShip
): boolean {
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

  return Array.from(state.playerState.entries()).flatMap(
    ([targetPlayerId, targetPlayerState]) => {
      if (targetPlayerId === firingPlayerId) {
        return []
      }

      if (
        !canTargetPlayerWithBlastsOrSquadrons(
          state,
          firingPlayerId,
          targetPlayerId,
          { ignoreAsteroids: false }
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

  return Array.from(state.playerState.entries()).flatMap(
    ([targetPlayerId, targetPlayerState]) => {
      if (targetPlayerId === firingPlayerId) {
        return []
      }

      if (
        !canTargetPlayerWithBlastsOrSquadrons(
          state,
          firingPlayerId,
          targetPlayerId,
          { ignoreAsteroids: false }
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
  const carrierLocations = _.uniq(carriers(playerState).map((s) => s.location))
  return Array.from(state.playerState.entries()).flatMap(
    ([targetPlayerId, targetPlayerState]) => {
      if (targetPlayerId === playerId) {
        return []
      }

      if (
        !canTargetPlayerWithBlastsOrSquadrons(state, playerId, targetPlayerId, {
          ignoreAsteroids: false,
        })
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
  const carrierLocations = _.uniq(carriers(playerState).map((s) => s.location))
  return Array.from(state.playerState.entries()).flatMap(
    ([targetPlayerId, targetPlayerState]) => {
      if (targetPlayerId === playerId) {
        return []
      }

      if (
        !canTargetPlayerWithBlastsOrSquadrons(state, playerId, targetPlayerId, {
          ignoreAsteroids: false,
        })
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

export function resolveActionCard(state: GameState, card: ActionCard): boolean {
  const isGameOver = executeCardEffect(state, card)

  if (card.isSquadron) {
    state.getPlayerState(state.activePlayer).usedSquadronCards.push(card)
  } else {
    state.actionDiscardDeck.push(card)
  }

  if (!card.isDirectHit) {
    state.directHitStateMachine = undefined
  }

  return isGameOver
}

export function playersThatCanRespondToActions(
  state: GameState,
  playingPlayer: PlayerId
): PlayerId[] {
  const respondablePlayers = Array.from(state.playerState.entries())
    .filter(
      (e) =>
        e[0] !== playingPlayer &&
        e[1].isAlive &&
        e[1].hand.some(canRespondToAnything)
    )
    .map((e) => e[0])

  const index = state.playerTurnOrder.indexOf(playingPlayer)

  const playersAfterPlayingPlayerInTurnOrder = [
    ..._.drop(state.playerTurnOrder, index),
    ..._.take(state.playerTurnOrder, index),
  ]

  return playersAfterPlayingPlayerInTurnOrder.filter((p) =>
    respondablePlayers.includes(p)
  )
}

export function hasCommandShipAbilityActivations(
  playerState: PlayerState
): boolean {
  if (playerState.commandShip.remainingAbilityActivations === undefined) {
    return true
  }

  if (playerState.commandShip.remainingAbilityActivations <= 0) {
    return false
  }

  return true
}

export function minesweeperTargets(
  state: GameState,
  playerId: PlayerId
): PlayerId[] {
  const playerState = state.getPlayerState(playerId)

  if (activableMinesweepers(playerState).length === 0) {
    return []
  }

  const otherPlayers = Array.from(state.playerState.entries())
    .filter(
      (e) =>
        canTargetPlayerWithBlastsOrSquadrons(state, playerId, e[0], {
          ignoreAsteroids: true,
        }) &&
        (e[1].asteroidsUntilBeginningOfPlayerTurn !== undefined ||
          e[1].minefieldUntilBeginningOfPlayerTurn !== undefined)
    )
    .map((e) => e[0])

  const me =
    playerState.minefieldUntilBeginningOfPlayerTurn !== undefined ||
    playerState.asteroidsUntilBeginningOfPlayerTurn !== undefined
      ? [playerId]
      : []

  return [...otherPlayers, ...me]
}

export function activableMinesweepers(playerState: PlayerState): Ship[] {
  return playerState.ships.filter(
    (s) =>
      (s.shipType.shipClass === 'Minesweeper' ||
        (playerState.commandShip.shipType.commandType === 'BZZGZZRT' &&
          s.shipType.movement === 2)) &&
      !s.hasFiredThisTurn
  )
}
