import "dotenv/config";

import express,{Request,Response} from 'express';
import {matchRouter} from "./routes/matches";
import * as http from "node:http";
import {attachWebSocketServer} from "./ws/server";


const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
const server = http.createServer(app);
// Middleware (read json context)
app.use(express.json());

// Root GET route
app.get('/', (req:Request, res:Response) => {
  res.json({ message: 'Welcome to the API!' });
});

app.use('/matches',matchRouter);

// broadcast
const {broadcastMatchCreated} = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;


// Start server
server.listen(PORT,HOST, () => {
  const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  const wsProtocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';
  const wsHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`Server running on ${ baseUrl }`);
  console.log(`WebSocket Server is running on ${wsProtocol}://${wsHost}:${PORT}/ws`);
});
