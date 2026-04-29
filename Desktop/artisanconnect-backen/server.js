require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET','POST','PUT','PATCH','DELETE'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' }
}));

app.use(express.json({ limit: '1mb' }));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/artisans', require('./routes/artisans'));
app.use('/api/reviews',  require('./routes/reviews'));
app.use('/api/chat',     require('./routes/chat'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => res.status(500).json({ error: 'Server error' }));

const PORT = process.env.PORT || 3000;