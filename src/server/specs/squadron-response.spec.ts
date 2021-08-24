import { expect } from 'chai'
import { applyAction } from '../actions'
import { commandShipCards } from '../cards'
import { gameUiState, newGameState } from '../game'
import { ActionCard } from '../shared-types'
import { GameState } from '../types'
import { findActionCard, findShipCard, eventLogToText } from './test-utils'

function gameState(p2Hand: ActionCard[]): GameState {
  const s = newGameState(new Set(['P1', 'P2']), {
    startingHandSize: 0,
    attackMode: 'FreeForAll',
  })

  s.turnState = { type: 'AttackTurnState' }
  s.activePlayer = 'P1'
  s.playerState.set('P1', {
    hand: [
      findActionCard('FighterCard'),
      findActionCard('BomberCard'),
      findActionCard('TemporalFluxCard'),
      findActionCard('TemporalFluxCard'),
      findActionCard('TemporalFluxCard'),
    ],
    usedSquadronCards: [],
    ships: [
      {
        type: 'Ship',
        location: 'n',
        shipType: findShipCard('Woden'),
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
      remainingAbilityActivations: undefined,
    },
    isAlive: true,
    asteroidsUntilBeginningOfPlayerTurn: undefined,
    minefieldUntilBeginningOfPlayerTurn: undefined,
  })

  s.playerState.set('P2', {
    hand: p2Hand,
    usedSquadronCards: [],
    ships: [
      {
        type: 'Ship',
        location: 'n',
        shipType: findShipCard('Woden'),
        damage: 5,
        temporaryDamage: 0,
        hasFiredThisTurn: false,
        blastDamageHistory: [],
      },
    ],
    commandShip: {
      type: 'CommandShip',
      shipType: commandShipCards[2],
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

describe('Fighters', () => {
  it("should resolve when P2 can't respond", () => {
    const state = gameState([])

    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Fighter targeting P2's Woden, dealing 2 damage.",
      "P2's Woden is destroyed!",
    ])
    expect(state.getPlayerState('P2').ships).to.be.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(4)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(0)
  })

  it('should resolve when passing', () => {
    const state = gameState([
      findActionCard('FighterCard'),
      findActionCard('BomberCard'),
      findActionCard('TemporalFluxCard'),
    ])
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    applyAction(state, 'P2', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Fighter targeting P2's Woden, dealing 2 damage.",
      "P2's Woden is destroyed!",
    ])
    expect(state.getPlayerState('P2').ships).to.be.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(4)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(3)
  })

  it('should fail when responded to with a Fighter', () => {
    const state = gameState([
      findActionCard('FighterCard'),
      findActionCard('BomberCard'),
      findActionCard('TemporalFluxCard'),
    ])
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlaySquadronRespondState')
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Fighter targeting P2's Woden, dealing 2 damage.",
      '...but P2 responds with Fighter, canceling its effect!',
      "P1's Fighter is discarded.",
      "P2's Fighter is discarded.",
    ])
    expect(state.getPlayerState('P2').ships).to.be.not.empty
    expect(state.getPlayerState('P1').usedSquadronCards).to.be.empty
    expect(state.getPlayerState('P2').usedSquadronCards).to.be.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(4)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(2)
  })

  it('should fail when responded to with a EvasiveAction', () => {
    const state = gameState([findActionCard('EvasiveActionCard')])
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlaySquadronRespondState')
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Fighter targeting P2's Woden, dealing 2 damage.",
      '...but P2 responds with Evasive Action, canceling its effect!',
    ])
    expect(state.actionDiscardDeck.length).to.be.eq(1)
    expect(state.getPlayerState('P2').ships).to.be.not.empty
    expect(state.getPlayerState('P1').usedSquadronCards).to.not.be.empty
    expect(state.getPlayerState('P2').usedSquadronCards).to.be.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(4)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(0)
  })

  it('should fail when responded to with a Temporal Flux', () => {
    const state = gameState([
      findActionCard('FighterCard'),
      findActionCard('BomberCard'),
      findActionCard('TemporalFluxCard'),
    ])
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlaySquadronRespondState')
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 2 })
    applyAction(state, 'P1', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Fighter targeting P2's Woden, dealing 2 damage.",
      '...but P2 responds with Temporal Flux, canceling its effect!',
      "P1's Fighter is discarded.",
    ])
    expect(state.actionDiscardDeck.length).to.be.eq(2)
    expect(state.getPlayerState('P2').ships).to.be.not.empty
    expect(state.getPlayerState('P1').usedSquadronCards).to.be.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(4)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(2)
  })

  it('should resolve when double-responded to with Temporal Fluxes', () => {
    const state = gameState([
      findActionCard('FighterCard'),
      findActionCard('BomberCard'),
      findActionCard('TemporalFluxCard'),
      findActionCard('TemporalFluxCard'),
    ])
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlaySquadronRespondState')
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 2 })
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 2 })
    applyAction(state, 'P2', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Fighter targeting P2's Woden, dealing 2 damage.",
      '...but P2 responds with Temporal Flux, canceling its effect!',
      '...but P1 responds with Temporal Flux, canceling its effect!',
      "P2's Woden is destroyed!",
    ])
    expect(state.actionDiscardDeck.length).to.be.eq(2)
    expect(state.getPlayerState('P2').ships).to.be.empty
    expect(state.getPlayerState('P1').usedSquadronCards).to.be.not.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(3)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(3)
  })

  it('should resolve when double-responded to with Temporal Fluxes and P2 is out of options', () => {
    const state = gameState([
      findActionCard('FighterCard'),
      findActionCard('BomberCard'),
      findActionCard('TemporalFluxCard'),
    ])
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlaySquadronRespondState')
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 2 })
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 2 })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Fighter targeting P2's Woden, dealing 2 damage.",
      '...but P2 responds with Temporal Flux, canceling its effect!',
      '...but P1 responds with Temporal Flux, canceling its effect!',
      "P2's Woden is destroyed!",
    ])
    expect(state.actionDiscardDeck.length).to.be.eq(2)
    expect(state.getPlayerState('P2').ships).to.be.empty
    expect(state.getPlayerState('P1').usedSquadronCards).to.be.not.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(3)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(2)
  })

  it('should resolve when double-responded to with a Fighter and Temporal Flux', () => {
    const state = gameState([
      findActionCard('FighterCard'),
      findActionCard('BomberCard'),
      findActionCard('TemporalFluxCard'),
    ])
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlaySquadronRespondState')
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 2 })
    applyAction(state, 'P2', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Fighter targeting P2's Woden, dealing 2 damage.",
      '...but P2 responds with Fighter, canceling its effect!',
      '...but P1 responds with Temporal Flux, canceling its effect!',
      "P2's Fighter is discarded.",
      "P2's Woden is destroyed!",
    ])
    expect(state.actionDiscardDeck.length).to.be.eq(2)
    expect(state.getPlayerState('P2').ships).to.be.empty
    expect(state.getPlayerState('P1').usedSquadronCards).to.be.not.empty
    expect(state.getPlayerState('P2').usedSquadronCards).to.be.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(3)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(2)
  })

  it('should fail when triple-responded to with a Fighter and two Temporal Fluxes', () => {
    const state = gameState([
      findActionCard('FighterCard'),
      findActionCard('BomberCard'),
      findActionCard('TemporalFluxCard'),
      findActionCard('TemporalFluxCard'),
    ])
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlaySquadronRespondState')
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 2 })
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 1 })
    applyAction(state, 'P1', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Fighter targeting P2's Woden, dealing 2 damage.",
      '...but P2 responds with Fighter, canceling its effect!',
      '...but P1 responds with Temporal Flux, canceling its effect!',
      '...but P2 responds with Temporal Flux, canceling its effect!',
      "P1's Fighter is discarded.",
      "P2's Fighter is discarded.",
    ])
    expect(state.actionDiscardDeck.length).to.be.eq(4)
    expect(state.getPlayerState('P2').ships).to.not.be.empty
    expect(state.getPlayerState('P1').usedSquadronCards).to.be.empty
    expect(state.getPlayerState('P2').usedSquadronCards).to.be.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(3)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(2)
  })
})

describe('Bombers', () => {
  it("should resolve when P2 can't respond", () => {
    const state = gameState([])

    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 1 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Bomber targeting P2's Woden, dealing 4 damage.",
      "P2's Woden is destroyed!",
    ])
    expect(state.actionDiscardDeck.length).to.be.eq(0)
    expect(state.getPlayerState('P2').ships).to.be.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(4)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(0)
    expect(state.getPlayerState('P1').usedSquadronCards.length).to.be.eq(1)
  })

  it('should resolve when passing', () => {
    const state = gameState([
      findActionCard('FighterCard'),
      findActionCard('BomberCard'),
      findActionCard('TemporalFluxCard'),
    ])
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 1 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    applyAction(state, 'P2', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Bomber targeting P2's Woden, dealing 4 damage.",
      "P2's Woden is destroyed!",
    ])
    expect(state.actionDiscardDeck.length).to.be.eq(0)
    expect(state.getPlayerState('P2').ships).to.be.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(4)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(3)
    expect(state.getPlayerState('P1').usedSquadronCards.length).to.be.eq(1)
  })

  it('should fail when responded to with a Fighter', () => {
    const state = gameState([
      findActionCard('FighterCard'),
      findActionCard('BomberCard'),
      findActionCard('TemporalFluxCard'),
    ])
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 1 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlaySquadronRespondState')
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Bomber targeting P2's Woden, dealing 4 damage.",
      '...but P2 responds with Fighter, canceling its effect!',
      "P1's Bomber is discarded.",
      "P2's Fighter will return to their hand at end of turn.",
    ])
    expect(state.actionDiscardDeck.length).to.be.eq(1)
    expect(state.getPlayerState('P2').ships).to.be.not.empty
    expect(state.getPlayerState('P1').usedSquadronCards).to.be.empty
    expect(state.getPlayerState('P2').usedSquadronCards).to.not.be.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(4)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(2)
  })

  it('should fail when responded to with a Temporal Flux', () => {
    const state = gameState([
      findActionCard('FighterCard'),
      findActionCard('BomberCard'),
      findActionCard('TemporalFluxCard'),
    ])
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 1 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlaySquadronRespondState')
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 2 })
    applyAction(state, 'P1', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Bomber targeting P2's Woden, dealing 4 damage.",
      '...but P2 responds with Temporal Flux, canceling its effect!',
      "P1's Bomber is discarded.",
    ])
    expect(state.actionDiscardDeck.length).to.be.eq(2)
    expect(state.getPlayerState('P2').ships).to.be.not.empty
    expect(state.getPlayerState('P1').usedSquadronCards).to.be.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(4)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(2)
  })

  it('should resolve when double-responded to with Temporal Fluxes', () => {
    const state = gameState([
      findActionCard('FighterCard'),
      findActionCard('BomberCard'),
      findActionCard('TemporalFluxCard'),
      findActionCard('TemporalFluxCard'),
    ])
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 1 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlaySquadronRespondState')
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 2 })
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 2 })
    applyAction(state, 'P2', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Bomber targeting P2's Woden, dealing 4 damage.",
      '...but P2 responds with Temporal Flux, canceling its effect!',
      '...but P1 responds with Temporal Flux, canceling its effect!',
      "P2's Woden is destroyed!",
    ])
    expect(state.actionDiscardDeck.length).to.be.eq(2)
    expect(state.getPlayerState('P2').ships).to.be.empty
    expect(state.getPlayerState('P1').usedSquadronCards).to.be.not.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(3)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(3)
  })

  it('should resolve when double-responded to with Temporal Fluxes and P2 is out of options', () => {
    const state = gameState([
      findActionCard('FighterCard'),
      findActionCard('BomberCard'),
      findActionCard('TemporalFluxCard'),
    ])
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 1 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlaySquadronRespondState')
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 2 })
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 2 })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Bomber targeting P2's Woden, dealing 4 damage.",
      '...but P2 responds with Temporal Flux, canceling its effect!',
      '...but P1 responds with Temporal Flux, canceling its effect!',
      "P2's Woden is destroyed!",
    ])
    expect(state.actionDiscardDeck.length).to.be.eq(2)
    expect(state.getPlayerState('P2').ships).to.be.empty
    expect(state.getPlayerState('P1').usedSquadronCards).to.be.not.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(3)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(2)
  })

  it('should resolve when double-responded to with a Fighter and Temporal Flux', () => {
    const state = gameState([
      findActionCard('FighterCard'),
      findActionCard('BomberCard'),
      findActionCard('TemporalFluxCard'),
    ])
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 1 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlaySquadronRespondState')
    expect(gameUiState('P1', state).prompt.type).to.be.eq('NoPrompt')
    expect(gameUiState('P2', state).prompt.type).to.be.eq('ChooseCardPrompt')

    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 0 })
    expect(gameUiState('P2', state).prompt.type).to.be.eq('NoPrompt')
    expect(gameUiState('P1', state).prompt.type).to.be.eq('ChooseCardPrompt')

    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 2 })
    expect(gameUiState('P1', state).prompt.type).to.be.eq('NoPrompt')
    expect(gameUiState('P2', state).prompt.type).to.be.eq('ChooseCardPrompt')

    applyAction(state, 'P2', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Bomber targeting P2's Woden, dealing 4 damage.",
      '...but P2 responds with Fighter, canceling its effect!',
      '...but P1 responds with Temporal Flux, canceling its effect!',
      "P2's Fighter is discarded.",
      "P2's Woden is destroyed!",
    ])
    expect(state.actionDiscardDeck.length).to.be.eq(2)
    expect(state.getPlayerState('P2').ships).to.be.empty
    expect(state.getPlayerState('P1').usedSquadronCards).to.be.not.empty
    expect(state.getPlayerState('P2').usedSquadronCards).to.be.empty
    expect(state.getPlayerState('P1').hand.length).to.be.eq(3)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(2)
  })
})
