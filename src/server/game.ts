import * as _ from 'lodash'
import { LobbyState } from '.'
import { actionCards, shipCards } from './cards'
import { canFire, movableZones } from './logic'
import {
  ChooseShipPrompt,
  ChooseZonePrompt,
  CommandShipCard,
  LOCATIONS,
  PlaceShipPrompt,
  PlayerId,
  Prompt,
  SelectCardPrompt,
  UIGameState,
  UILobbyState,
} from './shared-types'
import { GameState, MAX_ZONE_SHIPS } from './types'
import { ascribe, assert, filterIndices, mapToObject, mapValues } from './utils'

const commandShip: CommandShipCard = {
  type: 'CommandShipCard',
  name: 'The Glorp',
  hp: 9,
}

export function newGameState(playerIds: Set<string>): GameState {
  return {
    type: 'GameState',

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
            {
              type: 'Ship',
              location: 'n',
              shipType: shipCards[0],
              damage: 0,
              hasFiredThisTurn: false,
            },
            {
              type: 'Ship',
              location: 'e',
              shipType: shipCards[1],
              damage: 0,
              hasFiredThisTurn: false,
            },
            {
              type: 'Ship',
              location: 's',
              shipType: shipCards[10],
              damage: 0,
              hasFiredThisTurn: false,
            },
            {
              type: 'Ship',
              location: 'w',
              shipType: shipCards[20],
              damage: 0,
              hasFiredThisTurn: false,
            },
            {
              type: 'Ship',
              location: 'n',
              shipType: shipCards[21],
              damage: 0,
              hasFiredThisTurn: false,
            },
            {
              type: 'Ship',
              location: 'e',
              shipType: shipCards[22],
              damage: 0,
              hasFiredThisTurn: false,
            },
            {
              type: 'Ship',
              location: 's',
              shipType: shipCards[25],
              damage: 0,
              hasFiredThisTurn: false,
            },
            {
              type: 'Ship',
              location: 'w',
              shipType: shipCards[30],
              damage: 0,
              hasFiredThisTurn: false,
            },
          ],
          commandShip: {
            type: 'CommandShip',
            shipType: commandShip,
            damage: 0,
          },
          isAlive: true,
        },
      ],
      [
        '#2',
        {
          hand: [],
          ships: [
            {
              type: 'Ship',
              location: 'n',
              shipType: shipCards[0],
              damage: 0,
              hasFiredThisTurn: false,
            },
          ],
          commandShip: {
            type: 'CommandShip',
            shipType: commandShip,
            damage: 0,
          },
          isAlive: true,
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

export function lobbyUiState(playerIds: PlayerId[]): UILobbyState {
  return {
    type: 'UILobbyState',
    playerIds,
  }
}

export function gameUiState(playerId: PlayerId, state: GameState): UIGameState {
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
            pass: undefined,
            multiselect: {
              actionText: 'Discard 🗑',
            },
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
            pass: {
              actionText: "I'm done ⏭️",
            },
            multiselect: {
              actionText: 'Reinforce 🚀',
            },
          })
        }

        case 'ReinforcePlaceShipState': {
          const shipsByLocation = _.groupBy(
            playerState.ships,
            (s) => s.location
          )
          const allowableZones = LOCATIONS.filter(
            (l) => (shipsByLocation[l] ?? []).length <= MAX_ZONE_SHIPS
          )

          return ascribe<PlaceShipPrompt>({
            type: 'PlaceShipPrompt',
            newShip: state.turnState.newShip,
            text: `Choose a zone to place your new ${state.turnState.newShip.name}.`,
            allowableZones,
          })
        }

        case 'ManeuverTurnState':
          return ascribe<ChooseShipPrompt>({
            type: 'ChooseShipPrompt',
            text: 'Choose a ship to move.',
            allowableShipIndices: filterIndices(
              playerState.ships,
              (s) => s.shipType.movement > 0
            ).map((i) => ascribe<[string, number]>([playerId, i])),
            allowableCommandShips: [],
            pass: {
              actionText: "I'm done ⏭️",
            },
            canCancel: false,
          })

        case 'ManeuverChooseTargetZoneState': {
          const location =
            state.turnState.originalLocations.get(state.turnState.ship) ??
            state.turnState.ship.location
          const zones = movableZones(
            location,
            state.turnState.ship.shipType.movement
          )

          return ascribe<ChooseZonePrompt>({
            type: 'ChooseZonePrompt',
            text: `Choose a zone to move ${state.turnState.ship.shipType.name} to.`,
            allowableZones: zones,
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
            multiselect: undefined,
            pass: {
              actionText: "I'm done ⏭️",
            },
          })
        }

        case 'PlayBlastChooseFiringShipState':
          const turnState = state.turnState
          return ascribe<ChooseShipPrompt>({
            type: 'ChooseShipPrompt',
            text: `Choose a ship to fire a ${turnState.blast.name} from.`,
            allowableShipIndices: filterIndices(
              playerState.ships,
              (s) =>
                !s.hasFiredThisTurn &&
                canFire(s.shipType, turnState.blast.cardType)
            ).map((i) => ascribe<[string, number]>([playerId, i])),
            allowableCommandShips: [],
            pass: undefined,
            canCancel: true,
          })

        case 'PlayBlastChooseTargetShipState':
          const firingShip = state.turnState.firingShip
          const allowableShipIndices: [string, number][] = _.flatMap(
            Array.from(state.playerState.entries()),
            ([pid, playerState]) => {
              if (pid === playerId) {
                return []
              }

              return filterIndices(
                playerState.ships,
                (s) => s.location === firingShip.location
              ).map<[string, number]>((shipIndex) => [pid, shipIndex])
            }
          )

          const allowableCommandShips: string[] = _.flatMap(
            Array.from(state.playerState.entries()),
            ([pid, playerState]) => {
              if (pid === playerId) {
                return []
              }

              const shipInTheWay = playerState.ships.some(
                (s) => s.location === firingShip.location
              )

              return shipInTheWay ? [] : [pid]
            }
          )

          return ascribe<ChooseShipPrompt>({
            type: 'ChooseShipPrompt',
            text: 'Choose a target ship.',
            allowableShipIndices,
            allowableCommandShips,
            pass: undefined,
            canCancel: true,
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
          (c) => false // TODO
        )

        const firingShip = state.turnState.firingShip
        const attackingPlayer = Array.from(state.playerState.keys()).find(
          (pid) => state.playerState.get(pid)?.ships?.includes(firingShip)
        )

        return ascribe<SelectCardPrompt>({
          type: 'SelectCardPrompt',
          text: `${attackingPlayer} is attempting to play a ${state.turnState.blast.name} on your ${targetShip.shipType.name}. Choose a card to play in response.`,
          selectableCardIndices: playableCardIndices,
          multiselect: undefined,
          pass: {
            actionText: 'Do nothing',
          },
        })
      }
    }
  })()

  return {
    type: 'UIGameState',
    playerHand: playerState.hand,
    playerState: mapToObject(
      mapValues(state.playerState, (s) => ({
        ships: s.ships,
        commandShip: s.commandShip,
        isAlive: s.isAlive,
      }))
    ),
    deckSize: state.actionDeck.length,
    isActivePlayer: state.activePlayer === playerId,
    eventLog: state.eventLog,
    prompt,
  }
}
