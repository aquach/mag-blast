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
  commandType: string
  hp: number
  text: string
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
  text: string
  isBlast: boolean
  isSquadron: boolean
  isDirectHit: boolean
  isDirectHitEffect: boolean
  isInstant: boolean
}

export interface ChooseCardPrompt {
  type: 'ChooseCardPrompt'
  selectableCardIndices: number[]
  multiselect: { actionText: string } | undefined
  pass: { actionText: string } | undefined
  text: string
}

export interface ChooseShipPrompt {
  type: 'ChooseShipPrompt'
  allowableShipIndices: [PlayerId, number][]
  allowableCommandShips: PlayerId[]
  pass: { actionText: string } | undefined
  canCancel: boolean
  text: string
}

export interface ChooseZonePrompt {
  type: 'ChooseZonePrompt'
  text: string
  allowableZones: Location[]
}

export interface PlaceShipPrompt {
  type: 'PlaceShipPrompt'
  newShips: ShipCard[]
  text: string
  allowableZones: Location[]
}

export interface ChooseShipCardPrompt {
  type: 'ChooseShipCardPrompt'
  ships: ShipCard[]
  text: string
  multiselect: { actionText: string } | undefined
}

export interface NoPrompt {
  type: 'NoPrompt'
  text: string
}

export type Prompt =
  | ChooseCardPrompt
  | ChooseShipPrompt
  | PlaceShipPrompt
  | ChooseZonePrompt
  | ChooseShipCardPrompt
  | NoPrompt

export interface UIPlayerState {
  ships: UIShip[]
  commandShip: UICommandShip
  isAlive: boolean
  hasAsteroids: boolean
  hasMinefield: boolean
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

export interface UILobbyState {
  type: 'UILobbyState'
  playerIds: string[]
}

export interface UIGameState {
  type: 'UIGameState'
  playerHand: ActionCard[]
  playerState: [PlayerId, UIPlayerState][]
  deckSize: number
  isActivePlayer: boolean
  eventLog: string[]
  prompt: Prompt
}

export interface ChooseCardAction {
  type: 'ChooseCardAction'
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

export interface CancelAction {
  type: 'CancelAction'
}

export type Action =
  | ChooseCardAction
  | ChooseShipAction
  | PassAction
  | ChooseZoneAction
  | CancelAction

export interface GameError {
  type:
    | 'GameAlreadyStartedCantAddNewPlayer'
    | 'GameNotFound'
    | 'TooManyPlayers'
    | 'TooFewPlayers'
}
