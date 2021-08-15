import * as _ from 'lodash'
import * as parse from 'csv-parse/lib/sync'
import * as fs from 'fs'
import { ActionCard, CommandShipCard, ShipCard } from './shared-types'
import { COMMAND_SHIP_HP } from './constants'

interface ShipCSVRow {
  Type: string
  'Fires L': string
  'Fires B': string
  'Fires M': string
  Movement: number
  Name: string
  HP: number
}

const shipCSVRows: ShipCSVRow[] = parse(
  fs.readFileSync('cards/ships.csv', 'utf-8'),
  {
    skipEmptyLines: true,
    skipLinesWithEmptyValues: true,
    columns: true,
    cast: true,
  }
)

export const shipCards: ShipCard[] = shipCSVRows.map((row) => ({
  type: 'ShipCard',
  name: row.Name,
  movement: row.Movement,
  hp: row.HP,
  shipClass: row.Type,
  firesLasers: row['Fires L'] === 'TRUE',
  firesBeams: row['Fires B'] === 'TRUE',
  firesMags: row['Fires M'] === 'TRUE',
}))

interface ActionCSVRow {
  Name: string
  Type: string
  'Num No Resources': number
  'Resource Variants': string
  Damage: number
  'Is Blast': string
  'Is Squadron': string
  'Is Direct Hit': string
  'Is Direct Hit Effect': string
  'Can Respond To Blast': string
  'Can Respond To Squadron': string
}

const actionCSVRows: ActionCSVRow[] = parse(
  fs.readFileSync('cards/actions.csv', 'utf-8'),
  {
    skipEmptyLines: true,
    skipLinesWithEmptyValues: true,
    columns: true,
    cast: true,
  }
)

export const actionCards: ActionCard[] = actionCSVRows.flatMap((row) => {
  const card = {
    type: 'ActionCard',
    name: row.Name,
    cardType: row.Type,
    damage: row.Damage,
    isBlast: row['Is Blast'] === 'TRUE',
    isSquadron: row['Is Squadron'] === 'TRUE',
    isDirectHit: row['Is Direct Hit'] === 'TRUE',
    isDirectHitEffect: row['Is Direct Hit Effect'] === 'TRUE',
    canRespondToBlast: row['Can Respond To Blast'] === 'TRUE',
    canRespondToSquadron: row['Can Respond To Squadron'] === 'TRUE',
  }

  const noResources = { stars: 0, diamonds: 0, circles: 0 }

  const variants =
    row['Resource Variants'].length > 0
      ? row['Resource Variants'].split(',').map((variant) => {
          const grouped = _.groupBy(variant.split(''))
          return {
            stars: grouped['S']?.length ?? 0,
            diamonds: grouped['D']?.length ?? 0,
            circles: grouped['C']?.length ?? 0,
          }
        })
      : []

  return [
    ...Array(row['Num No Resources']).fill({ ...card, resources: noResources }),
    ...variants.map((resources) => ({ ...card, resources })),
  ]
})

interface CommandShipCSVRow {
  Name: string
  Type: string
  Text: string
}

const commandShipCSVRows: CommandShipCSVRow[] = parse(
  fs.readFileSync('cards/command-ships.csv', 'utf-8'),
  {
    skipEmptyLines: true,
    skipLinesWithEmptyValues: true,
    columns: true,
    cast: true,
  }
)

export const commandShipCards: CommandShipCard[] = commandShipCSVRows.map(
  (row) => ({
    type: 'CommandShipCard',
    name: row.Name,
    commandType: row.Type,
    text: row.Text,
    hp: COMMAND_SHIP_HP,
  })
)
