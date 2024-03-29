import { RawEventLog } from './events'
import {
  ActionCard,
  ActionError,
  AttackMode,
  CommandShipCard,
  EventLogEntry,
  GameFlavor,
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
  blastDamageHistory: number[]
}

export interface CommandShip {
  type: 'CommandShip'
  shipType: CommandShipCard
  damage: number
  temporaryDamage: number
  remainingAbilityActivations: number | undefined
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
  canBlastAgain: boolean
}

export type DirectHitState =
  | undefined
  | BlastPlayedDirectHitState
  | DirectHitPlayedDirectHitState

export interface GameSettings {
  startingHandSize: number
  gameFlavor: GameFlavor
  attackMode: AttackMode
}

export interface GameState {
  type: 'GameState'

  actionCards: ActionCard[]
  shipCards: ShipCard[]
  commandShipCards: CommandShipCard[]

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

  lastError: ActionError | undefined
  erroringPlayer: PlayerId | undefined
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
  skipDraw: boolean
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
  card: ActionCard
}

export interface AttackChooseMinefieldPlayerTurnState {
  type: 'AttackChooseMinefieldPlayerTurnState'
  card: ActionCard
}

export interface AttackChooseMinesweeperState {
  type: 'AttackChooseMinesweeperState'
}

export interface AttackChoosePlayerToMinesweepState {
  type: 'AttackChoosePlayerToMinesweepState'
  minesweeper: Ship
}

export interface AttackChooseAsteroidOrMinefieldToSweepState {
  type: 'AttackChooseAsteroidOrMinefieldToSweepState'
  resolveAsteroids: () => void
  resolveMinefield: () => void
}

export interface AttackChooseSpacedockShipState {
  type: 'AttackChooseSpacedockShipState'
  card: ActionCard
}

export interface AttackDiscardCardState {
  type: 'AttackDiscardCardState'
  onResolve: () => void
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
  resolveBlast(): boolean
}

export interface PlaySquadronChooseTargetShipState {
  type: 'PlaySquadronChooseTargetShipState'
  squadron: ActionCard
}

export interface PlaySquadronRespondState {
  type: 'PlaySquadronRespondState'
  squadron: ActionCard
  targetShip: Ship | CommandShip
  resolveSquadron(): boolean
}

export interface PlayActionRespondState {
  type: 'PlayActionRespondState'
  playingPlayer: PlayerId
  respondingPlayers: PlayerId[]
  resolveAction(): boolean
  counterAction(): boolean
}

export interface FreepChoosePlayerToStealCardsState {
  type: 'FreepChoosePlayerToStealCardsState'
  originalState: ManeuverTurnState
}

export interface CraniumConsortiumChooseResourcesToDiscardState {
  type: 'CraniumConsortiumChooseResourcesToDiscardState'
  respondingPlayer: PlayerId
}

export interface BrotherhoodChooseShipToTransferFromState {
  type: 'BrotherhoodChooseShipToTransferFromState'
}

export interface BrotherhoodChooseShipToTransferToState {
  type: 'BrotherhoodChooseShipToTransferToState'
  fromShip: Ship
}

export interface MheeChooseShipState {
  type: 'MheeChooseShipState'
  ships: ShipCard[]
  nextState: (_: ShipCard) => TurnState
}

export interface OverseersChooseBlastsState {
  type: 'OverseersChooseBlastsState'
}

export interface TribotReinforceTurnState {
  type: 'TribotReinforceTurnState'
}

export interface TribotChooseShipState {
  type: 'TribotChooseShipState'
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
  | AttackChooseSpacedockShipState
  | AttackChooseMinesweeperState
  | AttackChoosePlayerToMinesweepState
  | AttackChooseAsteroidOrMinefieldToSweepState
  | AttackDiscardCardState
  | PlayBlastChooseTargetShipState
  | PlayBlastChooseFiringShipState
  | PlayBlastChooseTargetShipState
  | PlayBlastRespondState
  | PlaySquadronChooseTargetShipState
  | PlaySquadronRespondState
  | PlayActionRespondState
  | FreepChoosePlayerToStealCardsState
  | CraniumConsortiumChooseResourcesToDiscardState
  | BrotherhoodChooseShipToTransferFromState
  | BrotherhoodChooseShipToTransferToState
  | MheeChooseShipState
  | OverseersChooseBlastsState
  | TribotReinforceTurnState
  | TribotChooseShipState
  | EndGameState
