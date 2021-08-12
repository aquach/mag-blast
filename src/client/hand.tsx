import _ from 'lodash'
import { Action, Prompt, ActionCard } from '@shared-types'
import React, { useState } from 'react'

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
      <p className="f6 tc mt4 mb1 b">{card.name}</p>
      <p className="f7 tc">{card.text}</p>
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
    prompt !== undefined && prompt.type === 'SelectCardPrompt'
      ? prompt.pass
      : undefined
  const canPass = passOptions !== undefined

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
              type: 'SelectCardAction',
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
