import express,{Request,Response} from 'express';
import {matchRouter} from "./routes/matches";

const app = express();
const PORT = 8000;

// Middleware (read json context)
app.use(express.json());

// Root GET route
app.get('/', (req:Request, res:Response) => {
  res.json({ message: 'Welcome to the API!' });
});

app.use('/matches',matchRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
