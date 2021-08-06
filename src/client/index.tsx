import { io } from "socket.io-client";
import { UIState } from "@shared-types";
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";

function useSocket() {
    const [uiState, setUiState] = useState<UIState | null>(null);
    useEffect(() => {
        const socket = io({
            query: {
                playerId: window.location.hash,
            },
        });

        socket.on("update", (uiState) => {
            setUiState(uiState);
        });

        return () => {
            socket.disconnect();
        };
    });

    return uiState;
}

function App() {
    return (
        <div>
            <button type="button" onClick={() => socket.emit("draw")}>
                Draw Card
            </button>
            <div style={{ whiteSpace: "pre", fontFamily: "monospace" }}></div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById("root"));

// socket.on("update", (uiState) => {
//     document.getElementById("log")!.innerHTML += JSON.stringify(uiState);
//     document.getElementById("log")!.innerHTML += "\n";

//     document.getElementById("draw")!.style.display = uiState.isActivePlayer
//         ? "block"
//         : "none";
// });

// document.getElementById("draw")!.onclick = () => {
//     socket.emit("draw");
// };
