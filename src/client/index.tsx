import { io } from 'socket.io-client'
import { Action, UIState } from '@shared-types'
import React, { useState, useEffect } from 'react'
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

const App: React.FunctionComponent = () => {
  const comms = useComms()

  if (!comms.uiState) {
    return <div>"Loading..."</div>
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => comms.performAction({ type: 'draw' })}
        style={{
          display: comms.uiState.isActivePlayer ? 'block' : 'none',
        }}
      >
        Draw Card
      </button>
      <div style={{ whiteSpace: 'pre', fontFamily: 'monospace' }}>
        {comms.uiState.eventLog.join('\n')}
      </div>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
