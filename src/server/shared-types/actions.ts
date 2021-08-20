import { PlayerId, Location } from './base'

export interface ChooseCardAction {
  type: 'ChooseCardAction'
  handIndex: number | number[]
}

export interface ChooseShipAction {
  type: 'ChooseShipAction'
  choice: [PlayerId, number] | PlayerId
}

export interface ChooseZoneAction {
  type: 'ChooseZoneAction'
  location: Location
}

export interface PassAction {
  type: 'PassAction'
}

export interface CancelAction {
  type: 'CancelAction'
}

export interface ActivateCommandShipAbilityAction {
  type: 'ActivateCommandShipAbilityAction'
}

export type Action =
  | ChooseCardAction
  | ChooseShipAction
  | PassAction
  | ChooseZoneAction
  | ActivateCommandShipAbilityAction
  | CancelAction

export interface ActionError {
  type: 'ActionError'
  message: string
  time: number
}
