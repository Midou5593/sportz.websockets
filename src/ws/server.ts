import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import {Matches} from '../validation/matches'

interface WsPayload {
    type: string;
    data?: unknown;
}

function sendJson(socket: WebSocket,payload:WsPayload) {
 if (socket.readyState !== WebSocket.OPEN) return;

 socket.send(JSON.stringify(payload));

}

function broadcast(wss: WebSocketServer,payload:WsPayload) {

    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }
}

export function attachWebSocketServer(server:Server) {

    const wss = new WebSocketServer({
        server,
        path:'/ws',
        maxPayload: 1024 * 1024,
    });

    wss.on('connection', (socket) => {
        sendJson(socket,{type:'welcome'});

        socket.on('error', (err:Error) => {
            console.error(err);
        })
    });

    function broadcastMatchCreated(match:Matches) {
        broadcast(wss,{type:'match_created',data:match});
    }

    return {broadcastMatchCreated};
}