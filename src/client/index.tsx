import { io } from 'socket.io-client'
import _ from 'lodash'
import {
  Action,
  PlayerId,
  Prompt,
  UIActionCard,
  UIPlayerState,
  UIShip,
  UIShipCard,
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
          key={i}
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
            key={playerId}
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
  onClick: () => void
  clickable: boolean
  selected: boolean
}> = ({ card, onClick, clickable, selected }) => {
  const borderColorClass = (() => {
    if (selected) {
      return 'b--red'
    } else if (clickable) {
      return 'b--gold'
    }
  })()

  return (
    <div
      className={`ba br1 pa1 mh1 ${
        clickable ? 'pointer' : ''
      } ${borderColorClass}`}
      onClick={clickable ? onClick : _.noop}
    >
      <p>Name: {card.name}</p>
      <p>Damage: {card.damage}</p>
      <p>
        Resources: {card.resources.hasStar ? 'S' : ''}
        {card.resources.hasCircle ? 'C' : ''}
        {card.resources.hasDiamond ? 'D' : ''}
      </p>
      <p>Text: {card.text}</p>
    </div>
  )
}

const Hand: React.FunctionComponent<{
  hand: UIActionCard[]
  prompt: Prompt | undefined
  performAction: (a: Action) => void
}> = ({ hand, prompt, performAction }) => {
  const [selectedCards, setSelectedCards] = useState<number[]>([])

  const canPass =
    prompt !== undefined && prompt.type === 'SelectCardPrompt' && prompt.canPass
  const canMultiselect =
    prompt !== undefined &&
    prompt.type === 'SelectCardPrompt' &&
    prompt.multiselect

  return (
    <div>
      <h1>Hand</h1>
      {canPass ? (
        <button
          onClick={() =>
            performAction({
              type: 'PassAction',
            })
          }
        >
          Pass
        </button>
      ) : null}

      {canMultiselect ? (
        <button
          onClick={() => {
            performAction({
              type: 'SelectCardAction',
              handIndex: selectedCards,
            })
            setSelectedCards([])
          }}
        >
          Done
        </button>
      ) : null}

      <div className="flex">
        {hand.map((c, i) => {
          const clickable =
            prompt !== undefined &&
            prompt.type === 'SelectCardPrompt' &&
            prompt.selectableCardIndices.includes(i)

          const toggleSelected = () => {
            setSelectedCards(
              selectedCards.includes(i)
                ? _.without(selectedCards, i)
                : selectedCards.concat(i)
            )
          }

          const onClick = () => {
            canMultiselect
              ? toggleSelected()
              : performAction({ type: 'SelectCardAction', handIndex: i })
          }

          return (
            <ActionCard
              key={i}
              card={c}
              clickable={clickable}
              selected={canMultiselect && selectedCards.includes(i)}
              onClick={clickable ? onClick : _.noop}
            />
          )
        })}
      </div>
    </div>
  )
}

const ShipPreview: React.FunctionComponent<{ ship: UIShipCard }> = ({
  ship,
}) => {
  return (
    <div className="ba br1 pa1">
      <p>Name: {ship.name}</p>
      <p>HP: {ship.hp}</p>
      <p>Movement: {ship.movement}</p>
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

      {uiState.prompt && uiState.prompt.type === 'PlaceShipPrompt' && (
        <ShipPreview ship={uiState.prompt.newShip} />
      )}
      {uiState.prompt && <h3>{uiState.prompt.text}</h3>}

      <h1>Events</h1>
      <div className="pre code ba pa1">
        {uiState.eventLog.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
