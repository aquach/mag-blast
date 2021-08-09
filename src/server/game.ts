import * as _ from 'lodash'
import { BlastCard, ShipCard, GameState } from './types'

import {
  ChooseShipPrompt,
  SelectCardPrompt,
  PlayerId,
  Prompt,
  UIState,
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
            mode: 'Multiple',
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
            mode: 'SingleWithPass',
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
          mode: 'SingleWithPass',
        })
      }
    }
  })()

  return {
    playerHand: playerState.hand.map((c) => ({
      name: c.name,
      damage: c.type === 'BlastCard' ? c.damage : undefined,
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
