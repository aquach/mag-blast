import _ from 'lodash'
import {
  Action,
  Location as ShipLocation,
  PlayerId,
  Prompt,
  UICommandShip,
  UIPlayerState,
  UIShip,
} from '@shared-types'
import React, { Fragment } from 'react'

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
        borderTop: '1px solid black',
        borderRight: '1px solid black',
      }}
    />
  )
}

export const BoardShip: React.FunctionComponent<{
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
        clickable ? 'clickable pointer' : ''
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
        {Math.max(ship.shipType.hp - ship.damage, 0)}
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
        clickable ? 'clickable pointer' : ''
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
        {Math.max(ship.shipType.hp - ship.damage, 0)}
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
      className={`ba ma1 flex ${clickable ? 'clickable pointer' : ''}`}
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
    <div className={`ph2 ${!playerState.isAlive ? 'o-50' : ''}`}>
      <h3 className="mt0">
        {playerId} {!playerState.isAlive ? '(Eliminated)' : ''}
      </h3>

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

export const Board: React.FunctionComponent<{
  board: Record<PlayerId, UIPlayerState>
  prompt: Prompt | undefined
  performAction: (a: Action) => void
}> = ({ board, prompt, performAction }) => {
  return (
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
  )
}
