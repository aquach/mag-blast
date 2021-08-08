import { io } from 'socket.io-client'
import {
  Action,
  PlayerId,
  UIActionCard,
  UIPlayerState,
  UIState,
} from '@shared-types'
import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'

interface Comms {
  uiState: UIState | null
  performAction(a: Action): void
}

function useComms(): Comms {
  const [comms, setComms] = useState<Comms>({
    uiState: null,
    performAction() {},
  })

  useEffect(() => {
    console.log('Connecting to server...')
    const socket = io({
      query: {
        playerId: window.location.hash,
      },
    })

    socket.on('update', (uiState) => {
      setComms({
        uiState,
        performAction(a) {
          socket.emit('action', a)
        },
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return comms
}

const BoardPlayer: React.FunctionComponent<{
  playerId: PlayerId
  playerState: UIPlayerState
}> = ({ playerId, playerState }) => {
  return (
    <div>
      <h2>{playerId}</h2>
      {playerState.ships.map((ship) => (
        <div>
          <p>Name: {ship.shipType.name}</p>
          <p>
            HP: {ship.shipType.hp - ship.damage}/{ship.shipType.hp}
          </p>
          <p>Movement: {ship.shipType.movement}</p>
          <p>Location: {ship.location}</p>
        </div>
      ))}
    </div>
  )
}

const Board: React.FunctionComponent<{ board: Record<PlayerId, UIPlayerState> }> =
  ({ board }) => {
    return (
      <div>
        <h1>Board</h1>
        <div className="flex" style={{ height: '50vh' }}>
          {Object.entries(board).map(([playerId, playerState]) => (
            <BoardPlayer playerId={playerId} playerState={playerState} />
          ))}
        </div>
      </div>
    )
  }

const ActionCard: React.FunctionComponent<{ card: UIActionCard }> = ({
  card,
}) => {
  return (
    <div>
      <p>Name: {card.name}</p>
      <p>Damage: {card.damage}</p>
      <p>Text: {card.text}</p>
    </div>
  )
}

const Hand: React.FunctionComponent<{ hand: UIActionCard[] }> = ({ hand }) => {
  return (
    <div>
      <h1>Hand</h1>
      <div className="ba1 flex">
        {hand.map((c) => (
          <ActionCard card={c} />
        ))}
      </div>
    </div>
  )
}

const App: React.FunctionComponent = () => {
  const comms = useComms()

  const uiState = comms.uiState

  if (!uiState) {
    return <div>"Loading..."</div>
  }

  // playerState: Map<PlayerId, UIPlayerState>
  // prompt: Prompt | undefined

  return (
    <div className="ma2">
      <Board board={uiState.playerState} />

      <Hand hand={uiState.playerHand} />

      <h1>Events</h1>
      <div className="pre code ba pa1">
        {uiState.eventLog.map((l) => (
          <p>{l}</p>
        ))}
      </div>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
