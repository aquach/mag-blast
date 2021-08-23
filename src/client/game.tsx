import { io } from 'socket.io-client'
import _ from 'lodash'
import {
  Action,
  AttackMode,
  ATTACK_MODES,
  EventLogEntry,
  GameError,
  PlayerId,
  Prompt,
  UIGameSettings,
  UIGameState,
  UILobbyState,
} from '@shared-types'
import React, { useState, useEffect, useRef, Fragment } from 'react'
import ReactDOM from 'react-dom'
import { Board, CommandShip } from './board'
import {
  ActionCardComponent,
  Hand,
  ShipCardComponent,
  ShipCardSelector,
} from './hand'
import ReactTooltip from 'react-tooltip'

const gameId = _.last(window.location.pathname.split('/')) as string

interface UIErrorState {
  type: 'UIErrorState'
  text: JSX.Element
}

interface Comms {
  uiState: UILobbyState | UIGameState | UIErrorState | null
  performAction(a: Action): void
  setGameSettings(s: UIGameSettings): void
  startGame(): void
}

function useComms(playerId: PlayerId): Comms {
  const [comms, setComms] = useState<Comms>({
    uiState: null,
    performAction() {},
    setGameSettings() {},
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
        setGameSettings(s) {
          socket.emit('set-settings', s)
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
        setGameSettings() {},
        startGame() {},
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return comms
}

const EventLogEntryComponent: React.FunctionComponent<{
  entry: EventLogEntry
}> = ({ entry }) => {
  return (
    <div className="mv2">
      {entry.tokens.map((t, j) => {
        const id = _.uniqueId()
        switch (t.type) {
          case 'ShipEventLogToken':
            return (
              <Fragment key={j}>
                <span className="b underline" data-tip data-for={id}>
                  {t.shipType.name}
                </span>
                <ReactTooltip
                  id={id}
                  place="bottom"
                  type="light"
                  effect="solid"
                  className="tooltip"
                >
                  <ShipCardComponent
                    shipType={t.shipType}
                    clickable={false}
                    selected={false}
                    onClick={_.noop}
                  />
                </ReactTooltip>
              </Fragment>
            )

          case 'TextEventLogToken':
            return (
              <span key={j} className={t.bold ? 'b' : ''}>
                {t.text}
              </span>
            )
          case 'CommandShipEventLogToken':
            return (
              <Fragment key={j}>
                <span className="b underline" data-tip data-for={id}>
                  {t.commandShipType.name}
                </span>
                <ReactTooltip
                  id={id}
                  place="bottom"
                  type="light"
                  effect="solid"
                  className="tooltip"
                >
                  <CommandShip
                    ship={{
                      shipType: t.commandShipType,
                      damage: 0,
                      remainingAbilityActivations:
                        t.commandShipType.numAbilityActivations,
                    }}
                    prompt={{ type: 'NoPrompt', text: '' }}
                    performAction={_.noop}
                    playerId=""
                    expanded
                  />
                </ReactTooltip>
              </Fragment>
            )
          case 'ActionCardEventLogToken':
            return (
              <Fragment key={j}>
                <span className="b underline" data-tip data-for={id}>
                  {t.card.name}
                </span>
                <ReactTooltip
                  id={id}
                  place="bottom"
                  type="light"
                  effect="solid"
                  className="tooltip"
                >
                  <ActionCardComponent
                    card={t.card}
                    clickable={false}
                    selected={false}
                    onClick={_.noop}
                  />
                </ReactTooltip>
              </Fragment>
            )
          case 'PlayerEventLogToken':
            return (
              <span key={j} className="b">
                {t.player}
              </span>
            )
        }
      })}
    </div>
  )
}

const EventLog: React.FunctionComponent<{ eventLog: EventLogEntry[] }> = ({
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
      className="ba pa1 overflow-y-scroll"
      style={{ width: '20em', flexShrink: 0, height: 'calc(100vh - 7rem)' }}
    >
      {eventLog.map((l, i) => (
        <EventLogEntryComponent entry={l} key={i} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

const DeckDisplay: React.FunctionComponent<{
  text: string
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

  return (
    <div className="flex ma2">
      <div>
        <EventLog eventLog={uiState.eventLog} />
        <div className="flex">
          <div className="pa1">
            <DeckDisplay text="Action Deck" value={uiState.actionDeckSize} />
            <DeckDisplay
              text="Action Discard"
              value={uiState.actionDiscardDeckSize}
            />
            <DeckDisplay text="Ship Deck" value={uiState.shipDeckSize} />
            <DeckDisplay
              text="Ship Discard"
              value={uiState.shipDiscardDeckSize}
            />
          </div>
          <div className="pa1">
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
