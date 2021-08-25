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
    gameFlavor: 'Rebalanced',
  })

  s.turnState = { type: 'AttackTurnState' }
  s.activePlayer = 'P1'
  s.playerState.set('P1', {
    hand: [
      findOriginalActionCard('LaserBlastCard'),
      findOriginalActionCard('DirectHitCard'),
      findOriginalActionCard('LaserBlastCard'),
    ],
    usedSquadronCards: [],
    ships: [
      {
        type: 'Ship',
        location: 'n',
        shipType: findOriginalShipCard('Woden'),
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
        shipType: findOriginalShipCard('Woden'),
        damage: 5,
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

describe('Direct hits with double blasts', () => {
  it("should not have 'play' event log", () => {
    const state = gameState()

    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P1', 0] })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlayBlastRespondState')
    applyAction(state, 'P2', { type: 'PassAction' })
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    expect(state.turnState.type).to.be.eq('PlayActionRespondState')
    applyAction(state, 'P2', { type: 'PassAction' })
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    expect(state.turnState.type).to.be.eq('PlayActionRespondState')
    applyAction(state, 'P2', { type: 'PassAction' })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1's Woden fires a Laser Blast at P2's Woden, dealing 1 damage.",
      'P1 plays Direct Hit!',
      "P1's Woden fires an additional Laser Blast at P2's Woden, dealing 1 damage.",
      "P2's Woden is destroyed!",
    ])
  })

  it('can still be countered', () => {
    const state = gameState()

    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P1', 0] })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    expect(state.turnState.type).to.be.eq('PlayBlastRespondState')
    applyAction(state, 'P2', { type: 'PassAction' })
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    expect(state.turnState.type).to.be.eq('PlayActionRespondState')
    applyAction(state, 'P2', { type: 'PassAction' })
    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    expect(state.turnState.type).to.be.eq('PlayActionRespondState')
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 0 })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1's Woden fires a Laser Blast at P2's Woden, dealing 1 damage.",
      'P1 plays Direct Hit!',
      "P1's Woden fires an additional Laser Blast at P2's Woden, dealing 1 damage.",
      '...but P2 responds with Temporal Flux, canceling its effect!',
    ])
  })
})
