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

  s.turnState = { type: 'ManeuverTurnState', originalLocations: new Map() }
  s.activePlayer = 'P1'
  s.playerState.set('P1', {
    hand: [findOriginalActionCard('LaserBlastCard')],
    usedSquadronCards: [],
    ships: [],
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

  s.playerState.set('P2', {
    hand: [
      findOriginalActionCard('LaserBlastCard'),
      findOriginalActionCard('LaserBlastCard'),
      findOriginalActionCard('LaserBlastCard'),
      findOriginalActionCard('LaserBlastCard'),
      findOriginalActionCard('BeamBlastCard'),
      findOriginalActionCard('BeamBlastCard'),
      findOriginalActionCard('BeamBlastCard'),
      findOriginalActionCard('BeamBlastCard'),
    ],
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
      shipType: findOriginalCommandShipCard('TheGlorp'),
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

describe('Freep', () => {
  it('should take three cards', () => {
    const state = gameState()

    const hands = [
      ...state.getPlayerState('P1').hand,
      ...state.getPlayerState('P2').hand,
    ]

    applyAction(state, 'P1', { type: 'ActivateCommandShipAbilityAction' })
    applyAction(state, 'P1', { type: 'ChooseShipAction', choice: 'P2' })

    const handsAfter = [
      ...state.getPlayerState('P1').hand,
      ...state.getPlayerState('P2').hand,
    ]

    expect(eventLogToText(state.eventLog)).to.be.eql([
      'Welcome to Mag Blast!',
      'P1 activates Freep!',
      "P1 takes three cards at random from P2's hand.",
    ])

    expect(state.getPlayerState('P1').hand.length).to.be.eq(4)
    expect(state.getPlayerState('P2').hand.length).to.be.eq(5)
    expect(hands).to.have.members(handsAfter)
  })
})
