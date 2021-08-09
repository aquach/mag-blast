import { Location, PlayerId } from './shared-types'

export interface BlastCard {
  type: 'BlastCard'
  name: string
  damage: number
}

export interface ShipCard {
  type: 'ShipCard'
  name: string
  movement: number
  hp: number
}

export type ActionCard = BlastCard

export interface Ship {
  location: Location
  shipType: ShipCard
  damage: number
}

export interface PlayerState {
  hand: ActionCard[]
  ships: Ship[]
}

export interface GameState {
  actionDeck: ActionCard[]
  shipDeck: ShipCard[]

  playerState: Map<PlayerId, PlayerState>
  activePlayer: string
  turnState: TurnState
  playerTurnOrder: PlayerId[]

  eventLog: string[]
}

export interface DiscardTurnState {
  type: 'DiscardTurnState'
}

export interface ReinforceTurnState {
  type: 'ReinforceTurnState'
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
  targetShip: Ship
}

export type TurnState =
  | DiscardTurnState
  | ReinforceTurnState
  | ManeuverTurnState
  | AttackTurnState
  | PlayBlastChooseTargetShipState
  | PlayBlastChooseFiringShipState
  | PlayBlastChooseTargetShipState
  | PlayBlastRespondState
