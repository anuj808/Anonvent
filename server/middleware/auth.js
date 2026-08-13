import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'change_this_to_a_secure_random_string_in_production';
    const decoded = jwt.verify(token, secret);
    
    // Attach credentials
    req.user = {
      userId: decoded.userId,
      anonId: decoded.anonId,
      isAdmin: decoded.isAdmin || false,
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
};

export default authMiddleware;
