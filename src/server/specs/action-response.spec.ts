import { expect } from 'chai'
import { applyAction } from '../actions'
import { commandShipCards } from '../cards'
import { gameUiState, newGameState } from '../game'
import { GameState } from '../types'
import { findActionCard, findShipCard, eventLogToText } from './test-utils'

function gameState(): GameState {
  const s = newGameState(new Set(['P1', 'P2']), { startingHandSize: 0 })

  s.turnState = { type: 'AttackTurnState' }
  s.activePlayer = 'P1'
  s.playerState.set('P1', {
    hand: [
      findActionCard('StrategicAllocationCard'),
      findActionCard('AsteroidsCard'),
      findActionCard('MinefieldCard'),
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

describe('Non-targeted actions', () => {
  it("should resolve when P2 can't respond", () => {
    const state = gameState()
    state.getPlayerState('P2').hand = []

    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 plays Strategic Allocation.',
      'P1 draws 3 cards.',
    ])
  })

  it('should resolve when passing', () => {
    const state = gameState()
    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P2', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 plays Strategic Allocation.',
      'P1 draws 3 cards.',
    ])
  })

  it('should fail when responded to', () => {
    const state = gameState()
    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 0 })
    applyAction(state, 'P2', { type: 'ChooseCardAction', handIndex: 0 })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 plays Strategic Allocation.',
      '...but P2 responds with Temporal Flux, canceling its effect!',
    ])
  })
})

describe('Targeted actions', () => {
  it("should resolve when P2 can't respond", () => {
    const state = gameState()
    state.getPlayerState('P2').hand = []

    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 1 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: 'P1' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 plays Asteroids on themselves.',
    ])
  })

  it('should resolve when passing', () => {
    const state = gameState()
    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 1 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: 'P1' })
    applyAction(state, 'P2', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 plays Asteroids on themselves.',
    ])
  })

  it('should fail when responded to', () => {
    const state = gameState()
    applyAction(state, 'P1', { type: 'ChooseCardAction', handIndex: 1 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: 'P1' })
    applyAction(state, 'P2', { type: 'ChooseCardAction', handIndex: 0 })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 plays Asteroids on themselves.',
      '...but P2 responds with Temporal Flux, canceling its effect!',
    ])
  })
})