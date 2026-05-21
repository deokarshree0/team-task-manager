# Team Task Manager

A full-stack task management app with:

- Signup / login
- Role-based access control: Admin / Member
- Project and team management
- Task creation, assignment, and status tracking
- Dashboard with task counts, status breakdown, and overdue items

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: SQLite via Prisma
- Auth: JWT + bcrypt

---

## 1) What you need to install

Download and install these first:

1. **Node.js (LTS)**  
   Install from the official Node.js website.  
   This gives you both `node` and `npm`.

2. **Git**  
   Optional but useful for version control and GitHub upload.

3. **VS Code**  
   Recommended editor for opening and running the project.

You do **not** need to install a separate database because this project uses **SQLite**, which is included with the app.

---

## 2) Folder structure

- `backend/` → Express API + Prisma database
- `frontend/` → React UI

---

## 3) Setup steps

### Backend setup

Open a terminal and run:

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/` using `.env.example` as the template:

```bash
cp .env.example .env
```

Then run the database migration:

```bash
npx prisma migrate dev --name init
```

Start the backend:

```bash
npm run dev
```

The backend will run on:

```bash
http://localhost:5000
```

---

### Frontend setup

Open a second terminal and run:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on:

```bash
http://localhost:5173
```

---

## 4) How to use the app

1. Open the frontend in your browser.
2. Sign up as a **Member** or **Admin**.
3. Admin users can:
   - create projects
   - add team members
   - assign tasks
4. Members can:
   - view their projects
   - update tasks assigned to them
   - track task status

---

## 5) Deployment notes

For live deployment, you can use:

- **Render / Railway / Railway**
- **Neon / Supabase / any PostgreSQL provider**
- **Vercel** for frontend if you split deployment

If you want one live URL, build the frontend and serve it from the backend.

Build frontend:

```bash
cd frontend
npm run build
```

Then set `NODE_ENV=production` and run the backend.

---

## 6) Default environment variables

See `backend/.env.example`.

---

## 7) Features included

- Secure signup/login
- JWT authentication
- Admin/member role handling
- Project creation and team assignment
- Task assignment with due dates and status
- Overdue task detection
- Dashboard analytics

---

## 8) Notes

- This project is ready for local use.
- If you want, you can connect it to PostgreSQL later by updating Prisma `DATABASE_URL`.
