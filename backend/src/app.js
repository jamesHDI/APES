const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { apiRateLimit } = require('./middleware/rateLimit.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean);

if (!isProduction) {
  allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
}

app.set('trust proxy', isProduction ? 1 : false);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin && !isProduction) return callback(null, true);
    if (origin && allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS policy: origin is not allowed.'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use('/api', apiRateLimit);

// No frontend route has been moved in Week 1. Feature APIs are added only after
// the Prisma schema and data mapping have been reviewed.
app.use('/api', require('./routes'));
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
