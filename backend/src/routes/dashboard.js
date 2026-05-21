const express = require('express');
const prisma = require('../prisma');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, async (req, res) => {
  try {
    const projectsWhere = req.user.role === 'ADMIN'
      ? {}
      : {
          OR: [
            { createdById: req.user.id },
            { members: { some: { userId: req.user.id } } }
          ]
        };

    const projects = await prisma.project.findMany({
      where: projectsWhere,
      select: { id: true }
    });

    const projectIds = projects.map((p) => p.id);

    const tasksWhere = req.user.role === 'ADMIN'
      ? {}
      : {
          projectId: { in: projectIds }
        };

    const allTasks = await prisma.task.findMany({
      where: tasksWhere,
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const total = allTasks.length;
    const done = allTasks.filter((t) => t.status === 'DONE').length;
    const inProgress = allTasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const todo = allTasks.filter((t) => t.status === 'TODO').length;
    const overdue = allTasks.filter((t) => t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < now).length;

    res.json({
      summary: { total, done, inProgress, todo, overdue, projects: projectIds.length },
      recentTasks: allTasks.slice(0, 6),
      tasks: allTasks
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
});

module.exports = router;
