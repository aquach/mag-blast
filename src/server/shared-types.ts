export type PlayerId = string

export type Location = 'n' | 's' | 'e' | 'w'

export interface ShipCard {
  type: 'ShipCard'
  name: string
  movement: number
  hp: number
  shipClass: string
  firesLasers: boolean
  firesBeams: boolean
  firesMags: boolean
}

export interface CommandShipCard {
  type: 'CommandShipCard'
  name: string
  hp: number
}

export interface SelectCardPrompt {
  type: 'SelectCardPrompt'
  selectableCardIndices: number[]
  multiselect: boolean
  canPass: boolean
  text: string
}

export interface ChooseShipPrompt {
  type: 'ChooseShipPrompt'
  allowableShipIndices: [PlayerId, number][]
  allowableCommandShips: PlayerId[]
  text: string
}

export interface PlaceShipPrompt {
  type: 'PlaceShipPrompt'
  newShip: ShipCard
  text: string
}

export type Prompt = SelectCardPrompt | ChooseShipPrompt | PlaceShipPrompt

export interface UIPlayerState {
  ships: UIShip[]
  commandShip: UICommandShip
}

export interface UIShip {
  location: Location
  shipType: ShipCard
  damage: number
}

export interface UICommandShip {
  damage: number
  shipType: CommandShipCard
}

export interface UIState {
  playerHand: UIActionCard[]
  playerState: Record<PlayerId, UIPlayerState>
  deckSize: number
  isActivePlayer: boolean
  eventLog: string[]
  prompt: Prompt | undefined
}

export interface UIResources {
  hasStar: boolean
  hasCircle: boolean
  hasDiamond: boolean
}

export interface UIActionCard {
  name: string
  damage: number | undefined
  text: string | undefined
  resources: UIResources
}

export interface SelectCardAction {
  type: 'SelectCardAction'
  handIndex: number | number[]
}

export interface ChooseShipAction {
  type: 'ChooseShipAction'
  choice: [PlayerId, number] | PlayerId
}

export interface PassAction {
  type: 'PassAction'
}

export type Action = SelectCardAction | ChooseShipAction | PassAction
