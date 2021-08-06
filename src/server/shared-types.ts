export interface UIState {
  playerHand: number[]
  otherPlayerHandSize: number
  deckSize: number
  isActivePlayer: boolean
  eventLog: string[]
}

export interface DrawAction {
  type: 'draw'
}

export type Action = DrawAction
