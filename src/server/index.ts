import * as path from 'path'
import * as crypto from 'crypto'
import * as http from 'http'

import * as express from 'express'
import * as _ from 'lodash'
import { Server, Socket } from 'socket.io'

import { Action, GameError, PlayerId } from './shared-types'
import { gameUiState, lobbyUiState, newGameState } from './game'
import { applyAction } from './actions'
import { GameState } from './types'
import { ascribe } from './utils'

interface PlayerSocketBinding {
  id: PlayerId
  socket: Socket
}

export interface LobbyState {
  type: 'LobbyState'
}

interface Game {
  gameId: string
  bindings: PlayerSocketBinding[]
  gameState: LobbyState | GameState
  lastUpdated: number
}

const app = express()
const server = http.createServer(app)
const io = new Server(server)

const games: Game[] = [
  {
    gameId: 'test',
    bindings: [],
    gameState: { type: 'LobbyState' },
    lastUpdated: new Date().getTime(),
  },
]

setInterval(() => {
  const removedGames = _.remove(
    games,
    (g) => g.lastUpdated < new Date().getTime() - 1000 * 3600 * 24 * 7
  )
  console.log(`Removed ${removedGames.length} orphaned games.`)
}, 1000 * 60 * 60)

app.set('etag', false)

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname + '/../client/index.html'), {
    etag: false,
  })
})

app.post('/create-game', (req, res) => {
  const g: Game = {
    gameId: crypto.randomBytes(4).toString('hex'),
    bindings: [],
    gameState: { type: 'LobbyState' },
    lastUpdated: new Date().getTime(),
  }

  games.push(g)
  res.send({ gameId: g.gameId })
})

app.get('/game/:gameId', (req, res) => {
  res.sendFile(path.resolve(__dirname + '/../client/game.html'), {
    etag: false,
  })
})

app.get('/index.js', (req, res) => {
  res.sendFile(path.resolve(__dirname + '/../../dist/client/index.js'), {
    etag: false,
  })
})

app.get('/game.js', (req, res) => {
  res.sendFile(path.resolve(__dirname + '/../../dist/client/game.js'), {
    etag: false,
  })
})

const MAX_PLAYERS = 8

io.on('connection', (socket) => {
  const gameId = socket.handshake.query.gameId as string

  const game = games.find((g) => g.gameId === gameId)

  if (game === undefined) {
    console.warn(
      `A socket tried to connect to a game ${gameId} that doesn't exist.`
    )
    socket.emit('error', ascribe<GameError>({ type: 'GameNotFound' }))
    return
  }

  game.lastUpdated = new Date().getTime()

  const binding: PlayerSocketBinding = {
    id: socket.handshake.query.playerId as string,
    socket,
  }

  if (
    game.gameState.type === 'GameState' &&
    !game.gameState.playerTurnOrder.includes(binding.id)
  ) {
    socket.emit(
      'error',
      ascribe<GameError>({ type: 'GameAlreadyStartedCantAddNewPlayer' })
    )
    return
  }

  const uniquePlayers = new Set(game.bindings.map((b) => b.id))
  uniquePlayers.add(binding.id)
  if (uniquePlayers.size > MAX_PLAYERS) {
    socket.emit('error', ascribe<GameError>({ type: 'TooManyPlayers' }))
    return
  }

  game.bindings.push(binding)

  const broadcastUpdates = () =>
    game.bindings.forEach((b) => {
      const state =
        game.gameState.type === 'LobbyState'
          ? lobbyUiState(_.uniq(game.bindings.map((b) => b.id)))
          : gameUiState(b.id, game.gameState)
      b.socket.emit('update', state)
    })

  broadcastUpdates()

  socket.on('action', (a: Action) => {
    if (game.gameState.type !== 'GameState') {
      console.warn(`Game must be in GameState to perform actions.`)
      return
    }

    applyAction(game.gameState, binding.id, a)
    game.lastUpdated = new Date().getTime()

    broadcastUpdates()
  })

  socket.on('start-game', () => {
    if (game.gameState.type !== 'LobbyState') {
      console.warn(`Game must be in LobbyState to start game.`)
      return
    }
    game.gameState = newGameState(uniquePlayers)
    game.lastUpdated = new Date().getTime()
    broadcastUpdates()
  })

  socket.on('disconnect', () => {
    _.remove(game.bindings, (b) => b === binding)
  })
})

server.listen(3000, () => {
  console.log('Listening on port 3000.')
})
