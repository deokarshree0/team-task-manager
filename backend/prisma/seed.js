const { PrismaClient, Role, TaskStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@taskmanager.com';
  const memberEmail = 'member@taskmanager.com';

  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const memberPassword = await bcrypt.hash('Member@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Admin User',
      email: adminEmail,
      password: adminPassword,
      role: Role.ADMIN
    }
  });

  const member = await prisma.user.upsert({
    where: { email: memberEmail },
    update: {},
    create: {
      name: 'Member User',
      email: memberEmail,
      password: memberPassword,
      role: Role.MEMBER
    }
  });

  const project = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Improve layout, navigation, and mobile responsiveness',
      createdById: admin.id,
      members: {
        create: [
          { userId: admin.id },
          { userId: member.id }
        ]
      }
    }
  });

  await prisma.task.createMany({
    data: [
      {
        title: 'Create wireframes',
        description: 'Design the homepage and dashboard wireframes',
        status: TaskStatus.IN_PROGRESS,
        dueDate: new Date(Date.now() + 86400000 * 2),
        projectId: project.id,
        createdById: admin.id,
        assignedToId: member.id
      },
      {
        title: 'Fix hero section',
        description: 'Update hero copy and CTA button',
        status: TaskStatus.TODO,
        dueDate: new Date(Date.now() - 86400000),
        projectId: project.id,
        createdById: admin.id,
        assignedToId: member.id
      }
    ]
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
