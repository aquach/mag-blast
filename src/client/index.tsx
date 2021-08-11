import { io } from 'socket.io-client'
import _ from 'lodash'
import {
  Action,
  Location as ShipLocation,
  PlayerId,
  Prompt,
  ShipCard,
  ActionCard,
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

const TurretMarker: React.FunctionComponent<{
  color: 'yellow' | 'green' | 'red'
}> = ({ color }) => {
  const colorToHex = {
    yellow: '#fec848',
    green: '#5e9f47',
    red: '#d35e2d',
  }
  return (
    <div
      style={{
        width: '0.75rem',
        height: '0.75rem',
        backgroundColor: colorToHex[color],
      }}
    />
  )
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
      className={`ba br1 ma1 pa1 bg-light-gray relative ${
        clickable ? 'b--gold pointer' : ''
      }`}
      style={{ width: '4rem', height: '7.2rem' }}
      onClick={() =>
        clickable
          ? performAction({
              type: 'ChooseShipAction',
              choice: [playerId, index],
            })
          : undefined
      }
    >
      <p className="f7 tc mt4 mb1 b">{ship.shipType.name}</p>
      <p className="f7 tc mt1">
        {ship.shipType.shipClass === 'Dreadnought' ? (
          <Fragment>
            Dread
            <br />
            nought
          </Fragment>
        ) : (
          ship.shipType.shipClass
        )}
      </p>
      <div
        className="absolute bg-near-black"
        style={{
          top: 0,
          left: 0,
          padding: '0.125rem 0.25rem',
          color: 'white',
        }}
      >
        {ship.shipType.movement}
      </div>
      <div
        className="absolute red"
        style={{
          bottom: 0,
          right: 0,
          padding: '0.125rem 0.25rem',
          borderLeft: '1px solid',
          borderTop: '1px solid',
          background: 'white',
        }}
      >
        {ship.shipType.hp - ship.damage}
      </div>
      <div
        className="absolute"
        style={{
          bottom: 0,
          left: 0,
        }}
      >
        {ship.shipType.firesLasers ? <TurretMarker color="yellow" /> : null}
        {ship.shipType.firesBeams ? <TurretMarker color="green" /> : null}
        {ship.shipType.firesMags ? <TurretMarker color="red" /> : null}
      </div>
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
      className={`ba br1 ma1 pa1 bg-light-gray relative ${
        clickable ? 'b--gold pointer' : ''
      }`}
      style={{ width: '4rem', height: '7.825rem' }}
      onClick={() =>
        clickable
          ? performAction({
              type: 'ChooseShipAction',
              choice: playerId,
            })
          : undefined
      }
    >
      <p className="f6 tc b">{ship.shipType.name}</p>
      <div
        className="absolute red"
        style={{
          bottom: 0,
          right: 0,
          padding: '0.125rem 0.25rem',
          borderLeft: '1px solid',
          borderTop: '1px solid',
          background: 'white',
        }}
      >
        {ship.shipType.hp - ship.damage}
      </div>
    </div>
  )
}

const ShipZone: React.FunctionComponent<{
  shipsWithIndices: [UIShip, number][]
  playerId: PlayerId
  prompt: Prompt | undefined
  performAction: (a: Action) => void
  location: ShipLocation
  color: 'yellow' | 'blue' | 'red' | 'green'
}> = ({
  shipsWithIndices,
  playerId,
  prompt,
  performAction,
  location,
  color,
}) => {
  const clickable =
    prompt !== undefined &&
    (prompt.type === 'PlaceShipPrompt' || prompt.type === 'ChooseZonePrompt') &&
    prompt.allowableZones.includes(location)

  const colorToHex = {
    yellow: '#f2de5f',
    green: '#a0c246',
    red: '#df4d36',
    blue: '#60a3c2',
  }

  return (
    <div
      className={`ba ma1 flex ${clickable ? 'b--gold pointer' : ''}`}
      style={{
        backgroundColor: colorToHex[color],
        minHeight: '6.25rem',
        minWidth: '4rem',
      }}
      onClick={() =>
        clickable
          ? performAction({
              type: 'ChooseZoneAction',
              location,
            })
          : undefined
      }
    >
      {shipsWithIndices.map(([ship, i]) => (
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
  const shipsByLocationWithIndex = _.groupBy(
    playerState.ships.map((s, i) => [s, i]),
    ([s, i]) => s.location
  ) as Record<ShipLocation, [UIShip, number][]>

  return (
    <div className="ph2">
      <h2>{playerId}</h2>

      <div className="flex justify-center">
        <ShipZone
          shipsWithIndices={shipsByLocationWithIndex['n'] || []}
          playerId={playerId}
          prompt={prompt}
          performAction={performAction}
          location="n"
          color="yellow"
        />
      </div>
      <div className="flex justify-center">
        <ShipZone
          shipsWithIndices={shipsByLocationWithIndex['w'] || []}
          playerId={playerId}
          prompt={prompt}
          performAction={performAction}
          location="w"
          color="blue"
        />
        <CommandShip
          ship={playerState.commandShip}
          prompt={prompt}
          performAction={performAction}
          playerId={playerId}
        />
        <ShipZone
          shipsWithIndices={shipsByLocationWithIndex['e'] || []}
          playerId={playerId}
          prompt={prompt}
          performAction={performAction}
          location="e"
          color="green"
        />
      </div>
      <div className="flex justify-center">
        <ShipZone
          shipsWithIndices={shipsByLocationWithIndex['s'] || []}
          playerId={playerId}
          prompt={prompt}
          performAction={performAction}
          location="s"
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
  card: ActionCard
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
        Resources: {'S'.repeat(card.resources.stars)}
        {'C'.repeat(card.resources.circles)}
        {'D'.repeat(card.resources.diamonds)}
      </p>
      {/*<p>Text: {card.text}</p>*/}
    </div>
  )
}

const Hand: React.FunctionComponent<{
  hand: ActionCard[]
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
