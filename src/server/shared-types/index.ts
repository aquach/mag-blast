export * from './actions'
export * from './base'
export * from './cards'
export * from './events'
export * from './prompts'

import { ActionError } from './actions'
import { PlayerId } from './base'
import { ActionCard, UIPlayerState } from './cards'
import { EventLogEntry } from './events'
import { CommandShipAbilityPrompt, Prompt } from './prompts'

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
  commandShipAbilityPrompt: CommandShipAbilityPrompt | undefined

  actionError: ActionError | undefined
}

export type AttackMode = 'FreeForAll' | 'AttackRight' | 'AttackLeftRight'

export interface AttackModeInfo {
  attackMode: AttackMode
  name: string
  description: string
}

export const ATTACK_MODES: AttackModeInfo[] = [
  {
    attackMode: 'FreeForAll',
    name: 'Free For All',
    description: 'Anyone can attack anyone.',
  },
  {
    attackMode: 'AttackRight',
    name: 'Attack Right',
    description: 'You can only attack the player on your right.',
  },
  {
    attackMode: 'AttackLeftRight',
    name: 'Attack Left & Right',
    description: 'You can only attack the players to your left and right.',
  },
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
