import { expect } from 'chai'
import { applyAction } from '../actions'
import { newGameState } from '../game'
import { GameState } from '../types'
import {
  eventLogToText,
  findOriginalActionCard,
  findOriginalCommandShipCard,
  findOriginalShipCard,
} from './test-utils'

function gameState(): GameState {
  const s = newGameState(new Set(['P1', 'P2']), {
    startingHandSize: 0,
    attackMode: 'FreeForAll',
    gameFlavor: 'Original',
  })

  s.turnState = { type: 'AttackTurnState' }
  s.activePlayer = 'P1'
  s.playerState.set('P1', {
    hand: [
      findOriginalActionCard('StrategicAllocationCard'),
      findOriginalActionCard('AsteroidsCard'),
      findOriginalActionCard('MinefieldCard'),
      findOriginalActionCard('ReinforcementsCard'),
    ],
    usedSquadronCards: [],
    ships: [
      {
        type: 'Ship',
        location: 'n',
        shipType: findOriginalShipCard('Dink'),
        damage: 0,
        temporaryDamage: 0,
        hasFiredThisTurn: false,
        blastDamageHistory: [],
      },
    ],
    commandShip: {
      type: 'CommandShip',
      shipType: findOriginalCommandShipCard('TheGlorp'),
      damage: 0,
      temporaryDamage: 0,
      remainingAbilityActivations: undefined,
    },
    isAlive: true,
    asteroidsUntilBeginningOfPlayerTurn: undefined,
    minefieldUntilBeginningOfPlayerTurn: undefined,
  })

  s.playerState.set('P2', {
    hand: [findOriginalActionCard('TemporalFluxCard')],
    usedSquadronCards: [],
    ships: [
      {
        type: 'Ship',
        location: 'n',
        shipType: findOriginalShipCard('Dink'),
        damage: 0,
        temporaryDamage: 0,
        hasFiredThisTurn: false,
        blastDamageHistory: [],
      },
    ],
    commandShip: {
      type: 'CommandShip',
      shipType: findOriginalCommandShipCard('Freep'),
      damage: 0,
      temporaryDamage: 0,
      remainingAbilityActivations: undefined,
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

    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(state.actionDiscardDeck.length).to.be.eq(1)
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 plays Strategic Allocation.',
      'P1 draws 3 cards.',
    ])
  })

  it('should resolve when passing', () => {
    const state = gameState()
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P2', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(state.actionDiscardDeck.length).to.be.eq(1)
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 plays Strategic Allocation.',
      'P1 draws 3 cards.',
    ])
  })

  it('should fail when responded to', () => {
    const state = gameState()
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 0 })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(state.actionDiscardDeck.length).to.be.eq(2)
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

    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 1 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: 'P1' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(state.actionDiscardDeck.length).to.be.eq(1)
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 plays Asteroids on themselves.',
    ])
  })

  it('should resolve when passing', () => {
    const state = gameState()
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 1 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: 'P1' })
    applyAction(state, 'P2', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(state.actionDiscardDeck.length).to.be.eq(1)
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 plays Asteroids on themselves.',
    ])
  })

  it('should fail when responded to', () => {
    const state = gameState()
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 1 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: 'P1' })
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 0 })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(state.actionDiscardDeck.length).to.be.eq(2)
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 plays Asteroids on themselves.',
      '...but P2 responds with Temporal Flux, canceling its effect!',
    ])
  })
})

describe('Reinforcements', () => {
  it("should resolve when P2 can't respond", () => {
    const state = gameState()
    state.getPlayerState('P2').hand = []

    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 3 })

    expect(state.turnState.type).to.be.eq('AttackPlaceShipState')
    expect(state.actionDiscardDeck.length).to.be.eq(1)
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 plays Reinforcements.',
    ])
  })

  it('should resolve when passing', () => {
    const state = gameState()
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 3 })
    applyAction(state, 'P2', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackPlaceShipState')
    expect(state.actionDiscardDeck.length).to.be.eq(1)
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 plays Reinforcements.',
    ])
  })

  it('should fail when responded to', () => {
    const state = gameState()
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 3 })
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 0 })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(state.actionDiscardDeck.length).to.be.eq(2)
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 plays Reinforcements.',
      '...but P2 responds with Temporal Flux, canceling its effect!',
    ])
  })
})
