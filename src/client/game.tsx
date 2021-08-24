import _ from 'lodash'
import {
  AttackMode,
  ATTACK_MODES,
  PlayerId,
  Prompt,
  UIGameSettings,
  UIGameState,
} from '@shared-types'
import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { Board } from './board'
import { Hand, ShipCardComponent, ShipCardSelector } from './hand'
import { Comms, useComms } from './comms'
import { CardLink, EventLog, ShipLink } from './event-log'
import ReactTooltip from 'react-tooltip'

const gameId = _.last(window.location.pathname.split('/')) as string

const DeckDisplay: React.FunctionComponent<{
  text: string | JSX.Element
  value: string | number
}> = ({ text, value }) => {
  return (
    <div className="flex justify-center f5">
      <div style={{ width: '8rem' }} className="tr mh1">
        {text}
      </div>
      <div className="w1 mh1">{value}</div>
    </div>
  )
}

function usePrevious<T, U>(value: T, beginningValue: U): T | U {
  // The ref object is a generic container whose current property is mutable ...
  // ... and can hold any value, similar to an instance property on a class
  const ref = useRef<T | U>(beginningValue)
  // Store current value in ref
  useEffect(() => {
    ref.current = value
  }, [value]) // Only re-run if value changes
  // Return previous value (happens before update in useEffect above)
  return ref.current
}

const TurnAlert: React.FunctionComponent<{
  prompt: Prompt
  playSounds: boolean
}> = ({ prompt, playSounds }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const previousPrompt = usePrevious(prompt, null)

  useEffect(() => {
    if (
      playSounds &&
      previousPrompt !== null &&
      previousPrompt.type === 'NoPrompt' &&
      prompt.type !== 'NoPrompt'
    ) {
      if (document.hidden && audioRef.current !== null) {
        audioRef.current.play()
      }
    }
  }, [JSON.stringify(prompt)])

  return <audio src="/beep.mp3" ref={audioRef} />
}

const DeckData: React.FunctionComponent<{
  uiState: UIGameState
}> = ({ uiState }) => {
  return (
    <div className="pa2">
      <DeckDisplay text="Action Deck" value={uiState.actionDeckSize} />
      <DeckDisplay
        text="Action Discard"
        value={uiState.actionDiscardDeck.length}
      />
      <DeckDisplay text="Ship Deck" value={uiState.shipDeckSize} />
      <DeckDisplay
        text="Ship Discard"
        value={uiState.shipDiscardDeck.length}
      />
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
    prompt.type === 'ChooseShipPrompt' ? prompt.pass : undefined
  const canPass = passOptions !== undefined

  const canCancel =
    (prompt.type === 'ChooseShipPrompt' || prompt.type === 'ChoicePrompt') &&
    prompt.canCancel

  const canActivateAbility = uiState.commandShipAbilityPrompt !== undefined
  const canActivateMinesweeper = uiState.minesweeperAbilityPrompt !== undefined

  const error = uiState.actionError

  const [showError, setShowError] = useState(false)

  useEffect(() => {
    setShowError(true)
    const h = setTimeout(() => setShowError(false), 3000)
    return () => clearTimeout(h)
  }, [JSON.stringify(error)])

  const [playSounds, setPlaySounds] = useState(true)

  type TabType = 'event-log' | 'action-discard' | 'ship-discard'
  const [tab, setTab] = useState<TabType>('event-log')

  const tabs: Record<TabType, string> = {
    'event-log': 'Event Log',
    'action-discard': 'Action Discard Pile',
    'ship-discard': 'Ship Discard Pile',
  }

  return (
    <div className="flex ma2">
      <div>
        <div className="flex justify-between">
          {Object.entries(tabs).map(([key, name]) => (
            <div
              key={key}
              className={`f6 pa1 ${tab === key ? 'b' : 'underline pointer'}`}
              style={{ textDecorationStyle: 'solid' }}
              onClick={() => setTab(key as TabType)}
            >
              {name}
            </div>
          ))}
        </div>
        <div
          className="ba pa1 overflow-y-scroll"
          style={{
            width: '22em',
            flexShrink: 0,
            height: 'calc(100vh - 11rem)',
          }}
        >
          {tab === 'event-log' ? (
            <EventLog eventLog={uiState.eventLog} />
          ) : null}
          {tab === 'action-discard'
            ? uiState.actionDiscardDeck.map((d) => (
                <div className="pv1">
                  <CardLink card={d} />
                </div>
              ))
            : null}
          {tab === 'ship-discard'
            ? uiState.shipDiscardDeck.map((d) => (
                <div className="pv1">
                  <ShipLink shipCard={d} />
                </div>
              ))
            : null}
        </div>

        <div className="flex">
          <DeckData uiState={uiState} />
          <div className="pa2">
            <TurnAlert prompt={prompt} playSounds={playSounds} />
            <input
              type="checkbox"
              checked={playSounds}
              onChange={(e) => setPlaySounds(e.target.checked)}
            />
            <span className="pa1">Sounds</span>
          </div>
        </div>
      </div>

      <div className="ml2">
        <Board
          board={uiState.playerState}
          clientPlayerId={clientPlayerId}
          prompt={prompt}
          performAction={comms.performAction}
        />

        {prompt && <h3 className="ma1 mv2">{prompt.text}</h3>}
        {showError && error && <h3 className="ma1 mv2 red">{error.message}</h3>}
        {prompt && prompt.type === 'PlaceShipPrompt' && (
          <div className="flex">
            {prompt.newShips.map((s, i) => (
              <ShipCardComponent
                key={i}
                shipType={s}
                onClick={_.noop}
                clickable={false}
                selected={i === 0}
              />
            ))}
          </div>
        )}
        {prompt && prompt.type === 'ChooseShipCardPrompt' && (
          <ShipCardSelector
            prompt={prompt}
            performAction={comms.performAction}
          />
        )}
        {prompt &&
          prompt.type === 'ChoicePrompt' &&
          prompt.choices.map((c, i) => (
            <button
              key={i}
              className="ma1 pa1 f5"
              onClick={() =>
                comms.performAction({
                  type: 'ChooseAction',
                  choice: c,
                })
              }
            >
              {c}
            </button>
          ))}

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

        {canActivateAbility ? (
          <button
            className="ma1 pa1 f5"
            onClick={() =>
              comms.performAction({
                type: 'ActivateCommandShipAbilityAction',
              })
            }
          >
            Activate Command Ship Ability ✨
          </button>
        ) : null}

        {canActivateMinesweeper ? (
          <button
            className="ma1 pa1 f5"
            onClick={() =>
              comms.performAction({
                type: 'ActivateMinesweeperAbilityAction',
              })
            }
          >
            Activate Minesweeper Ability 🧹
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
  gameSettings: UIGameSettings
  setSettings: (_: UIGameSettings) => void
}> = ({ players, startGame, gameSettings, setSettings }) => {
  return (
    <div className="flex flex-column vh-100 w-100 justify-center items-center">
      <h1 className="mv2">Lobby: {gameId}</h1>
      <h3 className="mv2">
        Share this link:{' '}
        <a href={window.location.href}>{window.location.href}</a>
      </h3>

      <button className="mv2 pa1" onClick={startGame}>
        Start Game
      </button>

      <h3 className="mv2">Settings</h3>

      <h4 className="mv1">Attack Mode (who can you attack?)</h4>

      <div className="flex flex-column">
        {ATTACK_MODES.map((m, i) => (
          <div className="pa1" key={i}>
            <input
              type="radio"
              id={m.attackMode}
              name="attackMode"
              value={m.attackMode}
              checked={gameSettings.attackMode === m.attackMode}
              onChange={(e) =>
                setSettings({
                  ...gameSettings,
                  attackMode: e.target.value as AttackMode,
                })
              }
            />
            &nbsp;
            <label htmlFor={m.attackMode}>
              {m.name}: {m.description}
            </label>
          </div>
        ))}
      </div>

      <h3 className="mv3">Players</h3>

      {players.map((p, i) => (
        <p className="ma0" key={i}>
          {p}
        </p>
      ))}
    </div>
  )
}

const ConnectedApp: React.FunctionComponent<{ playerId: PlayerId }> = ({
  playerId,
}) => {
  const comms = useComms(gameId, playerId)

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
      return (
        <Lobby
          players={uiState.playerIds}
          startGame={comms.startGame}
          gameSettings={uiState.gameSettings}
          setSettings={comms.setGameSettings}
        />
      )
    case 'UIGameState':
      return <Game clientPlayerId={playerId} comms={comms} uiState={uiState} />
  }
}

const App: React.FunctionComponent = () => {
  const [playerInfo, setPlayerInfo] = useState<{
    confirmed: boolean
    playerId: PlayerId
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
          if (playerInfo.playerId.length > 0) {
            setPlayerInfo({ ...playerInfo, confirmed: true })
          }
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
