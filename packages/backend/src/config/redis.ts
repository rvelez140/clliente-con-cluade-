import { createClient } from 'redis';

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

export const getCache = async (key: string): Promise<string | null> => {
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
};

export const setCache = async (
  key: string,
  value: string,
  expirationSeconds?: number
): Promise<void> => {
  try {
    if (expirationSeconds) {
      await redisClient.setEx(key, expirationSeconds, value);
    } else {
      await redisClient.set(key, value);
    }
  } catch (error) {
    console.error('Redis set error:', error);
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
};

export default redisClient;
