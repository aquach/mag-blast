import * as _ from 'lodash'
import { BlastCard, ShipCard, GameState } from './types'

import {
  ChooseShipPrompt,
  SelectCardPrompt,
  PlayerId,
  Prompt,
  UIState,
  PlaceShipPrompt,
} from './shared-types'
import { ascribe, assert, filterIndices, mapToObject, mapValues } from './utils'

const laser: BlastCard = {
  type: 'BlastCard',
  name: 'Laser Blast',
  damage: 1,
  resources: {
    hasStar: true,
    hasCircle: true,
    hasDiamond: true,
  },
}

const dink: ShipCard = {
  type: 'ShipCard',
  name: 'Dink',
  movement: 2,
  hp: 1,
}

export function newGameState(): GameState {
  return {
    actionDeck: [laser, laser, laser, laser],
    actionDiscardDeck: [],

    shipDeck: [],
    shipDiscardDeck: [],

    playerState: new Map([
      [
        '#1',
        {
          hand: [laser],
          ships: [{ location: 'n', shipType: dink, damage: 0 }],
        },
      ],
      [
        '#2',
        { hand: [], ships: [{ location: 'n', shipType: dink, damage: 0 }] },
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
          })

        case 'PlayBlastChooseTargetShipState':
          return ascribe<ChooseShipPrompt>({
            type: 'ChooseShipPrompt',
            text: 'Choose a target ship.',
            allowableShipIndices: filterIndices(
              state.playerState.get('#2')!.ships, // TODO
              () => true
            ).map((i) => ascribe<[string, number]>(['#2', i])), // TODO
          })
      }
    } else if (state.turnState.type === 'PlayBlastRespondState') {
      const turnState = state.turnState
      if (playerState.ships.includes(turnState.targetShip)) {
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
      mapValues(state.playerState, (s) => ({ ships: s.ships }))
    ),
    deckSize: state.actionDeck.length,
    isActivePlayer: state.activePlayer === playerId,
    eventLog: state.eventLog,
    prompt,
  }
}
