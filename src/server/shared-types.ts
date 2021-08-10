export type PlayerId = string

export type Location = 'n' | 's' | 'e' | 'w'
export const LOCATIONS: Location[] = ['n', 's', 'e', 'w']

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

export interface Resources {
  stars: number
  circles: number
  diamonds: number
}

export interface ActionCard {
  type: 'ActionCard'
  name: string
  cardType: string
  damage: number
  resources: Resources
  isBlast: boolean
  isSquadron: boolean
  isDirectHit: boolean
  isDirectHitEffect: boolean
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
  canPass: boolean
  text: string
}

export interface ChooseZonePrompt {
  type: 'ChooseZonePrompt'
  text: string
  allowableZones: Location[]
}

export interface PlaceShipPrompt {
  type: 'PlaceShipPrompt'
  newShip: ShipCard
  text: string
  allowableZones: Location[]
}

export type Prompt =
  | SelectCardPrompt
  | ChooseShipPrompt
  | PlaceShipPrompt
  | ChooseZonePrompt

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
  playerHand: ActionCard[]
  playerState: Record<PlayerId, UIPlayerState>
  deckSize: number
  isActivePlayer: boolean
  eventLog: string[]
  prompt: Prompt | undefined
}

export interface SelectCardAction {
  type: 'SelectCardAction'
  handIndex: number | number[]
}

export interface ChooseShipAction {
  type: 'ChooseShipAction'
  choice: [PlayerId, number] | PlayerId
}

export interface ChooseZoneAction {
  type: 'ChooseZoneAction'
  location: Location
}

export interface PassAction {
  type: 'PassAction'
}

export type Action =
  | SelectCardAction
  | ChooseShipAction
  | PassAction
  | ChooseZoneAction
