import {Location, PlayerId} from "./src/server/shared-types"

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
  | AttackTurnState
  | PlayBlastChooseTargetShipState
  | PlayBlastChooseFiringShipState
  | PlayBlastChooseTargetShipState
  | PlayBlastRespondState

export interface GameState {
  actionDeck: ActionCard[]
  shipDeck: ShipCard[]
  playerState: Map<PlayerId, PlayerState>
  activePlayer: string
  turnState: TurnState
  eventLog: string[]
}

