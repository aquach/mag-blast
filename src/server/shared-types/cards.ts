import {Location} from './base'

export type ActionCardType =
  | 'TemporalFluxCard'
  | 'StrategicAllocationCard'
  | 'CatastrophicDamageCard'
  | 'BoardingPartyCard'
  | 'ReinforcementsCard'
  | 'ConcussiveBlastCard'
  | 'EvasiveActionCard'
  | 'MinefieldCard'
  | 'FighterCard'
  | 'BridgeHitCard'
  | 'SpacedockCard'
  | 'RammingSpeedCard'
  | 'AsteroidsCard'
  | 'MagBlastCard'
  | 'BeamBlastCard'
  | 'LaserBlastCard'
  | 'BomberCard'
  | 'DirectHitCard'

export type CommandShipType =
  | 'OverseersOfKalgon'
  | 'TheGlorp'
  | 'AlphaMazons'
  | 'Freep'
  | 'Recyclonsv40K'
  | 'TriBot'
  | 'MheeYowMeex'
  | 'BZZGZZRT'
  | 'BrotherhoodOfPeace'
  | 'CraniumConsortium'

export type ShipClass =
  | 'Carrier'
  | 'Cruiser'
  | 'Destroyer'
  | 'Dreadnought'
  | 'Gunship'
  | 'Minesweeper'
  | 'Scout'
  | 'Unknown'

export interface ShipCard {
  type: 'ShipCard'
  name: string
  movement: number
  hp: number
  shipClass: ShipClass
  firesLasers: boolean
  firesBeams: boolean
  firesMags: boolean
}

export interface CommandShipCard {
  type: 'CommandShipCard'
  name: string
  commandType: CommandShipType
  hp: number
  text: string
  numAbilityActivations: number | undefined
}

export interface Resources {
  stars: number
  circles: number
  diamonds: number
}

export interface ActionCard {
  type: 'ActionCard'
  name: string
  cardType: ActionCardType
  damage: number
  resources: Resources
  text: string
  isBlast: boolean
  isSquadron: boolean
  isDirectHit: boolean
  isDirectHitEffect: boolean
  canRespondToBlast: boolean
  canRespondToSquadron: boolean
  canRespondToAnything: boolean
}

export interface UIPlayerState {
  ships: UIShip[]
  commandShip: UICommandShip
  isAlive: boolean
  hasAsteroids: boolean
  hasMinefield: boolean
  cardsInHand: number
}

export interface UIShip {
  location: Location
  shipType: ShipCard
  damage: number
  hasFiredThisTurn: boolean
}

export interface UICommandShip {
  damage: number
  shipType: CommandShipCard
  remainingAbilityActivations: number | undefined
}
