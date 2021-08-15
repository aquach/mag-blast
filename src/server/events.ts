import * as _ from 'lodash'
import { actionCards, shipCards } from './cards'
import {
  EventLogEntry,
  EventLogToken,
  PlayerEventLogToken,
  PlayerId,
  TextEventLogToken,
} from './shared-types'
import { GameState } from './types'
import { ascribe, assert, uniqueGroupBy } from './utils'

export type RawEventLog = [TemplateStringsArray, unknown[]]

export function event(
  constants: TemplateStringsArray,
  ...tokens: unknown[]
): RawEventLog {
  return [constants, tokens]
}

export function p(p: PlayerId): PlayerEventLogToken {
  return {
    type: 'PlayerEventLogToken',
    player: p,
  }
}

const actionCardsByName = uniqueGroupBy(actionCards, (c) => c.name)
const shipsByName = uniqueGroupBy(shipCards, (c) => c.name)

export function parseEventLog(game: GameState, r: RawEventLog): EventLogEntry {
  const constants = r[0].map((s) =>
    ascribe<TextEventLogToken>({ type: 'TextEventLogToken', text: s })
  )
  const tokens: EventLogToken[] = r[1].map((t) => {
    if (
      typeof t === 'object' &&
      t !== null &&
      (t as any).type === 'PlayerEventLogToken'
    ) {
      return t as PlayerEventLogToken
    }

    assert(
      typeof t === 'string' || typeof t === 'number',
      `Don't know how to handle a ${t} of type ${typeof t}.`
    )

    const s = t.toString()

    if (actionCardsByName[s]) {
      return {
        type: 'ActionCardEventLogToken',
        card: actionCardsByName[s],
      }
    } else if (shipsByName[s]) {
      return {
        type: 'ShipEventLogToken',
        shipType: shipsByName[s],
      }
    } else {
      return {
        type: 'TextEventLogToken',
        text: s,
      }
    }
  })

  const firstConstant = constants.shift()!

  const zipped = _.zip(tokens, constants) as [
    EventLogToken,
    TextEventLogToken
  ][]
  return { tokens: [firstConstant, ..._.flatten(zipped)] }
}
