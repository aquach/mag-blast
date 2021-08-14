import { io } from 'socket.io-client'
import _ from 'lodash'
import {
  Action,
  GameError,
  PlayerId,
  UIGameState,
  UILobbyState,
} from '@shared-types'
import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { Board } from './board'
import { Hand, ShipCardComponent, ShipCardSelector } from './hand'

const gameId = _.last(window.location.pathname.split('/')) as string

interface UIErrorState {
  type: 'UIErrorState'
  text: JSX.Element
}

interface Comms {
  uiState: UILobbyState | UIGameState | UIErrorState | null
  performAction(a: Action): void
  startGame(): void
}

function useComms(playerId: string): Comms {
  const [comms, setComms] = useState<Comms>({
    uiState: null,
    performAction() {},
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
        startGame() {},
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return comms
}

const EventLog: React.FunctionComponent<{ eventLog: string[] }> = ({
  eventLog,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [eventLog])

  return (
    <div
      className="code ba pa1 overflow-y-scroll"
      style={{ width: '20em', flexShrink: 0, height: 'calc(100vh - 1rem)' }}
    >
      {eventLog.map((l, i) => (
        <p key={i}>{l}</p>
      ))}

      <div ref={bottomRef} />
    </div>
  )
}

const Game: React.FunctionComponent<{
  comms: Comms
  uiState: UIGameState
  clientPlayerId: PlayerId
}> = ({ comms, uiState, clientPlayerId }) => {
  const prompt = uiState.prompt

  const passOptions =
    prompt !== undefined && prompt.type === 'ChooseShipPrompt'
      ? prompt.pass
      : undefined
  const canPass = passOptions !== undefined

  const canCancel =
    prompt !== undefined &&
    prompt.type === 'ChooseShipPrompt' &&
    prompt.canCancel

  return (
    <div className="flex ma2">
      <EventLog eventLog={uiState.eventLog} />
      <div className="ml2">
        <Board
          board={uiState.playerState}
          clientPlayerId={clientPlayerId}
          prompt={prompt}
          performAction={comms.performAction}
        />

        {prompt && <h3 className="ma1 mv2">{prompt.text}</h3>}
        {prompt && prompt.type === 'PlaceShipPrompt' && (
          <ShipCardComponent
            shipType={prompt.newShip}
            onClick={_.noop}
            clickable={false}
            selected={false}
          />
        )}
        {prompt && prompt.type === 'ChooseShipCardPrompt' && (
          <ShipCardSelector
            prompt={prompt}
            performAction={comms.performAction}
          />
        )}

        {canPass ? (
          <button
            className="ma1 pa1 f5"
            onClick={() =>
              comms.performAction({
                type: 'PassAction',
              })
            }
          >
            {passOptions?.actionText}
          </button>
        ) : null}

        {canCancel ? (
          <button
            className="ma1 pa1 f5"
            onClick={() =>
              comms.performAction({
                type: 'CancelAction',
              })
            }
          >
            Cancel ↩
          </button>
        ) : null}

        <Hand
          hand={uiState.playerHand}
          prompt={prompt}
          performAction={comms.performAction}
        />
      </div>
    </div>
  )
}

const Lobby: React.FunctionComponent<{
  players: string[]
  startGame: () => void
}> = ({ players, startGame }) => {
  return (
    <div className="flex flex-column vh-100 w-100 justify-center items-center">
      <h1 className="mv2">Lobby: {gameId}</h1>
      <h3 className="mv2">Share this link: <a href={window.location.href}>{window.location.href}</a></h3>

      <button className="mv2 pa1" onClick={startGame}>Start Game</button>

      <h3 className="mv2">Players</h3>

      {players.map((p, i) => (
        <p className="ma0" key={i}>
          {p}
        </p>
      ))}
    </div>
  )
}

const ConnectedApp: React.FunctionComponent<{ playerId: string }> = ({
  playerId,
}) => {
  const comms = useComms(playerId)

  const uiState = comms.uiState

  if (uiState === null) {
    return (
      <div className="flex flex-column vh-100 w-100 justify-center items-center f1">
        Loading...
      </div>
    )
  }

  switch (uiState.type) {
    case 'UIErrorState':
      return (
        <div className="flex flex-column vh-100 w-100 justify-center items-center">
          <div className="measure">{uiState.text}</div>
        </div>
      )
    case 'UILobbyState':
      return <Lobby players={uiState.playerIds} startGame={comms.startGame} />
    case 'UIGameState':
      return <Game clientPlayerId={playerId} comms={comms} uiState={uiState} />
  }
}

const App: React.FunctionComponent = () => {
  const [playerInfo, setPlayerInfo] = useState<{
    confirmed: boolean
    playerId: string
  }>({ confirmed: false, playerId: '' })

  if (playerInfo.confirmed) {
    return <ConnectedApp playerId={playerInfo.playerId} />
  }

  return (
    <div className="flex flex-column vh-100 w-100 justify-center items-center">
      <h1>Join Mag Blast Game {gameId}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setPlayerInfo({ ...playerInfo, confirmed: true })
        }}
      >
        <input
          placeholder="Player name"
          className="h2"
          onChange={(e) =>
            setPlayerInfo({ ...playerInfo, playerId: e.target.value })
          }
        ></input>
        <input type="submit" className="ma1 pa1 h2" value="Join" />
      </form>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
