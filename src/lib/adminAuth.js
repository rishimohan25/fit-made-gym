import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gym_super_secure_secret_key_change_in_prod_12345';

export function signAdminToken(username) {
  return jwt.sign(
    {
      username,
      role: 'admin',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAdminToken(token) {
  try {
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.role === 'admin') {
      return decoded;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function verifyAdminTokenFromRequest(request) {
  // 1. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyAdminToken(token);
    if (decoded) return decoded;
  }

  // 2. Check cookies
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/gym_admin_token=([^;]+)/);
  if (match) {
    const token = decodeURIComponent(match[1]);
    const decoded = verifyAdminToken(token);
    if (decoded) return decoded;
  }

  return null;
}
