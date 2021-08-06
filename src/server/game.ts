import * as _ from 'lodash'

import { Action, UIState } from './shared-types'

export type PlayerId = string

export interface GameState {
  deck: number[]
  playerHands: Map<PlayerId, number[]>
  activePlayer: string
  eventLog: string[]
}

export function newGameState(): GameState {
  return {
    activePlayer: '#1',
    deck: [1, 2, 3],
    playerHands: new Map([
      ['#1', []],
      ['#2', []],
    ]),
    eventLog: [],
  }
}

export function uiState(playerId: PlayerId, state: GameState): UIState {
  return {
    playerHand: state.playerHands.get(playerId)!,
    otherPlayerHandSize:
      state.playerHands.get(playerId === '#1' ? '#2' : '#1')?.length || -1,
    deckSize: state.deck.length,
    isActivePlayer: state.activePlayer === playerId,
    eventLog: state.eventLog,
  }
}

export function applyAction(state: GameState, action: Action): void {
  switch (action.type) {
    case 'draw':
      const card = state.deck.shift()!
      state.playerHands.get(state.activePlayer)!.push(card)
      state.eventLog.push(`${state.activePlayer} draws a card.`)
      state.activePlayer = state.activePlayer === '#1' ? '#2' : '#1'

      break
  }
}
