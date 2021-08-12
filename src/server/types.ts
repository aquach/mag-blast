import {
  ActionCard,
  CommandShipCard,
  Location,
  PlayerId,
  ShipCard,
} from './shared-types'

export const DRAW_UP_TO_HAND_SIZE = 5
export const MAX_ZONE_SHIPS = 3

export interface Ship {
  type: 'Ship'
  location: Location
  shipType: ShipCard
  damage: number
  hasFiredThisTurn: boolean
}

export interface CommandShip {
  type: 'CommandShip'
  shipType: CommandShipCard
  damage: number
}

export interface PlayerState {
  hand: ActionCard[]
  ships: Ship[]
  commandShip: CommandShip
  isAlive: boolean
}

export interface GameState {
  actionDeck: ActionCard[]
  actionDiscardDeck: ActionCard[]

  shipDeck: ShipCard[]
  shipDiscardDeck: ShipCard[]

  playerState: Map<PlayerId, PlayerState>
  activePlayer: string
  turnState: TurnState
  playerTurnOrder: PlayerId[]

  turnNumber: number
  eventLog: string[]
}

export interface DiscardTurnState {
  type: 'DiscardTurnState'
}

export interface ReinforceTurnState {
  type: 'ReinforceTurnState'
}

export interface ReinforcePlaceShipState {
  type: 'ReinforcePlaceShipState'
  newShip: ShipCard
}

export interface ManeuverTurnState {
  type: 'ManeuverTurnState'
  originalLocations: Map<Ship, Location>
}

export interface ManeuverChooseTargetZoneState {
  type: 'ManeuverChooseTargetZoneState'
  originalLocations: Map<Ship, Location>
  ship: Ship
}

export interface AttackTurnState {
  type: 'AttackTurnState'
}

export interface PlayBlastChooseFiringShipState {
  type: 'PlayBlastChooseFiringShipState'
  blast: ActionCard
}

export interface PlayBlastChooseTargetShipState {
  type: 'PlayBlastChooseTargetShipState'
  blast: ActionCard
  firingShip: Ship
}

export interface PlayBlastRespondState {
  type: 'PlayBlastRespondState'
  blast: ActionCard
  firingShip: Ship
  targetShip: Ship | CommandShip
}

export interface EndGameState {
  type: 'EndGameState'
}

export type TurnState =
  | DiscardTurnState
  | ReinforceTurnState
  | ReinforcePlaceShipState
  | ManeuverTurnState
  | ManeuverChooseTargetZoneState
  | AttackTurnState
  | PlayBlastChooseTargetShipState
  | PlayBlastChooseFiringShipState
  | PlayBlastChooseTargetShipState
  | PlayBlastRespondState
  | EndGameState
