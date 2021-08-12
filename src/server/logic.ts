import { GameState, PlayerState } from './types'
import * as _ from 'lodash'
import { assert, partition } from './utils'
import { ActionCard, Location, LOCATIONS, ShipCard } from './shared-types'

export function drawActivePlayerCards(
  state: GameState,
  numCards: number
): void {
  const activePlayerState = state.playerState.get(state.activePlayer)
  assert(
    activePlayerState !== undefined,
    `Player ID ${state.activePlayer} not found.`
  )

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
) {
  const activePlayerState = state.playerState.get(state.activePlayer)
  assert(
    activePlayerState !== undefined,
    `Player ID ${state.activePlayer} not found.`
  )

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

export function canFire(ship: ShipCard, blastType: string): boolean {
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
        `canFire received card type ${blastType} instead of a valid blast.`
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
