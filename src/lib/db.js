import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'workout_user',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'workout_tracker',
  password: process.env.POSTGRES_PASSWORD || 'workout_password',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

export const query = (text, params) => pool.query(text, params);
