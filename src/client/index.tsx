import _ from 'lodash'
import React from 'react'
import ReactDOM from 'react-dom'

const App: React.FunctionComponent = () => {
  const onClick = () => {
    const resp = fetch('/create-game', {
      method: 'POST',
    }).then((r) => r.json())

    resp.then((r) => {
      window.location = `/game/${r.gameId}` as any
    })
  }

  return (
    <div className="flex flex-column vh-100 w-100 justify-center items-center">
      <h1>Mag Blast</h1>
      <button onClick={onClick}>Create Game</button>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
