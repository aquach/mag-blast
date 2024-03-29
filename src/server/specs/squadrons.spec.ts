import { expect } from 'chai'
import { applyAction } from '../actions'
import { commandShipCards } from '../cards'
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
      findOriginalActionCard('FighterCard'),
      findOriginalActionCard('BomberCard'),
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
    hand: [findOriginalActionCard('FighterCard')],
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
      shipType: findOriginalCommandShipCard('AlphaMazons'),
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

describe('Squadrons', () => {
  it("should be used, then returned to player's hand when defending", () => {
    const state = gameState()

    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 1 })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: ['P2', 0] })
    applyAction(state, 'P2', { type: 'ChooseCardAction', cardIndex: 0 })

    expect(state.turnState.type).to.be.eq('AttackTurnState')
    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      "P1 deploys a Bomber targeting P2's Woden, dealing 4 damage.",
      '...but P2 responds with Fighter, canceling its effect!',
      "P1's Bomber is discarded.",
      "P2's Fighter will return to their hand at end of turn.",
    ])
    expect(state.getPlayerState('P1').hand.length).to.be.eq(1)
    expect(state.getPlayerState('P1').usedSquadronCards).to.be.empty

    expect(state.getPlayerState('P2').hand.length).to.be.eq(0)
    expect(state.getPlayerState('P2').usedSquadronCards).to.not.be.empty

    applyAction(state, 'P1', { type: 'PassAction' })

    expect(state.getPlayerState('P1').hand.length).to.be.eq(1)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(1)
    expect(state.getPlayerState('P2').usedSquadronCards).to.be.empty

    expect(state.actionDiscardDeck.length).to.be.eq(1)
  })

  it('should not be duplicated when canceled', () => {
    const state = gameState()

    applyAction(state, 'P1', { type: 'ChooseCardAction', cardIndex: 0 })
    applyAction(state, 'P1', { type: 'CancelAction' })
    expect(state.turnState.type).to.be.eq('AttackTurnState')

    expect(state.getPlayerState('P1').hand.length).to.be.eq(2)
    expect(state.getPlayerState('P1').usedSquadronCards).to.be.empty
  })
})
