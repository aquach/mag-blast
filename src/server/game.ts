import * as _ from 'lodash'
import * as parse from 'csv-parse/lib/sync'
import * as fs from 'fs'
import {
  ChooseShipPrompt,
  CommandShipCard,
  PlaceShipPrompt,
  PlayerId,
  Prompt,
  SelectCardPrompt,
  ShipCard,
  UIState,
} from './shared-types'
import { BlastCard, GameState } from './types'
import { ascribe, assert, filterIndices, mapToObject, mapValues } from './utils'

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

const shipCards: ShipCard[] = shipCSVRows.map((row) => ({
  type: 'ShipCard',
  name: row.Name,
  movement: row.Movement,
  hp: row.HP,
  shipClass: row.Type,
  firesLasers: row['Fires L'] === 'TRUE',
  firesBeams: row['Fires B'] === 'TRUE',
  firesMags: row['Fires M'] === 'TRUE',
}))

const laser: BlastCard = {
  type: 'BlastCard',
  name: 'Laser Blast',
  damage: 1,
  blastType: 'Laser',
  resources: {
    hasStar: true,
    hasCircle: true,
    hasDiamond: true,
  },
}

const beam: BlastCard = {
  type: 'BlastCard',
  name: 'Beam Blast',
  damage: 3,
  blastType: 'Beam',
  resources: {
    hasStar: false,
    hasCircle: false,
    hasDiamond: true,
  },
}

const commandShip: CommandShipCard = {
  type: 'CommandShipCard',
  name: 'The Glorp',
  hp: 8,
}

export function newGameState(): GameState {
  return {
    actionDeck: [beam, beam, laser, laser],
    actionDiscardDeck: [],

    shipDeck: _.shuffle(shipCards),
    shipDiscardDeck: [],

    playerState: new Map([
      [
        '#1',
        {
          hand: [laser],
          ships: [
            { type: 'Ship', location: 'n', shipType: shipCards[0], damage: 0 },
            { type: 'Ship', location: 'e', shipType: shipCards[0], damage: 0 },
            { type: 'Ship', location: 's', shipType: shipCards[0], damage: 0 },
            { type: 'Ship', location: 'w', shipType: shipCards[0], damage: 0 },
            { type: 'Ship', location: 'n', shipType: shipCards[0], damage: 0 },
            { type: 'Ship', location: 'e', shipType: shipCards[0], damage: 0 },
            { type: 'Ship', location: 's', shipType: shipCards[0], damage: 0 },
            { type: 'Ship', location: 'w', shipType: shipCards[0], damage: 0 },
          ],
          commandShip: {
            type: 'CommandShip',
            shipType: commandShip,
            damage: 0,
          },
          alive: true,
        },
      ],
      [
        '#2',
        {
          hand: [],
          ships: [
            { type: 'Ship', location: 'n', shipType: shipCards[0], damage: 0 },
          ],
          commandShip: {
            type: 'CommandShip',
            shipType: commandShip,
            damage: 0,
          },
          alive: true,
        },
      ],
    ]),
    activePlayer: '#1',
    turnState: { type: 'DiscardTurnState' },
    playerTurnOrder: ['#1', '#2'],

    turnNumber: 1,
    eventLog: [],
  }
}

export function uiState(playerId: PlayerId, state: GameState): UIState {
  const playerState = state.playerState.get(playerId)
  assert(playerState !== undefined, `Player ID ${playerId} not found.`)

  const prompt: Prompt | undefined = (() => {
    if (state.activePlayer === playerId) {
      switch (state.turnState.type) {
        case 'DiscardTurnState': {
          return ascribe<SelectCardPrompt>({
            type: 'SelectCardPrompt',
            selectableCardIndices: filterIndices(playerState.hand, () => true),
            text: 'Choose cards to discard.',
            canPass: false,
            multiselect: true,
          })
        }

        case 'ReinforceTurnState': {
          return ascribe<SelectCardPrompt>({
            type: 'SelectCardPrompt',
            selectableCardIndices: filterIndices(
              playerState.hand,
              (c) =>
                c.resources.hasDiamond ||
                c.resources.hasCircle ||
                c.resources.hasStar
            ),
            text: 'Choose cards to use for reinforcements.',
            multiselect: true,
            canPass: true,
          })
        }

        case 'ReinforcePlaceShipState': {
          return ascribe<PlaceShipPrompt>({
            type: 'PlaceShipPrompt',
            newShip: state.turnState.newShip,
            text: `Choose a zone to place your new ${state.turnState.newShip.name}.`,
          })
        }

        case 'AttackTurnState': {
          const playableCardIndices = filterIndices(playerState.hand, (c) => {
            switch (c.type) {
              case 'BlastCard':
                // TODO
                return true
            }
          })

          return ascribe<SelectCardPrompt>({
            type: 'SelectCardPrompt',
            selectableCardIndices: playableCardIndices,
            text: 'Choose a card to play.',
            multiselect: false,
            canPass: true,
          })
        }

        case 'PlayBlastChooseFiringShipState':
          return ascribe<ChooseShipPrompt>({
            type: 'ChooseShipPrompt',
            text: `Choose a ship to fire a ${state.turnState.blast.name} from.`,
            allowableShipIndices: filterIndices(
              playerState.ships,
              () => true
            ).map((i) => ascribe<[string, number]>([playerId, i])), // TODO
            allowableCommandShips: [],
          })

        case 'PlayBlastChooseTargetShipState':
          return ascribe<ChooseShipPrompt>({
            type: 'ChooseShipPrompt',
            text: 'Choose a target ship.',
            allowableShipIndices: filterIndices(
              state.playerState.get('#2')!.ships, // TODO
              () => true
            ).map((i) => ascribe<[string, number]>(['#2', i])), // TODO
            allowableCommandShips: [], //  TODO
          })
      }
    } else if (state.turnState.type === 'PlayBlastRespondState') {
      const targetShip = state.turnState.targetShip
      if (
        (targetShip.type === 'Ship' &&
          playerState.ships.includes(targetShip)) ||
        playerState.commandShip === targetShip
      ) {
        const playableCardIndices = filterIndices(playerState.hand, (c) => {
          switch (c.type) {
            case 'BlastCard':
              // TODO
              return true
          }
        })

        return ascribe<SelectCardPrompt>({
          type: 'SelectCardPrompt',
          text: 'Choose a card to play in response.',
          selectableCardIndices: playableCardIndices,
          multiselect: false,
          canPass: true,
        })
      }
    }
  })()

  return {
    playerHand: playerState.hand.map((c) => ({
      name: c.name,
      damage: c.type === 'BlastCard' ? c.damage : undefined,
      resources: c.resources,
      text: undefined, // TODO
    })),
    playerState: mapToObject(
      mapValues(state.playerState, (s) => ({
        ships: s.ships,
        commandShip: s.commandShip,
      }))
    ),
    deckSize: state.actionDeck.length,
    isActivePlayer: state.activePlayer === playerId,
    eventLog: state.eventLog,
    prompt,
  }
}
