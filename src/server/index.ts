import * as express from "express";
import * as path from "path";

import * as http from "http";
import * as _ from "lodash";
import { Server, Socket } from "socket.io";

import { UIState } from "./shared-types";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
    res.sendFile(path.resolve(__dirname + "/../client/index.html"));
});

app.get("/client.js", (req, res) => {
    res.sendFile(path.resolve(__dirname + "/../../dist/client.js"));
});

function uiState(player: Player, state: GameState): UIState {
    return {
        playerHand: state.playerHands.get(player.id)!,
        otherPlayerHandSize:
            state.playerHands.get(player.id === "#1" ? "#2" : "#1")?.length ||
            -1,
        deckSize: state.deck.length,
        isActivePlayer: state.activePlayer === player.id,
    };
}

type PlayerId = string;

interface GameState {
    deck: number[];
    playerHands: Map<PlayerId, number[]>;
    activePlayer: string;
}

interface Player {
    id: PlayerId;
    socket: Socket;
}

const state: GameState = {
    activePlayer: "#1",
    deck: [1, 2, 3],
    playerHands: new Map(),
};

const players: Player[] = [];

io.on("connection", (socket) => {
    const player: Player = {
        id: socket.handshake.query.playerId as string,
        socket,
    };
    players.push(player);

    console.log(`New player ${player.id} joined.`);

    if (!state.playerHands.has(player.id)) {
        state.playerHands.set(player.id, []);
    }

    players.forEach((p) => {
        p.socket.emit("update", uiState(p, state));
    });

    socket.on("draw", () => {
        const card = state.deck.shift()!;
        state.playerHands.get(state.activePlayer)!.push(card);
        state.activePlayer = state.activePlayer === "#1" ? "#2" : "#1";

        players.forEach((p) => {
            p.socket.emit("update", uiState(p, state));
        });
    });

    socket.on("disconnect", () => {
        console.log(`Player ${player.id} disconnected`);
    });
});

server.listen(3000, () => {
    console.log("listening on *:3000");
});
