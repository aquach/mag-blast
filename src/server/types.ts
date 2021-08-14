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
  asteroidsUntilBeginningOfPlayerTurn: PlayerId | undefined
  minefieldUntilBeginningOfPlayerTurn: PlayerId | undefined
}

export interface BlastPlayedDirectHitState {
  type: 'BlastPlayedDirectHitState'
  firingShip: Ship
  targetShip: Ship | CommandShip
}

export interface DirectHitPlayedDirectHitState {
  type: 'DirectHitPlayedDirectHitState'
  firingShip: Ship
  targetShip: Ship | CommandShip
}

export type DirectHitState =
  | undefined
  | BlastPlayedDirectHitState
  | DirectHitPlayedDirectHitState

export interface GameState {
  type: 'GameState'

  actionDeck: ActionCard[]
  actionDiscardDeck: ActionCard[]

  shipDeck: ShipCard[]
  shipDiscardDeck: ShipCard[]

  playerState: Map<PlayerId, PlayerState>
  activePlayer: string
  directHitStateMachine: DirectHitState
  turnState: TurnState
  playerTurnOrder: PlayerId[]

  turnNumber: number
  eventLog: string[]

  getPlayerState(playerId: string): PlayerState
}

export interface ChooseStartingShipsState {
  type: 'ChooseStartingShipsState'
  dealtShipCards: Map<PlayerId, ShipCard[]>
  chosenShipCards: Map<PlayerId, ShipCard[]>
}

export interface PlaceStartingShipsState {
  type: 'PlaceStartingShipsState'
  chosenShipCards: Map<PlayerId, ShipCard[]>
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

export interface AttackPlaceShipState {
  type: 'AttackPlaceShipState'
  newShip: ShipCard
}

export interface AttackPlaceStolenShipState {
  type: 'AttackPlaceStolenShipState'
  stolenShip: Ship
}

export interface AttackChooseAsteroidsPlayerTurnState {
  type: 'AttackChooseAsteroidsPlayerTurnState'
}

export interface AttackChooseMinefieldPlayerTurnState {
  type: 'AttackChooseMinefieldPlayerTurnState'
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
  | ChooseStartingShipsState
  | PlaceStartingShipsState
  | DiscardTurnState
  | ReinforceTurnState
  | ReinforcePlaceShipState
  | ManeuverTurnState
  | ManeuverChooseTargetZoneState
  | AttackTurnState
  | AttackPlaceShipState
  | AttackPlaceStolenShipState
  | AttackChooseAsteroidsPlayerTurnState
  | AttackChooseMinefieldPlayerTurnState
  | PlayBlastChooseTargetShipState
  | PlayBlastChooseFiringShipState
  | PlayBlastChooseTargetShipState
  | PlayBlastRespondState
  | EndGameState
