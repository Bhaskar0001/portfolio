import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_not_for_production';

/**
 * Signs a JWT token for a user
 */
export const signToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      role: user.role, 
      email: user.email,
      name: user.name 
    }, 
    JWT_SECRET, 
    { expiresIn: '7d' }
  );
};

/**
 * Verifies a JWT token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const authenticate = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new Error('No authorization header');
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization format');
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (!decoded) {
    throw new Error('Invalid or expired token');
  }

  return decoded;
};

/**
 * Helper to authorize based on roles
 * @throws {Error} if authorization fails
 */
export const authorize = (decoded, ...allowedRoles) => {
  if (!decoded) {
    throw new Error('Authentication required');
  }
  if (!allowedRoles.includes(decoded.role)) {
    throw new Error(`Forbidden: Required role(s) ${allowedRoles.join(', ')}`);
  }
  return true;
};
