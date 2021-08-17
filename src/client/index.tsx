import _ from 'lodash'
import React from 'react'
import ReactDOM from 'react-dom'

declare var GIT_VERSION: string

const App: React.FunctionComponent = () => {
  const onClick = () => {
    const resp = fetch('create-game', {
      method: 'POST',
    }).then((r) => r.json())

    resp.then((r) => {
      window.location = `game/${r.gameId}` as any
    })
  }

  return (
    <div className="flex flex-column vh-100 w-100 justify-center items-center">
      <h1>Mag Blast</h1>
      <button className="f4" onClick={onClick}>
        Create Game
      </button>
      <div className="flex mv2">
        <h4 className="mv0 mh1">
          <a href="https://images-cdn.fantasyflightgames.com/filer_public/6b/8a/6b8a9492-f27c-423b-b568-2032d4c3c300/mb_rules.pdf">
            Rules
          </a>
        </h4>
        <h4 className="mv0 mh1">
          <a href="https://github.com/aquach/mag-blast">GitHub</a>
        </h4>
      </div>
      <h6 className="mv0">Version: {GIT_VERSION.substr(0, 6)}</h6>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
