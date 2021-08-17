export * from './actions'
export * from './base'
export * from './cards'
export * from './events'
export * from './prompts'

import { PlayerId } from './base'
import { ActionCard, UIPlayerState } from './cards'
import { EventLogEntry } from './events'
import { Prompt } from './prompts'

export interface UILobbyState {
  type: 'UILobbyState'
  playerIds: string[]
}

export interface UIGameState {
  type: 'UIGameState'
  playerHand: ActionCard[]
  playerState: [PlayerId, UIPlayerState][]
  actionDeckSize: number
  actionDiscardDeckSize: number
  isActivePlayer: boolean
  eventLog: EventLogEntry[]
  prompt: Prompt
}

export interface GameError {
  type:
    | 'GameAlreadyStartedCantAddNewPlayer'
    | 'GameNotFound'
    | 'TooManyPlayers'
    | 'TooFewPlayers'
}
