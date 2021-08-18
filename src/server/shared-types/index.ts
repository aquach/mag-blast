export * from './actions'
export * from './base'
export * from './cards'
export * from './events'
export * from './prompts'

import { ActionError } from './actions'
import { PlayerId } from './base'
import { ActionCard, UIPlayerState } from './cards'
import { EventLogEntry } from './events'
import { Prompt } from './prompts'

export interface UILobbyState {
  type: 'UILobbyState'
  playerIds: string[]
  gameSettings: UIGameSettings
}

export interface UIGameState {
  type: 'UIGameState'
  playerHand: ActionCard[]
  playerState: [PlayerId, UIPlayerState][]

  actionDeckSize: number
  actionDiscardDeckSize: number
  shipDeckSize: number
  shipDiscardDeckSize: number

  isActivePlayer: boolean
  eventLog: EventLogEntry[]
  prompt: Prompt

  actionError: ActionError | undefined
}

export type AttackMode = 'FreeForAll' | 'AttackRight' | 'AttackLeftRight'

export const ATTACK_MODES: AttackMode[] = [
  'FreeForAll',
  'AttackRight',
  'AttackLeftRight',
]

export interface UIGameSettings {
  attackMode: AttackMode
}

export interface GameError {
  type:
    | 'GameAlreadyStartedCantAddNewPlayer'
    | 'GameNotFound'
    | 'TooManyPlayers'
    | 'TooFewPlayers'
}
