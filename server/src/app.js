// Builds the Express application (middleware + routes).
// It is kept separate from server.js so the automated tests can start the app themselves.

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

const app = express();

app.disable('x-powered-by');

// Sets a group of security-related HTTP headers.
app.use(helmet());

// Only the frontend origin(s) listed in .env may call this API from a browser.
app.use(
  cors({
    origin: env.clientOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Reads JSON request bodies. (multipart/form-data is handled by Multer on the routes that need it.)
app.use(express.json({ limit: '100kb' }));

app.use('/api', apiRoutes);

// Must be last: unknown routes, then the central error handler.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
