const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

async function loadProjectAccess(req, res, next) {
  try {
    const projectId = req.params.projectId || req.params.id;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    req.project = project;
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { authRequired, requireRole, loadProjectAccess };
