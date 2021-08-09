import * as express from 'express'
import * as path from 'path'

import * as http from 'http'
import * as _ from 'lodash'
import { Server, Socket } from 'socket.io'

import { Action, PlayerId } from './shared-types'
import { applyAction, newGameState, uiState } from './game'

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.set('etag', false)

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname + '/../client/index.html'))
})

app.get('/client.js', (req, res) => {
  res.sendFile(path.resolve(__dirname + '/../../dist/client.js'))
})

interface PlayerSocketBinding {
  id: PlayerId
  socket: Socket
}

const state = newGameState()

const bindings: PlayerSocketBinding[] = []

io.on('connection', (socket) => {
  const binding: PlayerSocketBinding = {
    id: socket.handshake.query.playerId as string,
    socket,
  }
  bindings.push(binding)

  bindings.forEach((b) => {
    b.socket.emit('update', uiState(b.id, state))
  })

  socket.on('action', (a: Action) => {
    applyAction(state, a)

    bindings.forEach((b) => {
      b.socket.emit('update', uiState(b.id, state))
    })
  })

  socket.on('disconnect', () => {
    _.remove(bindings, (b) => b === binding)
  })
})

server.listen(3000, () => {
  console.log('Listening on port 3000.')
})
