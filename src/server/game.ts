import * as _ from 'lodash'
import { actionCards, commandShipCards, shipCards } from './cards'
import { NUM_STARTING_SHIP_CARDS } from './constants'
import { bold, event, parseEventLog, RawEventLog } from './events'
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
  canRespondToBlast,
  canRespondToSquadron,
  canRespondToAnything,
  alivePlayers,
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
    blastDamageHistory: [],
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

  const s: GameState = {
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
    eventLog: [],

    gameSettings,

    getPlayerState(playerId: string): PlayerState {
      const playerState = this.playerState.get(playerId)
      assert(playerState !== undefined, `Player ID ${playerId} not found.`)
      return playerState
    },

    pushEventLog(r: RawEventLog): void {
      this.eventLog.push(parseEventLog(this, r))
    },
  }

  s.pushEventLog(event`${bold('Welcome to Mag Blast!')}`)

  return s
}

export function lobbyUiState(
  gameSettings: GameSettings,
  playerIds: PlayerId[]
): UILobbyState {
  return {
    type: 'UILobbyState',
    playerIds,
    gameSettings: {
      attackMode: gameSettings.attackMode,
    },
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

  if (!playerState.isAlive) {
    return ascribe<NoPrompt>({
      type: 'NoPrompt',
      text: 'You have been eliminated :(',
    })
  }

  if (state.turnState.type === 'PlayBlastRespondState') {
    const targetShip = state.turnState.targetShip
    if (
      (targetShip.type === 'Ship' && playerState.ships.includes(targetShip)) ||
      playerState.commandShip === targetShip
    ) {
      const playableCardIndices = filterIndices(playerState.hand, (c) =>
        canRespondToBlast(c)
      )

      return ascribe<ChooseCardPrompt>({
        type: 'ChooseCardPrompt',
        text: `Choose a card to play in response.`,
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
      const playableCardIndices = filterIndices(playerState.hand, (c) =>
        canRespondToSquadron(playerState, c)
      )

      return ascribe<ChooseCardPrompt>({
        type: 'ChooseCardPrompt',
        text: `Choose a card to play in response.`,
        selectableCardIndices: playableCardIndices,
        multiselect: undefined,
        pass: {
          actionText: 'Do nothing',
        },
      })
    }
  }

  if (
    state.turnState.type === 'PlayActionRespondState' &&
    state.turnState.respondingPlayers[0] === playerId
  ) {
    const playableCardIndices = filterIndices(
      playerState.hand,
      canRespondToAnything
    )

    return ascribe<ChooseCardPrompt>({
      type: 'ChooseCardPrompt',
      text: `Choose a card to play in response to ${state.turnState.playingPlayer}'s card.`,
      selectableCardIndices: playableCardIndices,
      multiselect: undefined,
      pass: {
        actionText: 'Do nothing',
      },
    })
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
          text: 'Choose cards to use for reinforcements (3 symbols of a kind or 1 of each).',
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
          text: 'Choose a player on which to play Asteroids (probably should be yourself).',
          pass: undefined,
          canCancel: true,
          allowableShipIndices: [],
          allowableCommandShips: alivePlayers(state),
        })
      }

      case 'AttackChooseMinefieldPlayerTurnState': {
        return ascribe<ChooseShipPrompt>({
          type: 'ChooseShipPrompt',
          text: 'Choose a player on which to play a Minefield.',
          pass: undefined,
          canCancel: true,
          allowableShipIndices: [],
          allowableCommandShips: alivePlayers(state),
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

      case 'AttackChooseSpacedockShipState': {
        return ascribe<ChooseShipPrompt>({
          type: 'ChooseShipPrompt',
          text: 'Choose a ship to repair damage to.',
          allowableShipIndices: filterIndices(
            playerState.ships,
            (s) => s.damage > 0
          ).map((i) => ascribe<[string, number]>([playerId, i])),
          allowableCommandShips: [],
          pass: undefined,
          canCancel: true,
        })
      }

      case 'PlayBlastChooseFiringShipState':
        const turnState = state.turnState
        return ascribe<ChooseShipPrompt>({
          type: 'ChooseShipPrompt',
          text:
            turnState.blast.cardType === 'RammingSpeedCard'
              ? 'Choose a ship to sacrifice.'
              : `Choose a ship to fire a ${turnState.blast.name} from.`,
          allowableShipIndices: filterIndices(
            playerState.ships,
            (s) =>
              turnState.blast.cardType === 'RammingSpeedCard' ||
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
      case 'PlaySquadronRespondState':
        return ascribe<NoPrompt>({
          type: 'NoPrompt',
          text: `Waiting for ${
            owningPlayer(state.playerState, state.turnState.targetShip)[0]
          } to respond...`,
        })

      case 'PlayActionRespondState':
        return ascribe<NoPrompt>({
          type: 'NoPrompt',
          text: `Waiting for any player to respond...`,
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
                location: s.location,
                shipType: s.shipType,
                hasFiredThisTurn: s.hasFiredThisTurn,
                damage: s.damage + s.temporaryDamage,
              })),
        commandShip: {
          ...playerState.commandShip,
          damage:
            playerState.commandShip.damage +
            playerState.commandShip.temporaryDamage,
        },
        isAlive: playerState.isAlive,
        hasAsteroids:
          playerState.asteroidsUntilBeginningOfPlayerTurn !== undefined,
        hasMinefield:
          playerState.minefieldUntilBeginningOfPlayerTurn !== undefined,
      })).entries()
    ),
    actionDeckSize: state.actionDeck.length,
    actionDiscardDeckSize: state.actionDiscardDeck.length,
    shipDeckSize: state.shipDeck.length,
    shipDiscardDeckSize: state.shipDiscardDeck.length,
    isActivePlayer: state.activePlayer === playerId,
    eventLog: state.eventLog,
    prompt: prompt(state, playerId),
  }
}
