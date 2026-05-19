import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireBoss(req, res, next) {
  if (req.user?.role !== 'boss') return res.status(403).json({ error: 'Boss only' });
  next();
}

export function requireTeamLeaderOrBoss(req, res, next) {
  if (!['boss', 'teamleader'].includes(req.user?.role)) return res.status(403).json({ error: 'Team leader or boss only' });
  next();
}
