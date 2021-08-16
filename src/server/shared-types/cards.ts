import { Location } from './base'

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
