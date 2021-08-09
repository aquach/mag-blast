import { io } from 'socket.io-client'
import {
  Action,
  PlayerId,
  Prompt,
  UIActionCard,
  UIPlayerState,
  UIShip,
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

const BoardShip: React.FunctionComponent<{
  ship: UIShip
  prompt: Prompt | undefined
  performAction: (a: Action) => void
  index: number
  playerId: PlayerId
}> = ({ ship, prompt, performAction, index, playerId }) => {
  const clickable =
    prompt !== undefined &&
    prompt.type === 'ChooseShipPrompt' &&
    prompt.allowableShipIndices.some(
      ([pid, i]) => pid === playerId && i === index
    )

  return (
    <div
      className={`ba br1 pa1 ${clickable ? 'b--gold pointer' : ''}`}
      onClick={() =>
        clickable
          ? performAction({
              type: 'ChooseShipAction',
              choice: [playerId, index],
            })
          : undefined
      }
    >
      <p>Name: {ship.shipType.name}</p>
      <p>
        HP: {ship.shipType.hp - ship.damage}/{ship.shipType.hp}
      </p>
      <p>Movement: {ship.shipType.movement}</p>
      <p>Location: {ship.location}</p>
    </div>
  )
}

const BoardPlayer: React.FunctionComponent<{
  playerId: PlayerId
  playerState: UIPlayerState
  prompt: Prompt | undefined
  performAction: (a: Action) => void
}> = ({ playerId, playerState, prompt, performAction }) => {
  return (
    <div className="ph2">
      <h2>{playerId}</h2>
      {playerState.ships.map((ship, i) => (
        <BoardShip
          ship={ship}
          prompt={prompt}
          performAction={performAction}
          index={i}
          playerId={playerId}
        />
      ))}
    </div>
  )
}

const Board: React.FunctionComponent<{
  board: Record<PlayerId, UIPlayerState>
  prompt: Prompt | undefined
  performAction: (a: Action) => void
}> = ({ board, prompt, performAction }) => {
  return (
    <div>
      <h1>Board</h1>
      <div className="flex" style={{ height: '50vh' }}>
        {Object.entries(board).map(([playerId, playerState]) => (
          <BoardPlayer
            playerId={playerId}
            playerState={playerState}
            prompt={prompt}
            performAction={performAction}
          />
        ))}
      </div>
    </div>
  )
}

const ActionCard: React.FunctionComponent<{
  card: UIActionCard
  prompt: Prompt | undefined
  performAction: (a: Action) => void
  index: number
}> = ({ card, prompt, performAction, index }) => {
  const clickable =
    prompt !== undefined &&
    prompt.type === 'PlayCardPrompt' &&
    prompt.playableCardIndices.some((i) => i === index)

  return (
    <div
      className={`ba br1 pa1 mh1 ${clickable ? 'b--gold pointer' : ''}`}
      onClick={() =>
        clickable
          ? performAction({ type: 'PlayCardAction', handIndex: index })
          : null
      }
    >
      <p>Name: {card.name}</p>
      <p>Damage: {card.damage}</p>
      <p>Text: {card.text}</p>
    </div>
  )
}

const Hand: React.FunctionComponent<{
  hand: UIActionCard[]
  prompt: Prompt | undefined
  performAction: (a: Action) => void
}> = ({ hand, prompt, performAction }) => {
  const canPass = prompt !== undefined && prompt.type === 'PlayCardPrompt'

  return (
    <div>
      <h1>Hand</h1>
      <div className="flex">
        {hand.map((c, i) => (
          <ActionCard
            card={c}
            prompt={prompt}
            index={i}
            performAction={performAction}
          />
        ))}
        {canPass ? (
          <button
            onClick={() =>
              performAction({
                type: 'PassAction',
              })
            }
          >
            None
          </button>
        ) : null}
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

  return (
    <div className="ma2">
      <Board
        board={uiState.playerState}
        prompt={uiState.prompt}
        performAction={comms.performAction}
      />

      <Hand
        hand={uiState.playerHand}
        prompt={uiState.prompt}
        performAction={comms.performAction}
      />

      {uiState.prompt && <h3>{uiState.prompt.text}</h3>}

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
