const express = require('express');
const path = require('path');

const dbConfig = require(path.join(__dirname, 'config', 'db'));
const corsMiddleware = require(path.join(__dirname, 'middleware', 'corsMiddleware'));
const errorMiddleware = require(path.join(__dirname, 'middleware', 'errorMiddleware'));

const authRoutes = require(path.join(__dirname, 'routes', 'authRoutes'));
const bookRoutes = require(path.join(__dirname, 'routes', 'bookRoutes'));
const requestRoutes = require(path.join(__dirname, 'routes', 'requestRoutes'));

const app = express();
app.use(corsMiddleware);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/requests', requestRoutes);

app.use(errorMiddleware);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend server running on http://localhost:${port}`));
