import { PlayerId, Location } from './base'
import { ShipCard } from './cards'

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
  player: PlayerId
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

export interface ChoicePrompt {
  type: 'ChoicePrompt'
  text: string
  choices: string[]
  canCancel: boolean
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
  | ChoicePrompt
  | NoPrompt

export interface CommandShipAbilityPrompt {
  type: 'CommandShipAbilityPrompt'
}

export interface MinesweeperAbilityPrompt {
  type: 'MinesweeperAbilityPrompt'
}
