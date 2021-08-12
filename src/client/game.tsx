import { io } from 'socket.io-client'
import _ from 'lodash'
import { Action, UIGameState, UILobbyState } from '@shared-types'
import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Board, BoardShip } from './board'
import { Hand } from './hand'

const gameId = _.last(window.location.pathname.split('/')) as string

interface Comms {
  uiState: UILobbyState | UIGameState | null
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

    return () => {
      socket.disconnect()
    }
  }, [])

  return comms
}

const EventLog: React.FunctionComponent<{ eventLog: string[] }> = ({
  eventLog,
}) => {
  return (
    <div
      className="code ba pa1 overflow-y-scroll"
      style={{ width: '20em', height: 'calc(100vh - 1rem)' }}
    >
      {eventLog.map((l, i) => (
        <p key={i}>{l}</p>
      ))}
    </div>
  )
}

const Game: React.FunctionComponent<{ comms: Comms; uiState: UIGameState }> = ({
  comms,
  uiState,
}) => {
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
          prompt={prompt}
          performAction={comms.performAction}
        />

        {prompt && <h3 className="ma1 mv2">{prompt.text}</h3>}
        {prompt && prompt.type === 'PlaceShipPrompt' && (
          <BoardShip
            ship={{
              location: 'n',
              shipType: prompt.newShip,
              damage: 0,
            }}
            prompt={undefined}
            performAction={_.noop}
            index={0}
            playerId=""
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
      <h1>Lobby: {gameId}</h1>
      <button onClick={startGame}>Start Game</button>

      <h3>Players</h3>

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

  if (!uiState) {
    return <div>Loading...</div>
  }

  switch (uiState.type) {
    case 'UILobbyState':
      return <Lobby players={uiState.playerIds} startGame={comms.startGame} />
    case 'UIGameState':
      return <Game comms={comms} uiState={uiState} />
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
