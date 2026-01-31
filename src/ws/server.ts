import { WebSocketServer, WebSocket } from 'ws';


function sendJson(socket: WebSocket,payload:any) {
 if (socket.readyState !== WebSocket.OPEN) return;

 socket.send(JSON.stringify(payload));

}

function broadcast(wss: WebSocketServer,payload:any) {

    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) return;

        client.send(JSON.stringify(payload));
    }
}

export function attatchWebSocketServer(server:any) {

    const wss = new WebSocketServer({
        server,
        path:'/ws',
        maxPayload: 1024 * 1024,
    });

    wss.on('connection', (socket) => {
        sendJson(socket,{type:'welcome'});

        socket.on('error', (err:any) => {
            console.error(err);
        })
    });

    function broadcastMatchCreated(match:any) {
        broadcast(wss,{type:'match_created',data:match});
    }

    return {broadcastMatchCreated};
}