import { io } from 'socket.io-client'
import _ from 'lodash'
import {
  Action,
  Location as ShipLocation,
  PlayerId,
  Prompt,
  ShipCard,
  UIActionCard,
  UICommandShip,
  UIPlayerState,
  UIShip,
  UIState,
} from '@shared-types'
import React, { useState, useEffect, Fragment } from 'react'
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
      className={`ba br1 ma1 pa1 ${clickable ? 'b--gold pointer' : ''}`}
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
      <p>Class: {ship.shipType.shipClass}</p>
      <p>
        HP: {ship.shipType.hp - ship.damage}/{ship.shipType.hp}
      </p>
      <p>Movement: {ship.shipType.movement}</p>
      <p>
        Fires: {ship.shipType.firesLasers ? 'L' : ''}
        {ship.shipType.firesBeams ? 'B' : ''}
        {ship.shipType.firesMags ? 'M' : ''}
      </p>
    </div>
  )
}

const CommandShip: React.FunctionComponent<{
  ship: UICommandShip
  prompt: Prompt | undefined
  performAction: (a: Action) => void
  playerId: PlayerId
}> = ({ ship, prompt, performAction, playerId }) => {
  const clickable =
    prompt !== undefined &&
    prompt.type === 'ChooseShipPrompt' &&
    prompt.allowableCommandShips.includes(playerId)

  return (
    <div
      className={`ba br1 ma1 pa1 ${clickable ? 'b--gold pointer' : ''}`}
      onClick={() =>
        clickable
          ? performAction({
              type: 'ChooseShipAction',
              choice: playerId,
            })
          : undefined
      }
    >
      <p>Name: {ship.shipType.name}</p>
      <p>
        HP: {ship.shipType.hp - ship.damage}/{ship.shipType.hp}
      </p>
    </div>
  )
}

const ShipZone: React.FunctionComponent<{
  ships: UIShip[]
  playerId: PlayerId
  prompt: Prompt | undefined
  performAction: (a: Action) => void
  color: string
}> = ({ ships, playerId, prompt, performAction, color }) => {
  return (
    <div
      className="ma1 flex"
      style={{ backgroundColor: color, filter: 'saturate(0.5)' }}
    >
      {ships.map((ship, i) => (
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

const BoardPlayer: React.FunctionComponent<{
  playerId: PlayerId
  playerState: UIPlayerState
  prompt: Prompt | undefined
  performAction: (a: Action) => void
}> = ({ playerId, playerState, prompt, performAction }) => {
  const shipsByLocation = _.groupBy(
    playerState.ships,
    (s) => s.location
  ) as Record<ShipLocation, UIShip[]>

  return (
    <div className="ph2">
      <h2>{playerId}</h2>

      <div className="flex justify-center">
        <ShipZone
          ships={shipsByLocation['n'] || []}
          playerId={playerId}
          prompt={prompt}
          performAction={performAction}
          color="yellow"
        />
      </div>
      <div className="flex justify-center">
        <ShipZone
          ships={shipsByLocation['w'] || []}
          playerId={playerId}
          prompt={prompt}
          performAction={performAction}
          color="blue"
        />
        <CommandShip
          ship={playerState.commandShip}
          prompt={prompt}
          performAction={performAction}
          playerId={playerId}
        />
        <ShipZone
          ships={shipsByLocation['e'] || []}
          playerId={playerId}
          prompt={prompt}
          performAction={performAction}
          color="green"
        />
      </div>
      <div className="flex justify-center">
        <ShipZone
          ships={shipsByLocation['s'] || []}
          playerId={playerId}
          prompt={prompt}
          performAction={performAction}
          color="red"
        />
      </div>
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
      <div className="flex">
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

const ShipPreview: React.FunctionComponent<{ ship: ShipCard }> = ({ ship }) => {
  return (
    <div className="ba br1 pa1">
      <p>Name: {ship.name}</p>
      <p>Class: {ship.shipClass}</p>
      <p>HP: {ship.hp}</p>
      <p>Movement: {ship.movement}</p>
      <p>
        Fires: {ship.firesLasers ? 'L' : ''}
        {ship.firesBeams ? 'B' : ''}
        {ship.firesMags ? 'M' : ''}
      </p>
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
