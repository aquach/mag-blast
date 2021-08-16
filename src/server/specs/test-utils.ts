import { actionCards, shipCards } from '../cards'
import { ActionCard, ShipCard, EventLogEntry } from '../shared-types'
import { assert } from '../utils'

export function findActionCard(cardType: string): ActionCard {
  const c = actionCards.find((c) => c.cardType === cardType)
  assert(c !== undefined)
  return c
}

export function findShipCard(name: string): ShipCard {
  const c = shipCards.find((c) => c.name === name)
  assert(c !== undefined)
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
