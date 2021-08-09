import * as _ from 'lodash'
import { BlastCard, ShipCard, GameState } from './types'

import {
  ChooseShipPrompt,
  PlayCardPrompt,
  PlayerId,
  Prompt,
  UIState,
} from './shared-types'
import { ascribe, filterIndices, mapToObject, mapValues } from './utils'

const laser: BlastCard = {
  type: 'BlastCard',
  name: 'Laser Blast',
  damage: 1,
}

const dink: ShipCard = {
  type: 'ShipCard',
  name: 'Dink',
  movement: 2,
  hp: 1,
}

export function newGameState(): GameState {
  return {
    activePlayer: '#1',
    actionDeck: [laser, laser, laser, laser],
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
    turnState: { type: 'AttackTurnState' },
    eventLog: [],
  }
}

export function uiState(playerId: PlayerId, state: GameState): UIState {
  const playerState = state.playerState.get(playerId)

  if (playerState === undefined) {
    throw new Error(`Player ID ${playerId} not found.`)
  }

  const prompt: Prompt | undefined = (() => {
    if (state.activePlayer === playerId) {
      switch (state.turnState.type) {
        case 'AttackTurnState': {
          const playableCardIndices = filterIndices(playerState.hand, (c) => {
            switch (c.type) {
              case 'BlastCard':
                // TODO
                return true
            }
          })

          return ascribe<PlayCardPrompt>({
            type: 'PlayCardPrompt',
            playableCardIndices,
            text: 'Choose a card to play.',
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
      if (playerState.ships.some((s) => s === turnState.targetShip)) {
        const playableCardIndices = filterIndices(playerState.hand, (c) => {
          switch (c.type) {
            case 'BlastCard':
              // TODO
              return true
          }
        })

        return ascribe<PlayCardPrompt>({
          type: 'PlayCardPrompt',
          text: 'Choose a card to play in response.',
          playableCardIndices,
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
