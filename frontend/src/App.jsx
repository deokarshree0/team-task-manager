import React, { useEffect, useMemo, useState } from 'react'
import { api } from './api'

const blankAuth = {
  name: '',
  email: '',
  password: '',
  role: 'MEMBER'
}

const blankProject = {
  name: '',
  description: '',
  memberEmails: ''
}

const blankTask = {
  title: '',
  description: '',
  dueDate: '',
  status: 'TODO',
  assignedToId: ''
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

function App() {
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState(blankAuth)
  const [authUser, setAuthUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [projectForm, setProjectForm] = useState(blankProject)
  const [taskForm, setTaskForm] = useState(blankTask)
  const [memberEmail, setMemberEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  )

  useEffect(() => {
    const token = localStorage.getItem('ttm_token')
    if (!token) {
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        const me = await api.me()
        setAuthUser(me.user)
        await refreshData()
      } catch (err) {
        localStorage.removeItem('ttm_token')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      setTaskForm((prev) => ({
        ...prev,
        assignedToId: prev.assignedToId || selectedProject.members?.[0]?.user?.id || ''
      }))
    }
  }, [selectedProject])

  async function refreshData() {
    const [p, d] = await Promise.all([api.projects(), api.dashboard()])
    setProjects(p.projects)
    setDashboard(d)
    if (!selectedProjectId && p.projects[0]) {
      setSelectedProjectId(p.projects[0].id)
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const payload = authMode === 'signup' ? authForm : {
        email: authForm.email,
        password: authForm.password
      }
      const result = authMode === 'signup' ? await api.signup(payload) : await api.login(payload)
      localStorage.setItem('ttm_token', result.token)
      setAuthUser(result.user)
      await refreshData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    localStorage.removeItem('ttm_token')
    setAuthUser(null)
    setProjects([])
    setSelectedProjectId('')
    setDashboard(null)
    setAuthForm(blankAuth)
  }

  async function createProject(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.createProject({
        name: projectForm.name,
        description: projectForm.description,
        memberEmails: projectForm.memberEmails
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)
      })
      setProjectForm(blankProject)
      await refreshData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function addMember(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.addMember(selectedProjectId, { email: memberEmail })
      setMemberEmail('')
      await refreshData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function createTask(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.createTask(selectedProjectId, {
        title: taskForm.title,
        description: taskForm.description,
        dueDate: taskForm.dueDate,
        status: taskForm.status,
        assignedToId: taskForm.assignedToId || null
      })
      setTaskForm(blankTask)
      await refreshData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function updateTask(taskId, patch) {
    try {
      await api.updateTask(taskId, patch)
      await refreshData()
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return
    try {
      await api.deleteTask(taskId)
      await refreshData()
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteProject(projectId) {
    if (!confirm('Delete this project?')) return
    try {
      await api.deleteProject(projectId)
      await refreshData()
      if (selectedProjectId === projectId) setSelectedProjectId('')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="page center">Loading…</div>
  }

  if (!authUser) {
    return (
      <div className="auth-shell">
        <div className="auth-card glass">
          <div className="brand">
            <div className="badge">TTM</div>
            <div>
              <h1>Team Task Manager</h1>
              <p>Organize projects, assign tasks, and track team progress.</p>
            </div>
          </div>

          <div className="tabs">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Login</button>
            <button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>Signup</button>
          </div>

          <form className="stack" onSubmit={handleAuthSubmit}>
            {authMode === 'signup' && (
              <>
                <input placeholder="Full name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />
                <select value={authForm.role} onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </>
            )}
            <input type="email" placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
            <input type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
            <button disabled={busy}>{busy ? 'Please wait…' : authMode === 'login' ? 'Login' : 'Create account'}</button>
          </form>

          {error && <p className="error">{error}</p>}

          <div className="hint">
            Demo users from seed:
            <br />
            Admin: <b>admin@taskmanager.com</b> / <b>Admin@123</b>
            <br />
            Member: <b>member@taskmanager.com</b> / <b>Member@123</b>
          </div>
        </div>
      </div>
    )
  }

  const metrics = dashboard?.summary || { total: 0, done: 0, inProgress: 0, todo: 0, overdue: 0, projects: 0 }

  return (
    <div className="app-shell">
      <aside className="sidebar glass">
        <div>
          <div className="brand compact">
            <div className="badge">TTM</div>
            <div>
              <h2>Team Task Manager</h2>
              <p>{authUser.name}</p>
            </div>
          </div>

          <div className="role-pill">{authUser.role}</div>

          <div className="metric-grid">
            <div className="metric"><span>{metrics.projects}</span><small>Projects</small></div>
            <div className="metric"><span>{metrics.total}</span><small>Tasks</small></div>
            <div className="metric"><span>{metrics.done}</span><small>Done</small></div>
            <div className="metric"><span>{metrics.overdue}</span><small>Overdue</small></div>
          </div>

          <button className="secondary full" onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="content">
        {error && <div className="toast">{error}</div>}

        <section className="grid two">
          <div className="panel glass">
            <h3>Dashboard</h3>
            <div className="progress-row">
              <div className="progress-card"><strong>{metrics.todo}</strong><span>To Do</span></div>
              <div className="progress-card"><strong>{metrics.inProgress}</strong><span>In Progress</span></div>
              <div className="progress-card"><strong>{metrics.done}</strong><span>Done</span></div>
            </div>

            <div className="recent-list">
              {(dashboard?.recentTasks || []).map((task) => (
                <article className="task-item" key={task.id}>
                  <div>
                    <h4>{task.title}</h4>
                    <p>{task.project?.name}</p>
                  </div>
                  <span className={`status ${task.status.toLowerCase()}`}>{task.status.replace('_', ' ')}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="panel glass">
            <h3>{authUser.role === 'ADMIN' ? 'Create Project' : 'Projects'}</h3>
            {authUser.role === 'ADMIN' && (
              <form className="stack" onSubmit={createProject}>
                <input placeholder="Project name" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} />
                <textarea placeholder="Description" rows="3" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
                <input placeholder="Member emails (comma separated)" value={projectForm.memberEmails} onChange={(e) => setProjectForm({ ...projectForm, memberEmails: e.target.value })} />
                <button disabled={busy}>Create project</button>
              </form>
            )}
            <div className="project-list">
              {projects.map((project) => (
                <button
                  key={project.id}
                  className={selectedProjectId === project.id ? 'project-card active' : 'project-card'}
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <strong>{project.name}</strong>
                  <span>{project.tasks.length} tasks · {project.members.length} members</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {selectedProject && (
          <section className="grid two bottom">
            <div className="panel glass">
              <div className="panel-head">
                <div>
                  <h3>{selectedProject.name}</h3>
                  <p>{selectedProject.description || 'No description provided'}</p>
                </div>
                {authUser.role === 'ADMIN' && (
                  <button className="danger" onClick={() => deleteProject(selectedProject.id)}>Delete project</button>
                )}
              </div>

              <div className="section">
                <h4>Team</h4>
                <div className="chips">
                  {selectedProject.members.map((m) => (
                    <span className="chip" key={m.id}>{m.user.name} ({m.user.role})</span>
                  ))}
                </div>

                {authUser.role === 'ADMIN' && (
                  <form className="inline-form" onSubmit={addMember}>
                    <input placeholder="Add member by email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} />
                    <button disabled={busy}>Add</button>
                  </form>
                )}
              </div>

              <div className="section">
                <h4>Create Task</h4>
                <form className="stack" onSubmit={createTask}>
                  <input placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                  <textarea placeholder="Task description" rows="3" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
                  <div className="row">
                    <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
                    <select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                      <option value="TODO">TODO</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="DONE">DONE</option>
                    </select>
                  </div>
                  <select value={taskForm.assignedToId} onChange={(e) => setTaskForm({ ...taskForm, assignedToId: e.target.value })}>
                    <option value="">Assign to member</option>
                    {selectedProject.members.map((m) => (
                      <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                    ))}
                  </select>
                  <button disabled={busy}>Add task</button>
                </form>
              </div>
            </div>

            <div className="panel glass">
              <h3>Tasks</h3>
              <div className="task-column">
                {selectedProject.tasks.map((task) => {
                  const isOverdue = task.dueDate && task.status !== 'DONE' && new Date(task.dueDate) < new Date()
                  return (
                    <article className={`task-item detail ${isOverdue ? 'overdue' : ''}`} key={task.id}>
                      <div className="task-top">
                        <div>
                          <h4>{task.title}</h4>
                          <p>{task.description || 'No description'}</p>
                        </div>
                        <span className={`status ${task.status.toLowerCase()}`}>{task.status.replace('_', ' ')}</span>
                      </div>

                      <div className="meta">
                        <span>Due: {formatDate(task.dueDate)}</span>
                        <span>Assigned: {task.assignedTo?.name || 'Unassigned'}</span>
                      </div>

                      <div className="actions">
                        <select value={task.status} onChange={(e) => updateTask(task.id, { status: e.target.value })}>
                          <option value="TODO">TODO</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="DONE">DONE</option>
                        </select>
                        {authUser.role === 'ADMIN' && (
                          <button className="danger" onClick={() => deleteTask(task.id)}>Delete</button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
