import { WebSocketServer, WebSocket as WsWebSocket } from 'ws';
import type { Server } from 'http';
import {Matches} from '../validation/matches'
import {clearInterval} from "node:timers";

interface WsPayload {
    type: string;
    data?: unknown;
}

// Create a custom type that extends WebSocket
type WebSocket = WsWebSocket & {
    isActive: boolean;
};



function sendJson(socket: WebSocket,payload:WsPayload) {
 if (socket.readyState !== WsWebSocket.OPEN) return;

 socket.send(JSON.stringify(payload));

}

function broadcast(wss: WebSocketServer,payload:WsPayload) {

    for (const client of wss.clients) {
        if (client.readyState !== WsWebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }
}

export function attachWebSocketServer(server:Server) {

    const wss = new WebSocketServer({
        server,
        path:'/ws',
        maxPayload: 1024 * 1024,
    });

    wss.on('connection', (socket :WebSocket) => {
        socket.isActive = true;
        socket.on('pong', (data) => {
            socket.isActive = true;
        })
        sendJson(socket,{type:'welcome'});

        socket.on('error', (err:Error) => {
            console.error(err);
        })
    });
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            const extWs = ws as WebSocket;
            if (ws.readyState !== WsWebSocket.OPEN) {
                            return;
                        }
                    if (extWs.isActive === false) {
                           ws.terminate();
                            return;
                       };
                   extWs.isActive = false;
                   ws.ping();
        });
    },30000);

    wss.on('close', () => clearInterval(interval));

    function broadcastMatchCreated(match:Matches) {
        broadcast(wss,{type:'match_created',data:match});
    }

    return {broadcastMatchCreated};
}