import * as _ from 'lodash'
import { actionCards, commandShipCards, shipCards } from './cards'
import { NUM_STARTING_SHIP_CARDS } from './constants'
import {
  canPlayCard,
  movableZones,
  nonfullZones,
  owningPlayer,
  shipCanFire,
  moveableShips,
  squadronableCommandShipPlayers,
  squadronableShipIndices,
  blastableCommandShipPlayers,
  blastableShipIndices,
  ownsCarrier,
} from './logic'
import {
  ChooseShipPrompt,
  ChooseZonePrompt,
  PlaceShipPrompt,
  PlayerId,
  Prompt,
  ChooseCardPrompt,
  UIGameState,
  UILobbyState,
  ShipCard,
  ChooseShipCardPrompt,
  NoPrompt,
} from './shared-types'
import { GameSettings, GameState, PlayerState, Ship } from './types'
import { ascribe, assert, filterIndices, mapValues } from './utils'

function obfuscateShips(ships: Ship[]): Ship[] {
  return ships.map((s) => ({
    type: 'Ship',
    location: s.location,
    damage: 0,
    temporaryDamage: 0,
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

export function newGameState(
  playerIdSet: Set<PlayerId>,
  gameSettings: GameSettings
): GameState {
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
      usedSquadronCards: [],
      ships: [],
      commandShip: {
        type: 'CommandShip',
        shipType: randomizedCommandShipCards[i],
        damage: 0,
        temporaryDamage: 0,
      },
      isAlive: true,
      asteroidsUntilBeginningOfPlayerTurn: undefined,
      minefieldUntilBeginningOfPlayerTurn: undefined,
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
    directHitStateMachine: undefined,
    turnState: {
      type: 'ChooseStartingShipsState',
      dealtShipCards: startingShipAssignments,
      chosenShipCards: new Map(),
    },
    playerTurnOrder: playerIds,

    turnNumber: 1,
    eventLog: ['Welcome to Mag Blast!'],

    gameSettings,

    getPlayerState(playerId: string): PlayerState {
      const playerState = this.playerState.get(playerId)
      assert(playerState !== undefined, `Player ID ${playerId} not found.`)
      return playerState
    },
  }
}

export function lobbyUiState(playerIds: PlayerId[]): UILobbyState {
  return {
    type: 'UILobbyState',
    playerIds,
  }
}

export function prompt(state: GameState, playerId: PlayerId): Prompt {
  if (state.turnState.type === 'EndGameState') {
    return ascribe<NoPrompt>({
      type: 'NoPrompt',
      text: 'Game is over!',
    })
  }

  const playerState = state.getPlayerState(playerId)

  if (state.turnState.type === 'ChooseStartingShipsState') {
    if (!state.turnState.chosenShipCards.has(playerId)) {
      return ascribe<ChooseShipCardPrompt>({
        type: 'ChooseShipCardPrompt',
        ships: state.turnState.dealtShipCards.get(playerId)!,
        text: 'Choose four starting ships.',
        multiselect: { actionText: 'Confirm' },
      })
    }

    return ascribe<NoPrompt>({
      type: 'NoPrompt',
      text: 'Waiting for other players to choose their ships...',
    })
  }

  if (state.turnState.type === 'PlaceStartingShipsState') {
    const chosenCards = state.turnState.chosenShipCards.get(playerId)
    assert(
      chosenCards !== undefined,
      'PlaceStartingShipsState must have chosen cards.'
    )

    if (chosenCards.length > 0) {
      return ascribe<PlaceShipPrompt>({
        type: 'PlaceShipPrompt',
        text: `Choose a location to place your starting ${chosenCards[0].name}.`,
        newShips: chosenCards,
        allowableZones: nonfullZones(playerState.ships),
      })
    }

    return ascribe<NoPrompt>({
      type: 'NoPrompt',
      text: 'Waiting for other players to place their ships...',
    })
  }

  if (state.turnState.type === 'PlayBlastRespondState') {
    const targetShip = state.turnState.targetShip
    if (
      (targetShip.type === 'Ship' && playerState.ships.includes(targetShip)) ||
      playerState.commandShip === targetShip
    ) {
      const playableCardIndices = filterIndices(
        playerState.hand,
        (c) => c.canRespondToBlast
      )

      const firingShip = state.turnState.firingShip
      const [attackingPlayer, _] = owningPlayer(state.playerState, firingShip)

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

  if (state.turnState.type === 'PlaySquadronRespondState') {
    const targetShip = state.turnState.targetShip
    if (
      (targetShip.type === 'Ship' && playerState.ships.includes(targetShip)) ||
      playerState.commandShip === targetShip
    ) {
      const playableCardIndices = filterIndices(
        playerState.hand,
        (c) =>
          c.canRespondToBlast ||
          (c.canRespondToSquadron && ownsCarrier(playerState.ships))
      )

      return ascribe<ChooseCardPrompt>({
        type: 'ChooseCardPrompt',
        text: `${state.turnState.attackingPlayer} is attempting to play a ${state.turnState.squadron.name} on your ${targetShip.shipType.name}. Choose a card to play in response.`,
        selectableCardIndices: playableCardIndices,
        multiselect: undefined,
        pass: {
          actionText: 'Do nothing',
        },
      })
    }
  }

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

      case 'AttackPlaceShipState':
      case 'ReinforcePlaceShipState': {
        return ascribe<PlaceShipPrompt>({
          type: 'PlaceShipPrompt',
          newShips: [state.turnState.newShip],
          text: `Choose a zone to place your new ${state.turnState.newShip.name}.`,
          allowableZones: nonfullZones(playerState.ships),
        })
      }

      case 'AttackPlaceStolenShipState': {
        return ascribe<PlaceShipPrompt>({
          type: 'PlaceShipPrompt',
          newShips: [state.turnState.stolenShip.shipType],
          text: `Choose a zone to place your stolen ${state.turnState.stolenShip.shipType.name}.`,
          allowableZones: nonfullZones(playerState.ships),
        })
      }

      case 'AttackPlaceConcussiveBlastedShipsState': {
        const ship = state.turnState.ships[0]
        const [targetPlayer, targetPlayerState] = owningPlayer(
          state.playerState,
          ship
        )

        return ascribe<ChooseZonePrompt>({
          type: 'ChooseZonePrompt',
          text: `Choose a zone to move ${targetPlayer}'s ${ship.shipType.name} to.`,
          player: targetPlayer,
          allowableZones: nonfullZones(targetPlayerState.ships),
        })
      }

      case 'AttackChooseAsteroidsPlayerTurnState': {
        return ascribe<ChooseShipPrompt>({
          type: 'ChooseShipPrompt',
          text: 'Choose a player on which to play Asteroids.',
          pass: undefined,
          canCancel: false,
          allowableShipIndices: [],
          allowableCommandShips: state.playerTurnOrder,
        })
      }

      case 'AttackChooseMinefieldPlayerTurnState': {
        return ascribe<ChooseShipPrompt>({
          type: 'ChooseShipPrompt',
          text: 'Choose a player on which to play a Minefield.',
          pass: undefined,
          canCancel: false,
          allowableShipIndices: [],
          allowableCommandShips: state.playerTurnOrder,
        })
      }

      case 'ManeuverTurnState': {
        return ascribe<ChooseShipPrompt>({
          type: 'ChooseShipPrompt',
          text: 'Choose a ship to move.',
          allowableShipIndices: moveableShips(playerId, playerState),
          allowableCommandShips: [],
          pass: {
            actionText: "I'm done ⏭️",
          },
          canCancel: false,
        })
      }

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
          player: state.activePlayer,
          allowableZones: zones,
        })
      }

      case 'AttackTurnState': {
        const playableCardIndices = filterIndices(playerState.hand, (c) =>
          canPlayCard(state, playerState, c)
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
          allowableShipIndices: filterIndices(playerState.ships, (s) =>
            shipCanFire(s, turnState.blast)
          ).map((i) => ascribe<[string, number]>([playerId, i])),
          allowableCommandShips: [],
          pass: undefined,
          canCancel: true,
        })

      case 'PlayBlastChooseTargetShipState': {
        const firingShip = state.turnState.firingShip
        return ascribe<ChooseShipPrompt>({
          type: 'ChooseShipPrompt',
          text: 'Choose a target ship.',
          allowableShipIndices: blastableShipIndices(state, firingShip),
          allowableCommandShips: blastableCommandShipPlayers(state, firingShip),
          pass: undefined,
          canCancel: true,
        })
      }

      case 'PlaySquadronChooseTargetShipState': {
        return ascribe<ChooseShipPrompt>({
          type: 'ChooseShipPrompt',
          text: 'Choose a target ship.',
          allowableShipIndices: squadronableShipIndices(
            state,
            playerId,
            state.turnState.squadron
          ),
          allowableCommandShips: squadronableCommandShipPlayers(
            state,
            playerId,
            state.turnState.squadron
          ),
          pass: undefined,
          canCancel: true,
        })
      }

      case 'PlayBlastRespondState':
        return ascribe<NoPrompt>({
          type: 'NoPrompt',
          text: `Waiting for ${
            owningPlayer(state.playerState, state.turnState.targetShip)[0]
          } to respond...`,
        })

      case 'PlaySquadronRespondState':
        return ascribe<NoPrompt>({
          type: 'NoPrompt',
          text: `Waiting for ${state.turnState.attackingPlayer} to respond...`,
        })
    }
  } else {
    return ascribe<NoPrompt>({
      type: 'NoPrompt',
      text: `Waiting for ${state.activePlayer} to take their turn...`,
    })
  }

  const cantGetHere: never = state.turnState
}

export function gameUiState(playerId: PlayerId, state: GameState): UIGameState {
  const playerState = state.getPlayerState(playerId)

  return {
    type: 'UIGameState',
    playerHand: playerState.hand,
    playerState: Array.from(
      mapValues(state.playerState, (playerState, pid) => ({
        ships:
          state.turnState.type === 'PlaceStartingShipsState' && pid !== playerId
            ? obfuscateShips(playerState.ships)
            : playerState.ships.map((s) => ({
                ...s,
                damage: s.damage + s.temporaryDamage,
              })),
        commandShip: playerState.commandShip,
        isAlive: playerState.isAlive,
        hasAsteroids:
          playerState.asteroidsUntilBeginningOfPlayerTurn !== undefined,
        hasMinefield:
          playerState.minefieldUntilBeginningOfPlayerTurn !== undefined,
      })).entries()
    ),
    deckSize: state.actionDeck.length,
    isActivePlayer: state.activePlayer === playerId,
    eventLog: state.eventLog,
    prompt: prompt(state, playerId),
  }
}
