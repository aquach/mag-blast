export type PlayerId = string

export type Location = 'n' | 's' | 'e' | 'w'

export type SelectCardPromptMode = 'Single' | 'SingleWithPass' | 'Multiple'

export interface SelectCardPrompt {
  type: 'SelectCardPrompt'
  selectableCardIndices: number[]
  mode: SelectCardPromptMode
  text: string
}

export interface ChooseShipPrompt {
  type: 'ChooseShipPrompt'
  allowableShipIndices: [PlayerId, number][]
  text: string
}

export type Prompt = SelectCardPrompt | ChooseShipPrompt

export interface UIPlayerState {
  ships: UIShip[]
}

export interface UIShipCard {
  name: string
  movement: number
  hp: number
}

export interface UIShip {
  location: Location
  shipType: UIShipCard
  damage: number
}

export interface UIState {
  playerHand: UIActionCard[]
  playerState: Record<PlayerId, UIPlayerState>
  deckSize: number
  isActivePlayer: boolean
  eventLog: string[]
  prompt: Prompt | undefined
}

export interface UIActionCard {
  name: string
  damage: number | undefined
  text: string | undefined
}

export interface SelectCardAction {
  type: 'SelectCardAction'
  handIndex: number | number[]
}

export interface ChooseShipAction {
  type: 'ChooseShipAction'
  choice: [PlayerId, number]
}

export interface PassAction {
  type: 'PassAction'
}

export type Action = SelectCardAction | ChooseShipAction | PassAction
