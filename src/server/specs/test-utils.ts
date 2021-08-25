import { actionCards, commandShipCards, shipCards } from '../cards'
import {
  ActionCard,
  ShipCard,
  EventLogEntry,
  CommandShipCard,
  ActionCardType,
  CommandShipType,
} from '../shared-types'
import { assert } from '../utils'

export function findOriginalActionCard(cardType: ActionCardType): ActionCard {
  const c = originalActionCards.find((c) => c.cardType === cardType)
  assert(c !== undefined, `No action card with type ${cardType} found.`)
  return c
}

export function findOriginalShipCard(name: string): ShipCard {
  const c = originalShipCards.find((c) => c.name === name)
  assert(c !== undefined, `No ship card with name ${name} found.`)
  return c
}

export function findOriginalCommandShipCard(
  cardType: CommandShipType
): CommandShipCard {
  const c = originalCommandShipCards.find((c) => c.commandType === cardType)
  assert(c !== undefined, `No command ship card with type ${cardType} found.`)
  return c
}

export function eventLogToText(es: EventLogEntry[]): string[] {
  return es.map((e) => {
    return e.tokens
      .map((t) => {
        switch (t.type) {
          case 'ShipEventLogToken':
            return t.shipType.name
          case 'TextEventLogToken':
            return t.text
          case 'PlayerEventLogToken':
            return t.player
          case 'ActionCardEventLogToken':
            return t.card.name
        }
      })
      .join('')
  })
}

export const originalActionCards = actionCards('Original')
export const originalShipCards = shipCards('Original')
export const originalCommandShipCards = commandShipCards('Original')
