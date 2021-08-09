import { ActionCard, GameState } from './types'
import * as _ from 'lodash'
import { assert, partition } from './utils'

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
  const numStars = cards.filter((c) => c.resources.hasStar).length
  const numCircles = cards.filter((c) => c.resources.hasCircle).length
  const numDiamonds = cards.filter((c) => c.resources.hasDiamond).length

  return (
    numStars === 3 ||
    numCircles === 3 ||
    numDiamonds === 3 ||
    (numStars >= 1 && numCircles >= 1 && numDiamonds >= 1)
  )
}
