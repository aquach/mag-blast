import { expect } from 'chai'
import { applyAction } from '../actions'
import { commandShipCards } from '../cards'
import { gameUiState, newGameState } from '../game'
import { GameState } from '../types'
import { findActionCard, findShipCard, eventLogToText } from './test-utils'

function gameState(p2NumFluxes: number): GameState {
  const s = newGameState(new Set(['P1', 'P2']), {
    startingHandSize: 0,
    attackMode: 'FreeForAll',
  })

  s.turnState = { type: 'AttackTurnState' }
  s.activePlayer = 'P1'
  s.playerState.set('P1', {
    hand: [
      findActionCard('LaserBlastCard'),
      findActionCard('TemporalFluxCard'),
      findActionCard('TemporalFluxCard'),
      findActionCard('TemporalFluxCard'),
    ],
    usedSquadronCards: [],
    ships: [
      {
        type: 'Ship',
        location: 'n',
        shipType: findShipCard('Dink'),
        damage: 0,
        temporaryDamage: 0,
        hasFiredThisTurn: false,
        blastDamageHistory: [],
      },
    ],
    commandShip: {
      type: 'CommandShip',
      shipType: commandShipCards[0],
      damage: 0,
      temporaryDamage: 0,
    },
    isAlive: true,
    asteroidsUntilBeginningOfPlayerTurn: undefined,
    minefieldUntilBeginningOfPlayerTurn: undefined,
  })

  s.playerState.set('P2', {
    hand: new Array(p2NumFluxes).fill(findActionCard('TemporalFluxCard')),
    usedSquadronCards: [],
    ships: [
      {
        type: 'Ship',
        location: 'n',
        shipType: findShipCard('Dink'),
        damage: 0,
        temporaryDamage: 0,
        hasFiredThisTurn: false,
        blastDamageHistory: [],
      },
    ],
    commandShip: {
      type: 'CommandShip',
      shipType: commandShipCards[1],
      damage: 0,
      temporaryDamage: 0,
    },
    isAlive: true,
    asteroidsUntilBeginningOfPlayerTurn: undefined,
    minefieldUntilBeginningOfPlayerTurn: undefined,
  })

  return s
}

function directHitState(): GameState {
  const state = newGameState(new Set(['P1', 'P2']), {
    startingHandSize: 0,
    attackMode: 'FreeForAll',
  })

  state.turnState = { type: 'AttackTurnState' }
  state.activePlayer = 'P1'
  state.playerTurnOrder = ['P1', 'P2']
  state.playerState.set('P1', {
    hand: [
      findActionCard('LaserBlastCard'),
      findActionCard('DirectHitCard'),
      findActionCard('CatastrophicDamageCard'),
    ],
    usedSquadronCards: [],
    ships: [
      {
        type: 'Ship',
        location: 'n',
        shipType: findShipCard('Dink'),
        damage: 0,
        temporaryDamage: 0,
        hasFiredThisTurn: false,
        blastDamageHistory: [],
      },
    ],
    commandShip: {
      type: 'CommandShip',
      shipType: commandShipCards[0],
      damage: 0,
      temporaryDamage: 0,
    },
    isAlive: true,
    asteroidsUntilBeginningOfPlayerTurn: undefined,
    minefieldUntilBeginningOfPlayerTurn: undefined,
  })

  state.playerState.set('P2', {
    hand: [findActionCard('TemporalFluxCard')],
    usedSquadronCards: [],
    ships: [
      {
        type: 'Ship',
        location: 'n',
        shipType: findShipCard('Pyrox'),
        damage: 0,
        temporaryDamage: 0,
        hasFiredThisTurn: false,
        blastDamageHistory: [],
      },
    ],
    commandShip: {
      type: 'CommandShip',
      shipType: commandShipCards[1],
      damage: 0,
      temporaryDamage: 0,
    },
    isAlive: true,
    asteroidsUntilBeginningOfPlayerTurn: undefined,
    minefieldUntilBeginningOfPlayerTurn: undefined,
  })
  return state
}

describe('Blasts', () => {
  it("should resolve when P2 can't respond", () => {
    const state = gameState(0)

    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P1', 0] })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1's Dink fires a Laser Blast at P2's Dink, dealing 1 damage.",
      "P2's Dink is destroyed!",
    ])
    expect(state.getPlayerState('P2').ships).to.be.empty
  })

  it('should resolve when passing', () => {
    const state = gameState(5)
    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P1', 0] })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    applyAction(state, 'P2', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1's Dink fires a Laser Blast at P2's Dink, dealing 1 damage.",
      "P2's Dink is destroyed!",
    ])
    expect(state.getPlayerState('P2').ships).to.be.empty
  })

  it('should fail when responded to', () => {
    const state = gameState(5)
    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P1', 0] })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    applyAction(state, 'P2', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P1', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1's Dink fires a Laser Blast at P2's Dink, dealing 1 damage.",
      '...but P2 responds with Temporal Flux, canceling its effect!',
    ])
    expect(state.getPlayerState('P2').ships).to.be.not.empty
  })

  it('should resolve when double-responded to', () => {
    const state = gameState(5)
    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P1', 0] })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    applyAction(state, 'P2', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P2', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1's Dink fires a Laser Blast at P2's Dink, dealing 1 damage.",
      '...but P2 responds with Temporal Flux, canceling its effect!',
      '...but P1 responds with Temporal Flux, canceling its effect!',
      "P2's Dink is destroyed!",
    ])
    expect(state.getPlayerState('P2').ships).to.be.empty
  })

  it('should resolve when double-responded to and P2 has no response', () => {
    const state = gameState(1)
    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P1', 0] })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    applyAction(state, 'P2', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1's Dink fires a Laser Blast at P2's Dink, dealing 1 damage.",
      '...but P2 responds with Temporal Flux, canceling its effect!',
      '...but P1 responds with Temporal Flux, canceling its effect!',
      "P2's Dink is destroyed!",
    ])
    expect(state.getPlayerState('P2').ships).to.be.empty
  })

  it('should fail when triple-responded to', () => {
    const state = gameState(5)
    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P1', 0] })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    applyAction(state, 'P2', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P2', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P1', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')

    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1's Dink fires a Laser Blast at P2's Dink, dealing 1 damage.",
      '...but P2 responds with Temporal Flux, canceling its effect!',
      '...but P1 responds with Temporal Flux, canceling its effect!',
      '...but P2 responds with Temporal Flux, canceling its effect!',
    ])
    expect(state.getPlayerState('P2').ships).to.be.not.empty
  })

  it('should resolve when quadruple-responded to and P2 has no response', () => {
    const state = gameState(2)
    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P1', 0] })

    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(gameUiState('P1', state).prompt.type).to.be.eq('NoPrompt')
    expect(gameUiState('P2', state).prompt.type).to.be.eq('ChooseCardPrompt')

    applyAction(state, 'P2', { type: 'ChooseCardAction', handIndex: 0 })
    expect(gameUiState('P2', state).prompt.type).to.be.eq('NoPrompt')
    expect(gameUiState('P1', state).prompt.type).to.be.eq('ChooseCardPrompt')

    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    expect(gameUiState('P1', state).prompt.type).to.be.eq('NoPrompt')
    expect(gameUiState('P2', state).prompt.type).to.be.eq('ChooseCardPrompt')

    applyAction(state, 'P2', { type: 'ChooseCardAction', handIndex: 0 })
    expect(gameUiState('P2', state).prompt.type).to.be.eq('NoPrompt')
    expect(gameUiState('P1', state).prompt.type).to.be.eq('ChooseCardPrompt')

    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    expect(gameUiState('P2', state).prompt.type).to.be.eq('NoPrompt')

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1's Dink fires a Laser Blast at P2's Dink, dealing 1 damage.",
      '...but P2 responds with Temporal Flux, canceling its effect!',
      '...but P1 responds with Temporal Flux, canceling its effect!',
      '...but P2 responds with Temporal Flux, canceling its effect!',
      '...but P1 responds with Temporal Flux, canceling its effect!',
      "P2's Dink is destroyed!",
    ])
    expect(state.getPlayerState('P2').ships).to.be.empty
  })

  it('should handle multiplayer', () => {
    const state = newGameState(new Set(['P1', 'P2', 'P3']), {
      startingHandSize: 0,
      attackMode: 'FreeForAll',
    })

    state.turnState = { type: 'AttackTurnState' }
    state.activePlayer = 'P1'
    state.playerTurnOrder = ['P1', 'P2', 'P3']
    state.playerState.set('P1', {
      hand: [
        findActionCard('LaserBlastCard'),
        findActionCard('TemporalFluxCard'),
        findActionCard('TemporalFluxCard'),
        findActionCard('TemporalFluxCard'),
      ],
      usedSquadronCards: [],
      ships: [
        {
          type: 'Ship',
          location: 'n',
          shipType: findShipCard('Dink'),
          damage: 0,
          temporaryDamage: 0,
          hasFiredThisTurn: false,
          blastDamageHistory: [],
        },
      ],
      commandShip: {
        type: 'CommandShip',
        shipType: commandShipCards[0],
        damage: 0,
        temporaryDamage: 0,
      },
      isAlive: true,
      asteroidsUntilBeginningOfPlayerTurn: undefined,
      minefieldUntilBeginningOfPlayerTurn: undefined,
    })

    state.playerState.set('P2', {
      hand: [findActionCard('TemporalFluxCard')],
      usedSquadronCards: [],
      ships: [
        {
          type: 'Ship',
          location: 'n',
          shipType: findShipCard('Dink'),
          damage: 0,
          temporaryDamage: 0,
          hasFiredThisTurn: false,
          blastDamageHistory: [],
        },
      ],
      commandShip: {
        type: 'CommandShip',
        shipType: commandShipCards[1],
        damage: 0,
        temporaryDamage: 0,
      },
      isAlive: true,
      asteroidsUntilBeginningOfPlayerTurn: undefined,
      minefieldUntilBeginningOfPlayerTurn: undefined,
    })

    state.playerState.set('P3', {
      hand: [findActionCard('TemporalFluxCard')],
      usedSquadronCards: [],
      ships: [
        {
          type: 'Ship',
          location: 'n',
          shipType: findShipCard('Dink'),
          damage: 0,
          temporaryDamage: 0,
          hasFiredThisTurn: false,
          blastDamageHistory: [],
        },
      ],
      commandShip: {
        type: 'CommandShip',
        shipType: commandShipCards[1],
        damage: 0,
        temporaryDamage: 0,
      },
      isAlive: true,
      asteroidsUntilBeginningOfPlayerTurn: undefined,
      minefieldUntilBeginningOfPlayerTurn: undefined,
    })

    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P1', 0] })

    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlayBlastRespondState')
    expect(gameUiState('P1', state).prompt.type).to.be.eq('NoPrompt')
    expect(gameUiState('P2', state).prompt.type).to.be.eq('ChooseCardPrompt')
    expect(gameUiState('P3', state).prompt.type).to.be.eq('NoPrompt')

    applyAction(state, 'P2', { type: 'ChooseCardAction', handIndex: 0 })
    expect(state.turnState.type).to.be.eq('PlayActionRespondState')
    expect(gameUiState('P1', state).prompt.type).to.be.eq('NoPrompt')
    expect(gameUiState('P2', state).prompt.type).to.be.eq('NoPrompt')
    expect(gameUiState('P3', state).prompt.type).to.be.eq('ChooseCardPrompt')

    applyAction(state, 'P3', { type: 'PassAction' })
    expect(state.turnState.type).to.be.eq('PlayActionRespondState')
    expect(gameUiState('P1', state).prompt.type).to.be.eq('ChooseCardPrompt')
    expect(gameUiState('P2', state).prompt.type).to.be.eq('NoPrompt')
    expect(gameUiState('P3', state).prompt.type).to.be.eq('NoPrompt')

    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    expect(state.turnState.type).to.be.eq('PlayActionRespondState')
    expect(gameUiState('P1', state).prompt.type).to.be.eq('NoPrompt')
    expect(gameUiState('P2', state).prompt.type).to.be.eq('NoPrompt')
    expect(gameUiState('P3', state).prompt.type).to.be.eq('ChooseCardPrompt')

    applyAction(state, 'P3', { type: 'ChooseCardAction', handIndex: 0 })
    expect(gameUiState('P1', state).prompt.type).to.be.eq('ChooseCardPrompt')

    applyAction(state, 'P1', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1's Dink fires a Laser Blast at P2's Dink, dealing 1 damage.",
      '...but P2 responds with Temporal Flux, canceling its effect!',
      '...but P1 responds with Temporal Flux, canceling its effect!',
      '...but P3 responds with Temporal Flux, canceling its effect!',
    ])
    expect(state.getPlayerState('P2').ships).to.not.be.empty
  })

  describe('Direct Hits', () => {
    it('should reset state machine when blast canceled', () => {
      const state = directHitState()
      applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
      applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P1', 0] })
      applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
      applyAction(state, 'P2', { type: 'ChooseCardAction', handIndex: 0 })

      expect(state.turnState.type).to.be.eq('AttackTurnState')
      expect(state.directHitStateMachine?.type).to.be.eq(undefined)
      expect(eventLogToText(state.eventLog)).to.be.eql([
        'Welcome to Mag Blast!',
        "P1's Dink fires a Laser Blast at P2's Pyrox, dealing 1 damage.",
        '...but P2 responds with Temporal Flux, canceling its effect!',
      ])
    })

    it('should reset state machine when direct hit canceled', () => {
      const state = directHitState()
      applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
      applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P1', 0] })
      applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
      applyAction(state, 'P2', { type: 'PassAction' })

      applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
      applyAction(state, 'P2', { type: 'ChooseCardAction', handIndex: 0 })

      expect(state.turnState.type).to.be.eq('AttackTurnState')
      expect(state.directHitStateMachine?.type).to.be.eq(
        'BlastPlayedDirectHitState'
      )
      expect(eventLogToText(state.eventLog)).to.be.eql([
        'Welcome to Mag Blast!',
        "P1's Dink fires a Laser Blast at P2's Pyrox, dealing 1 damage.",
        'P1 plays Direct Hit!',
        '...but P2 responds with Temporal Flux, canceling its effect!',
      ])
    })

    it('should reset state machine when effect canceled', () => {
      const state = directHitState()
      applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
      applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P1', 0] })
      applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
      applyAction(state, 'P2', { type: 'PassAction' })

      applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
      applyAction(state, 'P2', { type: 'PassAction' })

      applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
      applyAction(state, 'P2', { type: 'ChooseCardAction', handIndex: 0 })

      expect(state.turnState.type).to.be.eq('AttackTurnState')
      expect(state.directHitStateMachine?.type).to.be.eq(
        'DirectHitPlayedDirectHitState'
      )
      expect(eventLogToText(state.eventLog)).to.be.eql([
        'Welcome to Mag Blast!',
        "P1's Dink fires a Laser Blast at P2's Pyrox, dealing 1 damage.",
        'P1 plays Direct Hit!',
        'P1 plays Catastrophic Damage!',
        '...but P2 responds with Temporal Flux, canceling its effect!',
      ])
    })
  })
})
