import * as _ from 'lodash'
import { actionCards, shipCards } from './data'
import {
  ChooseShipPrompt,
  CommandShipCard,
  PlaceShipPrompt,
  PlayerId,
  Prompt,
  SelectCardPrompt,
  UIState,
} from './shared-types'
import { GameState } from './types'
import { ascribe, assert, filterIndices, mapToObject, mapValues } from './utils'

const commandShip: CommandShipCard = {
  type: 'CommandShipCard',
  name: 'The Glorp',
  hp: 8,
}

export function newGameState(): GameState {
  return {
    actionDeck: _.shuffle(actionCards),
    actionDiscardDeck: [],

    shipDeck: _.shuffle(shipCards),
    shipDiscardDeck: [],

    playerState: new Map([
      [
        '#1',
        {
          hand: [],
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
                c.resources.diamonds > 0 ||
                c.resources.circles > 0 ||
                c.resources.stars > 0
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
          const playableCardIndices = filterIndices(
            playerState.hand,
            (c) => c.isBlast // TODO
          )

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
        const playableCardIndices = filterIndices(
          playerState.hand,
          (c) => c.isBlast // TODO
        )

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
    playerHand: playerState.hand,
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
