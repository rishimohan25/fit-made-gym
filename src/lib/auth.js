import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev_only';

export function generateTrainerToken(userId) {
  return jwt.sign({ userId, role: 'trainer' }, JWT_SECRET);
}

export function verifyTrainerToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'trainer') return null;
    return decoded;
  } catch (error) {
    return null;
  }
}
