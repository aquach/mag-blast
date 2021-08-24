import _ from 'lodash'
import { ActionCard, EventLogEntry, ShipCard } from '@shared-types'
import React, { useEffect, useRef, Fragment } from 'react'
import { CommandShip } from './board'
import { ActionCardComponent, ShipCardComponent } from './hand'
import ReactTooltip from 'react-tooltip'

export const CardLink: React.FunctionComponent<{ card: ActionCard }> = ({
  card,
}) => {
  const id = _.uniqueId()
  return (
    <Fragment>
      <span className="b underline" data-tip data-for={id}>
        {card.name}
      </span>
      <ReactTooltip
        id={id}
        place="bottom"
        type="light"
        effect="solid"
        className="tooltip"
        clickable
      >
        <ActionCardComponent
          card={card}
          clickable={false}
          selected={false}
          onClick={_.noop}
        />
      </ReactTooltip>
    </Fragment>
  )
}

export const ShipLink: React.FunctionComponent<{ shipCard: ShipCard }> = ({
  shipCard,
}) => {
  const id = _.uniqueId()
  return (
    <Fragment>
      <span className="b underline" data-tip data-for={id}>
        {shipCard.name} ({shipCard.shipClass})
      </span>
      <ReactTooltip
        id={id}
        place="bottom"
        type="light"
        effect="solid"
        className="tooltip"
      >
        <ShipCardComponent
          shipType={shipCard}
          clickable={false}
          selected={false}
          onClick={_.noop}
        />
      </ReactTooltip>
    </Fragment>
  )
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
            return <ShipLink key={j} shipCard={t.shipType} />

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
            return <CardLink key={j} card={t.card} />
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
export const EventLog: React.FunctionComponent<{ eventLog: EventLogEntry[] }> =
  ({ eventLog }) => {
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      bottomRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, [eventLog])

    return (
      <Fragment>
        {eventLog.map((l, i) => (
          <EventLogEntryComponent entry={l} key={i} />
        ))}
        <div ref={bottomRef} />
      </Fragment>
    )
  }
