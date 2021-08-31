import * as parse from 'csv-parse/lib/sync'
import * as fs from 'fs'
import * as _ from 'lodash'
import { COMMAND_SHIP_HP, COMMAND_SHIP_REBALANCED_HP } from './constants'
import {
  ActionCard,
  ActionCardType,
  CommandShipCard,
  CommandShipType,
  GameFlavor,
  ShipCard,
  ShipClass,
} from './shared-types'

interface ShipCSVRow {
  Type: ShipClass
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

export function shipCards(gameFlavor: GameFlavor): ShipCard[] {
  return shipCSVRows.map((row) => ({
    type: 'ShipCard',
    name: row.Name,
    movement: row.Movement,
    hp: row.HP,
    shipClass: row.Type,
    firesLasers: row['Fires L'] === 'TRUE',
    firesBeams: row['Fires B'] === 'TRUE',
    firesMags: row['Fires M'] === 'TRUE',
  }))
}

interface ActionCSVRow {
  Name: string
  Type: ActionCardType
  'Num No Resources': number
  'Resource Variants': string
  Damage: number
  'Is Blast': string
  'Is Squadron': string
  'Is Direct Hit': string
  'Is Direct Hit Effect': string
  'Can Respond To Blast': string
  'Can Respond To Squadron': string
  'Can Respond To Anything': string
  Text: string
  'Rebalanced Text': string
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

export function actionCards(gameFlavor: GameFlavor): ActionCard[] {
  return actionCSVRows.flatMap((row) => {
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
      canRespondToAnything: row['Can Respond To Anything'] === 'TRUE',
      text:
        gameFlavor === 'Rebalanced' && row['Rebalanced Text'] !== ''
          ? row['Rebalanced Text']
          : row['Text'],
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
      ...Array(row['Num No Resources']).fill({
        ...card,
        resources: noResources,
      }),
      ...variants.map((resources) => ({ ...card, resources })),
    ]
  })
}

interface CommandShipCSVRow {
  Name: string
  Type: CommandShipType
  'Num Activations': number | ''
  Text: string
  'Rebalanced Text': string
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

export function commandShipCards(gameFlavor: GameFlavor): CommandShipCard[] {
  return commandShipCSVRows.map((row) => ({
    type: 'CommandShipCard',
    name: row.Name,
    commandType: row.Type,
    text: row.Text,
    rebalancedText:
      gameFlavor === 'Rebalanced' && row['Rebalanced Text'] !== ''
        ? row['Rebalanced Text']
        : row.Text,
    numAbilityActivations:
      row['Num Activations'] === '' ? undefined : row['Num Activations'],
    hp:
      gameFlavor === 'Rebalanced'
        ? COMMAND_SHIP_REBALANCED_HP
        : COMMAND_SHIP_HP,
  }))
}
