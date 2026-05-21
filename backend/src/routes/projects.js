const express = require('express');
const prisma = require('../prisma');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

async function canAccessProject(user, projectId) {
  if (user.role === 'ADMIN') return true;

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: user.id
      }
    }
  });

  return Boolean(member);
}

router.get('/', authRequired, async (req, res) => {
  try {
    const where = req.user.role === 'ADMIN'
      ? {}
      : {
          OR: [
            { createdById: req.user.id },
            { members: { some: { userId: req.user.id } } }
          ]
        };

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } }
          }
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTo: { select: { id: true, name: true, email: true, role: true } }
          }
        }
      }
    });

    res.json({ projects });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load projects' });
  }
});

router.post('/', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can create projects' });
    }

    const { name, description, memberEmails = [] } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: 'Project name must be at least 3 characters' });
    }

    const emails = [...new Set(memberEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];

    const users = emails.length
      ? await prisma.user.findMany({ where: { email: { in: emails } } })
      : [];

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        createdById: req.user.id,
        members: {
          create: [
            { userId: req.user.id },
            ...users.filter((u) => u.id !== req.user.id).map((u) => ({ userId: u.id }))
          ]
        }
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } }
          }
        }
      }
    });

    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ message: 'Project creation failed' });
  }
});

router.get('/:id', authRequired, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } }
          }
        },
        tasks: {
          orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
          include: {
            assignedTo: { select: { id: true, name: true, email: true, role: true } },
            createdBy: { select: { id: true, name: true, email: true, role: true } }
          }
        }
      }
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const access = await canAccessProject(req.user, project.id);
    if (!access) return res.status(403).json({ message: 'Forbidden' });

    res.json({ project });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load project' });
  }
});

router.patch('/:id', authRequired, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.user.role !== 'ADMIN' && project.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { name, description } = req.body;
    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() || null } : {})
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    res.json({ project: updated });
  } catch (err) {
    res.status(500).json({ message: 'Project update failed' });
  }
});

router.delete('/:id', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can delete projects' });
    }

    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Project deletion failed' });
  }
});

router.post('/:id/members', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: req.params.id,
          userId: user.id
        }
      },
      update: {},
      create: { projectId: req.params.id, userId: user.id }
    });

    res.json({ message: 'Member added' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add member' });
  }
});

router.delete('/:id/members/:userId', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    await prisma.projectMember.deleteMany({
      where: {
        projectId: req.params.id,
        userId: req.params.userId
      }
    });

    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove member' });
  }
});

router.post('/:id/tasks', authRequired, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { members: true }
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const access = req.user.role === 'ADMIN' || project.createdById === req.user.id || project.members.some((m) => m.userId === req.user.id);
    if (!access) return res.status(403).json({ message: 'Forbidden' });

    const { title, description, dueDate, assignedToId, status } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({ message: 'Task title must be at least 3 characters' });
    }

    if (assignedToId) {
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: assignedToId
          }
        }
      });
      if (!member) {
        return res.status(400).json({ message: 'Task can only be assigned to a project member' });
      }
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || 'TODO',
        projectId: project.id,
        createdById: req.user.id,
        assignedToId: assignedToId || null
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create task' });
  }
});

router.patch('/task/:taskId', authRequired, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: {
        project: { include: { members: true } }
      }
    });

    if (!task) return res.status(404).json({ message: 'Task not found' });

    const access = req.user.role === 'ADMIN' ||
      task.createdById === req.user.id ||
      task.assignedToId === req.user.id ||
      task.project.createdById === req.user.id;

    if (!access) return res.status(403).json({ message: 'Forbidden' });

    const { title, description, status, dueDate, assignedToId } = req.body;

    if (assignedToId) {
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: task.projectId,
            userId: assignedToId
          }
        }
      });
      if (!member) {
        return res.status(400).json({ message: 'Task can only be assigned to a project member' });
      }
    }

    const updated = await prisma.task.update({
      where: { id: req.params.taskId },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(status ? { status } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(assignedToId !== undefined ? { assignedToId: assignedToId || null } : {})
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    res.json({ task: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update task' });
  }
});

router.delete('/task/:taskId', authRequired, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role !== 'ADMIN' && task.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await prisma.task.delete({ where: { id: req.params.taskId } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

module.exports = router;
