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
import { shipClassBreaks } from './hand'
import ReactTooltip from 'react-tooltip'

export const TurretMarker: React.FunctionComponent<{
  type: 'laser' | 'beam' | 'mag'
  active: boolean
}> = ({ type, active }) => {
  return (
    <div
      className={`${active ? `blast-${type}` : ''} tc`}
      style={{
        fontSize: '0.6em',
        width: '0.75rem',
        height: '0.75rem',
        borderTop: '1px solid black',
        borderRight: '1px solid black',
      }}
    >
      {active ? type[0].toUpperCase() : ''}
    </div>
  )
}

export const BoardShip: React.FunctionComponent<{
  ship: UIShip
  prompt: Prompt
  performAction: (a: Action) => void
  index: number
  playerId: PlayerId
}> = ({ ship, prompt, performAction, index, playerId }) => {
  const clickable =
    prompt.type === 'ChooseShipPrompt' &&
    prompt.allowableShipIndices.some(
      ([pid, i]) => pid === playerId && i === index
    )

  return (
    <div
      className={`ba br1 ma1 pa1 ${
        ship.hasFiredThisTurn ? 'bg-light-silver' : 'bg-light-gray'
      } relative ${clickable ? 'clickable pointer' : ''}`}
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
      <p className="f7 tc mb1 b" style={{ marginTop: '1.75rem' }}>
        {ship.shipType.name}
      </p>
      <p className="f7 tc mt1">
        {shipClassBreaks[ship.shipType.shipClass] ?? ship.shipType.shipClass}
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
        <TurretMarker type="laser" active={ship.shipType.firesLasers} />
        <TurretMarker type="beam" active={ship.shipType.firesBeams} />
        <TurretMarker type="mag" active={ship.shipType.firesMags} />
      </div>
    </div>
  )
}

const commandShipBreaks: Record<string, JSX.Element> = {
  BZZGZZRT: (
    <Fragment>
      BZZG-
      <br />
      ZZRT!
    </Fragment>
  ),
  BrotherhoodOfPeace: (
    <Fragment>
      Brother-
      <br />
      hood
      <br />
      of Peace
    </Fragment>
  ),
  CraniumConsortium: (
    <Fragment>
      Cranium
      <br />
      Consor-
      <br />
      tium
    </Fragment>
  ),
  Recyclonsv40K: (
    <Fragment>
      Recy-
      <br />
      clons
      <br />
      v40K
    </Fragment>
  ),
}

const CommandShip: React.FunctionComponent<{
  ship: UICommandShip
  prompt: Prompt
  performAction: (a: Action) => void
  playerId: PlayerId
  expanded?: boolean
}> = ({ ship, prompt, performAction, playerId, expanded }) => {
  const clickable =
    prompt.type === 'ChooseShipPrompt' &&
    prompt.allowableCommandShips.includes(playerId)

  return (
    <div
      className={`ba br1 ma1 pa1 bg-light-gray relative ${
        clickable ? 'clickable pointer' : ''
      }`}
      style={
        expanded
          ? { width: '6rem', height: '11.73em' }
          : { width: '4rem', height: '7.825rem' }
      }
      onClick={() =>
        clickable
          ? performAction({
              type: 'ChooseShipAction',
              choice: playerId,
            })
          : undefined
      }
      data-tip
      data-for={ship.shipType.commandType}
    >
      <p className="f7 tc b">
        {commandShipBreaks[ship.shipType.commandType] ?? ship.shipType.name}
      </p>
      {expanded && <p className="f8 tc">{ship.shipType.text}</p>}
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

      {!expanded && (
        <ReactTooltip
          id={ship.shipType.commandType}
          place="bottom"
          type="light"
          effect="solid"
          className="tooltip"
        >
          <CommandShip
            ship={ship}
            prompt={{ type: 'NoPrompt', text: '' }}
            expanded
            performAction={_.noop}
            playerId={playerId}
          />
        </ReactTooltip>
      )}
    </div>
  )
}

const ShipZone: React.FunctionComponent<{
  shipsWithIndices: [UIShip, number][]
  playerId: PlayerId
  clientPlayerId: PlayerId
  prompt: Prompt
  performAction: (a: Action) => void
  location: ShipLocation
  color: 'yellow' | 'blue' | 'red' | 'green'
}> = ({
  shipsWithIndices,
  playerId,
  clientPlayerId,
  prompt,
  performAction,
  location,
  color,
}) => {
  const clickable =
    ((prompt.type === 'PlaceShipPrompt' && playerId === clientPlayerId) ||
      (prompt.type === 'ChooseZonePrompt' && playerId === prompt.player)) &&
    prompt.allowableZones.includes(location)

  const colorToHex = {
    yellow: '#f2de5f',
    green: '#a0c246',
    red: '#ff7f6b',
    blue: '#60a3c2',
  }

  return (
    <div
      className={`ba ma1 flex ${clickable ? 'clickable pointer' : ''}`}
      style={{
        backgroundColor: colorToHex[color],
        minHeight: '7.75rem',
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
  prompt: Prompt
  performAction: (a: Action) => void
  clientPlayerId: PlayerId
}> = ({ playerId, playerState, prompt, performAction, clientPlayerId }) => {
  const shipsByLocationWithIndex = _.groupBy(
    playerState.ships.map((s, i) => [s, i]),
    ([s, i]) => s.location
  ) as Record<ShipLocation, [UIShip, number][]>

  return (
    <div
      className={`ph2 pa1 ${!playerState.isAlive ? 'o-50' : ''} ${
        playerState.hasAsteroids ? 'ba bw1 b--dark-blue' : ''
      } ${playerState.hasMinefield ? 'bg-washed-red' : ''} `}
    >
      <h3 className="mt0">
        {playerId} {playerId === clientPlayerId ? '(You)' : ''}{' '}
        {!playerState.isAlive ? '(Eliminated)' : ''}{' '}
        {playerState.hasAsteroids ? '(Asteroids)' : ''}{' '}
        {playerState.hasMinefield ? '(Minefielded)' : ''}
      </h3>

      <div className="flex justify-center">
        <ShipZone
          clientPlayerId={clientPlayerId}
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
          clientPlayerId={clientPlayerId}
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
          clientPlayerId={clientPlayerId}
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
          clientPlayerId={clientPlayerId}
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
  board: [PlayerId, UIPlayerState][]
  prompt: Prompt
  performAction: (a: Action) => void
  clientPlayerId: PlayerId
}> = ({ board, prompt, performAction, clientPlayerId }) => {
  return (
    <div className="flex">
      {board.map(([playerId, playerState]) => (
        <BoardPlayer
          key={playerId}
          playerId={playerId}
          clientPlayerId={clientPlayerId}
          playerState={playerState}
          prompt={prompt}
          performAction={performAction}
        />
      ))}
    </div>
  )
}
