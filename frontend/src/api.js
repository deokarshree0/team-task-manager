const API_BASE = import.meta.env.VITE_API_URL;

async function request(path, options = {}) {
  const token = localStorage.getItem('ttm_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export const api = {
  health: () => request('/health'),
  signup: (payload) => request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  dashboard: () => request('/dashboard'),
  projects: () => request('/projects'),
  createProject: (payload) => request('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  updateProject: (id, payload) => request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  addMember: (id, payload) => request(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify(payload) }),
  removeMember: (id, userId) => request(`/projects/${id}/members/${userId}`, { method: 'DELETE' }),
  createTask: (projectId, payload) => request(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (taskId, payload) => request(`/projects/task/${taskId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTask: (taskId) => request(`/projects/task/${taskId}`, { method: 'DELETE' })
};
