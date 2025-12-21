import express from 'express';
import cors from 'cors';
import { config } from './config';
import { connectRedis } from './config/redis';
import pool from './config/database';
import routes from './routes';
import emailSchedulerService from './services/email-scheduler.service';

const app = express();

app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', routes);

const startServer = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected');

    await connectRedis();
    console.log('✓ Redis connected');

    emailSchedulerService.start();
    console.log('✓ Email scheduler started');

    app.listen(config.port, () => {
      console.log(`✓ Server running on port ${config.port}`);
      console.log(`✓ Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  emailSchedulerService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  emailSchedulerService.stop();
  process.exit(0);
});

startServer();
