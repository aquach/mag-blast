import {
  Action,
  GameError,
  PlayerId,
  UIGameSettings,
  UIGameState,
  UILobbyState,
} from '@shared-types'
import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

export interface UIErrorState {
  type: 'UIErrorState'
  text: JSX.Element
}

export interface Comms {
  uiState: UILobbyState | UIGameState | UIErrorState | null
  performAction(a: Action): void
  setGameSettings(s: UIGameSettings): void
  startGame(): void
}

export function useComms(gameId: string, playerId: PlayerId): Comms {
  const [comms, setComms] = useState<Comms>({
    uiState: null,
    performAction() {},
    setGameSettings() {},
    startGame() {},
  })

  useEffect(() => {
    console.log('Connecting to server...')
    const socket = io({
      query: {
        playerId,
        gameId,
      },
    })

    socket.on('update', (uiState) => {
      setComms({
        uiState,
        performAction(a) {
          socket.emit('action', a)
        },
        setGameSettings(s) {
          socket.emit('set-settings', s)
        },
        startGame() {
          socket.emit('start-game')
        },
      })
    })

    socket.on('error', (e: GameError) => {
      const text = (() => {
        switch (e.type) {
          case 'GameNotFound':
            return (
              <div>
                Game not found. Click <a href="../">here</a> to return to the
                main page.
              </div>
            )
          case 'TooManyPlayers':
            return <div>This game is already full (8 players).</div>
          case 'TooFewPlayers':
            return (
              <div>
                Can't start a game with just one player. Hope you can find
                someone to play with! Click <a href="../">here</a> to return to
                the main page.
              </div>
            )
          case 'GameAlreadyStartedCantAddNewPlayer':
            return <div>This game has already started, so you can't join.</div>
        }
      })()
      setComms({
        uiState: {
          type: 'UIErrorState',
          text,
        },
        performAction() {},
        setGameSettings() {},
        startGame() {},
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return comms
}
