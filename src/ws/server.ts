import { WebSocketServer, WebSocket as WsWebSocket } from 'ws';
import type { Server } from 'http';
import  type {Matches} from '../validation/matches'
import {clearInterval} from "node:timers";
import {wsArcjet} from "../arcjet";

import type { IncomingMessage } from "http";

interface WsPayload {
    type: string;
    data?: unknown;
}

// Create a custom type that extends WebSocket
type WebSocket = WsWebSocket & {
    isActive: boolean;
    isAlive: boolean;
    subscriptions: Set<string>;
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



// export function attachWebSocketServer1(server:Server) {

//     const wss = new WebSocketServer({
//         server,
//         path:'/ws',
//         maxPayload: 1024 * 1024,
//     });

//     wss.on('connection', async (socket :WebSocket,req:IncomingMessage) => {
//         if (wsArcjet){
//             try {
//                 const decision = await wsArcjet.protect(req);

//                 if (decision.isDenied()) {
//                     const  code = decision.reason.isRateLimit() ? 1013 :1008;
//                     const reason = decision.reason.isRateLimit() ? 'Rate limit exceeded' :'Access Denied';
//                     socket.close(code, reason);
//                     return;
//                 }
//             }catch (e) {
//                 console.error('WS Connection Error:', e);
//                 socket.close( 1011,'Server Security Error');
//                 return;
//             }
//         }
//         socket.isActive = true;
//         socket.on('pong', (data) => {
//             socket.isActive = true;
//         })
//         sendJson(socket,{type:'welcome'});

//         socket.on('error', (err:Error) => {
//             console.error(err);
//         })
//     });
//     const interval = setInterval(() => {
//         wss.clients.forEach((ws) => {
//             const extWs = ws as WebSocket;
//             if (ws.readyState !== WsWebSocket.OPEN) {
//                             return;
//                         }
//                     if (extWs.isActive === false) {
//                            ws.terminate();
//                             return;
//                        };
//                    extWs.isActive = false;
//                    ws.ping();
//         });
//     },30000);

//     wss.on('close', () => clearInterval(interval));

//     function broadcastMatchCreated(match:Matches) {
//         broadcast(wss,{type:'match_created',data:match});
//     }

//     return {broadcastMatchCreated};
// }




export function attachWebSocketServer(server:Server) {
    const wss = new WebSocketServer({ noServer: true, path: '/ws', maxPayload: 1024 * 1024 });

    server.on('upgrade', async (req, socket, head) => {
        const { pathname } = new URL(req.url || '/', `http://${req.headers.host}`);

        if (pathname !== '/ws') {
            return;
        }

        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);

                if (decision.isDenied()) {
                    if (decision.reason.isRateLimit()) {
                        socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
                    } else {
                        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                    }
                    socket.destroy();
                    return;
                }
            } catch (e) {
                console.error('WS upgrade protection error', e);
                socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                socket.destroy();
                return;
            }
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    });

    wss.on('connection', async (socket:WebSocket, req) => {

        socket.isAlive = true;
        socket.on('pong', () => { socket.isAlive = true; });

        socket.subscriptions = new Set();

        sendJson(socket, { type: 'welcome' });

        socket.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                // Handle different message types here
                console.log('Received message:', message);
            } catch (e) {
                console.error('Invalid message format:', e);
            }
        });

        socket.on('error', () => {
            socket.terminate();
        });

        socket.on('close', () => {
            socket.subscriptions.clear();
        })

        socket.on('error', console.error);
    });

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            const extWs = ws as WebSocket;
            if (extWs.isAlive === false) return ws.terminate();

            extWs.isAlive = false;
            ws.ping();
        })}, 30000);

    wss.on('close', () => clearInterval(interval));

    function broadcastMatchCreated(match: Matches) {
        broadcast(wss, { type: 'match_created', data: match });
    }

    function broadcastCommentary(matchId: string, comment: unknown) {
        // Broadcast commentary to all clients subscribed to this match
        wss.clients.forEach((client) => {
            const extClient = client as WebSocket;
            if (extClient.subscriptions.has(matchId) && client.readyState === WsWebSocket.OPEN) {
                sendJson(extClient, { type: 'commentary', data: comment });
            }
        });
    }

    return { broadcastMatchCreated, broadcastCommentary };
}