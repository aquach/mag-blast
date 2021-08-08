import * as _ from 'lodash'

import {
  Action,
  ChooseShipPrompt,
  Location,
  PlayCardPrompt,
  PlayerId,
  Prompt,
  RespondToAttackPrompt,
  UIState,
} from './shared-types'
import { ascribe, filterIndices, mapToObject, mapValues } from './utils'

export interface BlastCard {
  type: 'BlastCard'
  name: string
  damage: number
}

export interface ShipCard {
  type: 'ShipCard'
  name: string
  movement: number
  hp: number
}

export type ActionCard = BlastCard

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

export interface Ship {
  location: Location
  shipType: ShipCard
  damage: number
}

export interface PlayerState {
  hand: ActionCard[]
  ships: Ship[]
}

export interface AttackTurnState {
  type: 'AttackTurnState'
}

export interface PlayBlastChooseFiringShipState {
  type: 'PlayBlastChooseFiringShipState'
  blast: BlastCard
}

export interface PlayBlastChooseTargetShipState {
  type: 'PlayBlastChooseTargetShipState'
  blast: BlastCard
  firingShip: Ship
}

export interface PlayBlastRespondState {
  type: 'PlayBlastRespondState'
  blast: BlastCard
  firingShip: Ship
  targetShip: Ship
}

export type TurnState =
  | AttackTurnState
  | PlayBlastChooseTargetShipState
  | PlayBlastChooseFiringShipState
  | PlayBlastChooseTargetShipState
  | PlayBlastRespondState

export interface GameState {
  actionDeck: ActionCard[]
  shipDeck: ShipCard[]
  playerState: Map<PlayerId, PlayerState>
  activePlayer: string
  turnState: TurnState
  eventLog: string[]
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
              state.playerState.get('#2')!.ships,
              () => true
            ).map((i) => ascribe<[string, number]>([playerId, i])), // TODO
          })
      }
    } else if (state.turnState.type === 'PlayBlastRespondState') {
      const turnState = state.turnState
      if (playerState.ships.some((s) => s === turnState.targetShip)) {
        return ascribe<RespondToAttackPrompt>({
          type: 'RespondToAttackPrompt',
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

export function applyAction(state: GameState, action: Action): void {
  const activePlayerState = state.playerState.get(state.activePlayer)

  if (activePlayerState === undefined) {
    throw new Error(`Player ID ${state.activePlayer} not found.`)
  }

  switch (action.type) {
    case 'DrawAction': {
      const card = state.actionDeck.shift()!
      activePlayerState?.hand.push(card)
      state.eventLog.push(`${state.activePlayer} draws a card.`)
      state.activePlayer = state.activePlayer === '#1' ? '#2' : '#1'

      break
    }

    case 'PlayCardAction': {
      const card = activePlayerState.hand[action.handIndex]

      if (!card) {
        break
      }

      switch (card.type) {
        case 'BlastCard':
          activePlayerState.hand.splice(action.handIndex, 1)
          state.turnState = {
            type: 'PlayBlastChooseFiringShipState',
            blast: card,
          }
      }
      break
    }

    case 'ChooseShipAction':
      switch (state.turnState.type) {
        case 'PlayBlastChooseFiringShipState':
          // TODO: validate choice
          state.turnState = {
            type: 'PlayBlastChooseTargetShipState',
            blast: state.turnState.blast,
            firingShip: state.playerState.get(action.choice[0])!.ships[
              action.choice[1]
            ],
          }
          break

        case 'PlayBlastChooseTargetShipState':
          // TODO: validate choice
          state.turnState = {
            type: 'PlayBlastRespondState',
            blast: state.turnState.blast,
            firingShip: state.turnState.firingShip,
            targetShip: state.playerState.get(action.choice[0])!.ships[
              action.choice[1]
            ],
          }
          break

        default:
          throw new Error('Should never get here!')
      }
      break

    case 'RespondToAttackAction':
      break

    default:
      const cantGetHere: never = action
      throw new Error('Should never get here!')
  }
}
