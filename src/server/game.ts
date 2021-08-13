import * as _ from 'lodash'
import { actionCards, commandShipCards, shipCards } from './cards'
import { canFire, movableZones } from './logic'
import {
  ChooseShipPrompt,
  ChooseZonePrompt,
  LOCATIONS,
  PlaceShipPrompt,
  PlayerId,
  Prompt,
  ChooseCardPrompt,
  UIGameState,
  UILobbyState,
  ShipCard,
  ChooseShipCardPrompt,
} from './shared-types'
import { GameState, MAX_ZONE_SHIPS, PlayerState, Ship } from './types'
import { ascribe, assert, filterIndices, mapValues } from './utils'

const NUM_STARTING_SHIP_CARDS = 6

function obfuscateShips(ships: Ship[]): Ship[] {
  return ships.map((s) => ({
    type: 'Ship',
    location: s.location,
    damage: 0,
    shipType: {
      type: 'ShipCard',
      name: 'Unknown',
      shipClass: 'Unknown',
      hp: 0,
      movement: 0,
      firesLasers: false,
      firesBeams: false,
      firesMags: false,
    },
    hasFiredThisTurn: false,
  }))
}

export function newGameState(playerIdSet: Set<PlayerId>): GameState {
  const playerIds = _.shuffle(Array.from(playerIdSet.values()))
  const randomizedCommandShipCards = _.shuffle(commandShipCards)

  const shipDeck = _.shuffle(shipCards)

  const playerIdsWithStartingShips = _.zip(
    playerIds,
    _.take(_.chunk(shipDeck, NUM_STARTING_SHIP_CARDS), playerIds.length)
  )
  const startingShipAssignments = new Map(
    playerIdsWithStartingShips as [PlayerId, ShipCard[]][]
  )
  shipDeck.splice(0, NUM_STARTING_SHIP_CARDS * playerIds.length)

  const players = playerIds.map((playerId, i) => {
    const playerState: PlayerState = {
      hand: [],
      ships: [],
      commandShip: {
        type: 'CommandShip',
        shipType: randomizedCommandShipCards[i],
        damage: 0,
      },
      isAlive: true,
    }

    const t: [PlayerId, PlayerState] = [playerId, playerState]
    return t
  })

  return {
    type: 'GameState',

    actionDeck: _.shuffle(actionCards),
    actionDiscardDeck: [],

    shipDeck,
    shipDiscardDeck: [],

    playerState: new Map(players),
    activePlayer: '',
    turnState: {
      type: 'ChooseStartingShipsState',
      dealtShipCards: startingShipAssignments,
      chosenShipCards: new Map(),
    },
    playerTurnOrder: playerIds,

    turnNumber: 1,
    eventLog: ['Welcome to Mag Blast!'],
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
          return ascribe<ChooseCardPrompt>({
            type: 'ChooseCardPrompt',
            selectableCardIndices: filterIndices(playerState.hand, () => true),
            text: 'Choose cards to discard.',
            pass: undefined,
            multiselect: {
              actionText: 'Discard 🗑',
            },
          })
        }

        case 'ReinforceTurnState': {
          return ascribe<ChooseCardPrompt>({
            type: 'ChooseCardPrompt',
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

          return ascribe<ChooseCardPrompt>({
            type: 'ChooseCardPrompt',
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
    } else if (
      state.turnState.type === 'ChooseStartingShipsState' &&
      !state.turnState.chosenShipCards.has(playerId)
    ) {
      return ascribe<ChooseShipCardPrompt>({
        type: 'ChooseShipCardPrompt',
        ships: state.turnState.dealtShipCards.get(playerId)!,
        text: 'Choose four starting ships.',
        multiselect: { actionText: 'Confirm' },
      })
    } else if (state.turnState.type === 'PlaceStartingShipsState') {
      const chosenCards = state.turnState.chosenShipCards.get(playerId)
      assert(
        chosenCards !== undefined,
        'PlaceStartingShipsState must have chosen cards.'
      )

      if (chosenCards.length > 0) {
        const shipsByLocation = _.groupBy(playerState.ships, (s) => s.location)
        const allowableZones = LOCATIONS.filter(
          (l) => (shipsByLocation[l] ?? []).length <= MAX_ZONE_SHIPS
        )

        return ascribe<PlaceShipPrompt>({
          type: 'PlaceShipPrompt',
          text: `Choose a location to place your starting ${chosenCards[0].name}`,
          newShip: chosenCards[0],
          allowableZones,
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
          () => false // TODO
        )

        const firingShip = state.turnState.firingShip
        const attackingPlayer = Array.from(state.playerState.keys()).find(
          (pid) => state.playerState.get(pid)?.ships?.includes(firingShip)
        )

        return ascribe<ChooseCardPrompt>({
          type: 'ChooseCardPrompt',
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
    playerState: Array.from(
      mapValues(state.playerState, (playerState, pid) => ({
        ships:
          state.turnState.type === 'PlaceStartingShipsState' && pid !== playerId
            ? obfuscateShips(playerState.ships)
            : playerState.ships,
        commandShip: playerState.commandShip,
        isAlive: playerState.isAlive,
      })).entries()
    ),
    deckSize: state.actionDeck.length,
    isActivePlayer: state.activePlayer === playerId,
    eventLog: state.eventLog,
    prompt,
  }
}
