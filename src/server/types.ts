import { CommandShipCard, Location, PlayerId, ShipCard } from './shared-types'

export const DRAW_UP_TO_HAND_SIZE = 5
export const MAX_ZONE_SHIPS = 3

export interface Resources {
  hasStar: boolean
  hasCircle: boolean
  hasDiamond: boolean
}

export type BlastCardType = 'Laser' | 'Beam' | 'Mag'

export interface BlastCard {
  type: 'BlastCard'
  name: string
  damage: number
  blastType: BlastCardType
  resources: Resources
}

export type ActionCard = BlastCard

export interface Ship {
  type: 'Ship'
  location: Location
  shipType: ShipCard
  damage: number
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
  alive: boolean
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
}

export interface AttackTurnState {
  type: 'AttackTurnState'
}

export interface PlayBlastChooseFiringShipState {
  type: 'PlayBlastChooseFiringShipState'
  blast: BlastCard
}

export interface PlayBlastChooseTargetShipState {
  type: 'PlayBlastChooseTargetShipState'
  blast: BlastCard
  firingShip: Ship
}

export interface PlayBlastRespondState {
  type: 'PlayBlastRespondState'
  blast: BlastCard
  firingShip: Ship
  targetShip: Ship | CommandShip
}

export type TurnState =
  | DiscardTurnState
  | ReinforceTurnState
  | ReinforcePlaceShipState
  | ManeuverTurnState
  | AttackTurnState
  | PlayBlastChooseTargetShipState
  | PlayBlastChooseFiringShipState
  | PlayBlastChooseTargetShipState
  | PlayBlastRespondState