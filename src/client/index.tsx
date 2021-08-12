import { io } from 'socket.io-client'
import _ from 'lodash'
import {
  Action,
  Prompt,
  ActionCard,
  UIState,
} from '@shared-types'
import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import {Board, BoardShip} from './board'

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

const ActionCard: React.FunctionComponent<{
  card: ActionCard
  onClick: () => void
  clickable: boolean
  selected: boolean
}> = ({ card, onClick, clickable, selected }) => {
  const borderColorClass = (() => {
    if (selected) {
      return 'selected'
    } else if (clickable) {
      return 'clickable'
    }
  })()

  return (
    <div
      className={`ba br1 pa1 mh1 ${clickable ? 'pointer' : ''} ${
        borderColorClass ?? ''
      }`}
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
  const multiSelectOptions =
    prompt !== undefined && prompt.type === 'SelectCardPrompt'
      ? prompt.multiselect
      : undefined
  const canMultiselect = multiSelectOptions !== undefined

  const actionText = multiSelectOptions?.actionText

  return (
    <div>
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
          {actionText}
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

const App: React.FunctionComponent = () => {
  const comms = useComms()

  const uiState = comms.uiState

  if (!uiState) {
    return <div>Loading...</div>
  }

  const prompt = uiState.prompt

  const canPass =
    prompt !== undefined && prompt.type === 'ChooseShipPrompt' && prompt.canPass

  return (
    <div className="flex ma2">
      <EventLog eventLog={uiState.eventLog} />
      <div className="ml2">
        <Board
          board={uiState.playerState}
          prompt={prompt}
          performAction={comms.performAction}
        />

        {prompt && <h3>{prompt.text}</h3>}
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
            onClick={() =>
              comms.performAction({
                type: 'PassAction',
              })
            }
          >
            Pass
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

ReactDOM.render(<App />, document.getElementById('root'))
