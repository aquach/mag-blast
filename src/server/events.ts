import * as _ from 'lodash'
import { actionCards, commandShipCards, shipCards } from './cards'
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

export function bold(t: string): TextEventLogToken {
  return {
    type: 'TextEventLogToken',
    text: t,
    bold: true,
  }
}

const actionCardsByName = uniqueGroupBy(actionCards, (c) => c.name)
const shipsByName = uniqueGroupBy(shipCards, (c) => c.name)
const commandShipsByName = uniqueGroupBy(commandShipCards, (c) => c.name)

export function parseEventLog(game: GameState, r: RawEventLog): EventLogEntry {
  const constants = r[0].map((s) =>
    ascribe<TextEventLogToken>({
      type: 'TextEventLogToken',
      text: s,
      bold: false,
    })
  )

  const tokens: EventLogToken[] = r[1].map((t) => {
    if (
      typeof t === 'object' &&
      t !== null &&
      (t as any).type === 'PlayerEventLogToken'
    ) {
      return t as PlayerEventLogToken
    }

    if (
      typeof t === 'object' &&
      t !== null &&
      (t as any).type === 'TextEventLogToken'
    ) {
      return t as TextEventLogToken
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
    } else if (commandShipsByName[s]) {
      return {
        type: 'CommandShipEventLogToken',
        commandShipType: commandShipsByName[s],
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
        bold: false,
      }
    }
  })

  const firstConstant = constants.shift()!

  const zipped = _.zip(tokens, constants) as [
    EventLogToken,
    TextEventLogToken
  ][]
  const allTokens = [firstConstant, ..._.flatten(zipped)]
  return {
    tokens: allTokens.filter(
      (t) => !(t.type === 'TextEventLogToken' && t.text.length === 0)
    ),
  }
}
