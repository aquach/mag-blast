import _ from 'lodash'
import {
  Action,
  Prompt,
  ActionCard,
  ShipCard,
  ChooseShipCardPrompt,
} from '@shared-types'
import React, { Fragment, useState } from 'react'
import { TurretMarker } from './board'

const cardNameBreaks: Record<string, JSX.Element> = {
  Reinforcements: (
    <Fragment>
      Reinforce-
      <br />
      ments
    </Fragment>
  ),
  'Catastrophic Damage': (
    <Fragment>
      Catas-
      <br />
      trophic
      <br />
      Damage
    </Fragment>
  ),
}

const ActionCard: React.FunctionComponent<{
  card: ActionCard
  onClick: () => void
  clickable: boolean
  selected: boolean
}> = ({ card, onClick, clickable, selected }) => {
  const bgColor = (() => {
    if (card.isBlast) {
      switch (card.cardType) {
        case 'LaserBlastCard':
          return 'blast-laser'
        case 'BeamBlastCard':
          return 'blast-beam'
        case 'MagBlastCard':
          return 'blast-mag'
        default:
          return ''
      }
    } else {
      return 'bg-light-gray'
    }
  })()
  const interactionClass = (() => {
    if (selected) {
      return 'selected'
    } else if (clickable) {
      return 'clickable'
    }
  })()

  return (
    <div
      className={`ba br1 pa1 mh1 relative ${bgColor} ${
        clickable ? 'pointer' : ''
      } ${interactionClass ?? ''}`}
      style={{ width: '5.5rem', height: '9.9rem' }}
      onClick={clickable ? onClick : _.noop}
    >
      <p className="f6 tc mt4 mb1 b">
        {cardNameBreaks[card.name] ?? card.name}
      </p>
      <p className="f8 tc">{card.text}</p>
      {card.damage > 0 && (
        <div
          className="absolute red f4"
          style={{
            bottom: 0,
            right: 0,
            padding: '0.125rem 0.25rem',
            borderLeft: '1px solid',
            borderTop: '1px solid',
            background: 'white',
          }}
        >
          {card.damage}
        </div>
      )}
      <div
        className="absolute f4"
        style={{
          top: 0,
          right: 0,
          padding: '0.125rem 0.25rem',
        }}
      >
        {_.repeat('S', card.resources.stars)}
        {_.repeat('D', card.resources.diamonds)}
        {_.repeat('C', card.resources.circles)}
      </div>
    </div>
  )
}

export const Hand: React.FunctionComponent<{
  hand: ActionCard[]
  prompt: Prompt | undefined
  performAction: (a: Action) => void
}> = ({ hand, prompt, performAction }) => {
  const [selectedCards, setSelectedCards] = useState<number[]>([])

  const passOptions =
    prompt !== undefined && prompt.type === 'ChooseCardPrompt'
      ? prompt.pass
      : undefined
  const canPass = passOptions !== undefined

  const multiSelectOptions =
    prompt !== undefined && prompt.type === 'ChooseCardPrompt'
      ? prompt.multiselect
      : undefined
  const canMultiselect = multiSelectOptions !== undefined

  const actionText = multiSelectOptions?.actionText

  return (
    <div>
      {canPass ? (
        <button
          className="ma1 pa1 f5"
          onClick={() =>
            performAction({
              type: 'PassAction',
            })
          }
        >
          {passOptions?.actionText}
        </button>
      ) : null}

      {canMultiselect ? (
        <button
          className="ma1 pa1 f5"
          onClick={() => {
            performAction({
              type: 'ChooseCardAction',
              handIndex: selectedCards,
            })
            setSelectedCards([])
          }}
        >
          {actionText}
        </button>
      ) : null}

      <div className="flex mv1">
        {hand.map((c, i) => {
          const clickable =
            prompt !== undefined &&
            prompt.type === 'ChooseCardPrompt' &&
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
              : performAction({ type: 'ChooseCardAction', handIndex: i })
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

export const shipClassBreaks: Record<string, JSX.Element> = {
  Dreadnought: (
    <Fragment>
      Dread-
      <br />
      nought
    </Fragment>
  ),
  Minesweeper: (
    <Fragment>
      Mine-
      <br />
      sweeper
    </Fragment>
  ),
}

export const ShipCardComponent: React.FunctionComponent<{
  shipType: ShipCard
  onClick: () => void
  clickable: boolean
  selected: boolean
}> = ({ shipType, onClick, clickable, selected }) => {
  return (
    <div
      className={`ba br1 ma1 pa1 bg-light-gray relative ${
        clickable ? 'clickable pointer' : ''
      } ${selected ? 'selected' : ''}`}
      style={{ width: '4rem', height: '7.2rem' }}
      onClick={onClick}
    >
      <p className="f7 tc mb1 b" style={{ marginTop: '1.75rem' }}>
        {shipType.name}
      </p>
      <p className="f8 tc mt1">
        {shipClassBreaks[shipType.shipClass] ?? shipType.shipClass}
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
        {shipType.movement}
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
        {shipType.hp}
      </div>
      <div
        className="absolute"
        style={{
          bottom: 0,
          left: 0,
        }}
      >
        <TurretMarker type="laser" active={shipType.firesLasers} />
        <TurretMarker type="beam" active={shipType.firesBeams} />
        <TurretMarker type="mag" active={shipType.firesMags} />
      </div>
    </div>
  )
}

export const ShipCardSelector: React.FunctionComponent<{
  prompt: ChooseShipCardPrompt
  performAction: (a: Action) => void
}> = ({ prompt, performAction }) => {
  const [selectedCards, setSelectedCards] = useState<number[]>([])

  const canMultiselect = prompt.multiselect !== undefined
  const actionText = prompt.multiselect?.actionText

  return (
    <div>
      {canMultiselect ? (
        <button
          className="ma1 pa1 f5"
          onClick={() => {
            performAction({
              type: 'ChooseCardAction',
              handIndex: selectedCards,
            })
            setSelectedCards([])
          }}
        >
          {actionText}
        </button>
      ) : null}

      <div className="flex mv1">
        {prompt.ships.map((s, i) => {
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
              : performAction({ type: 'ChooseCardAction', handIndex: i })
          }

          return (
            <ShipCardComponent
              key={i}
              shipType={s}
              clickable
              selected={canMultiselect && selectedCards.includes(i)}
              onClick={onClick}
            />
          )
        })}
      </div>
    </div>
  )
}
