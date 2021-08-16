import { RawEventLog } from './events'
import {
  ActionCard,
  CommandShipCard,
  EventLogEntry,
  Location,
  PlayerId,
  ShipCard,
} from './shared-types'

export interface Ship {
  type: 'Ship'
  location: Location
  shipType: ShipCard
  damage: number
  temporaryDamage: number
  hasFiredThisTurn: boolean
}

export interface CommandShip {
  type: 'CommandShip'
  shipType: CommandShipCard
  damage: number
  temporaryDamage: number
}

export interface PlayerState {
  hand: ActionCard[]
  usedSquadronCards: ActionCard[]
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

export interface GameSettings {
  startingHandSize: number
}

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
  eventLog: EventLogEntry[]

  gameSettings: GameSettings

  getPlayerState(playerId: string): PlayerState
  pushEventLog(r: RawEventLog): void
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

export interface AttackPlaceConcussiveBlastedShipsState {
  type: 'AttackPlaceConcussiveBlastedShipsState'
  ships: Ship[]
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

export interface PlaySquadronChooseTargetShipState {
  type: 'PlaySquadronChooseTargetShipState'
  squadron: ActionCard
}

export interface PlaySquadronRespondState {
  type: 'PlaySquadronRespondState'
  squadron: ActionCard
  targetShip: Ship | CommandShip
}

export interface PlayActionRespondState {
  type: 'PlayActionRespondState'
  card: ActionCard
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
  | AttackPlaceConcussiveBlastedShipsState
  | AttackChooseAsteroidsPlayerTurnState
  | AttackChooseMinefieldPlayerTurnState
  | PlayBlastChooseTargetShipState
  | PlayBlastChooseFiringShipState
  | PlayBlastChooseTargetShipState
  | PlayBlastRespondState
  | PlaySquadronChooseTargetShipState
  | PlaySquadronRespondState
  | PlayActionRespondState
  | EndGameState
