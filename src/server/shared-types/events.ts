import { PlayerId } from './base'
import { ShipCard, CommandShipCard, ActionCard } from './cards'

export interface PlayerEventLogToken {
  type: 'PlayerEventLogToken'
  player: PlayerId
}

export interface ShipEventLogToken {
  type: 'ShipEventLogToken'
  shipType: ShipCard
}

export interface CommandShipEventLogToken {
  type: 'CommandShipEventLogToken'
  commandShipType: CommandShipCard
}

export interface ActionCardEventLogToken {
  type: 'ActionCardEventLogToken'
  card: ActionCard
}

export interface TextEventLogToken {
  type: 'TextEventLogToken'
  text: string
  bold: boolean
}

export type EventLogToken =
  | PlayerEventLogToken
  | ShipEventLogToken
  | CommandShipEventLogToken
  | ActionCardEventLogToken
  | TextEventLogToken

export interface EventLogEntry {
  tokens: EventLogToken[]
}
