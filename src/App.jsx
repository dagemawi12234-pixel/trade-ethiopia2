import React, { useEffect, useMemo, useState } from "react";
import api from "./api";

const emptyTask = {
  title: "",
  description: "",
  priority: "Medium",
  status: "Pending",
  dueDate: ""
};

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post(`/auth/${mode}`, form);
      localStorage.setItem("task_token", data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand"><span>✓</span> TaskFlow</div>
        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="muted">{mode === "login" ? "Sign in to manage your tasks." : "Start organizing your work today."}</p>
        <form onSubmit={submit}>
          {mode === "register" && (
            <label>Name<input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></label>
          )}
          <label>Email<input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></label>
          <label>Password<input required minLength="6" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></label>
          {error && <div className="error">{error}</div>}
          <button className="primary full">{mode === "login" ? "Login" : "Register"}</button>
        </form>
        <button className="link-btn" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
        </button>
      </section>
    </main>
  );
}

function TaskModal({ task, onClose, onSave }) {
  const [form, setForm] = useState(task || emptyTask);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-head"><h2>{task ? "Edit task" : "New task"}</h2><button type="button" className="icon-btn" onClick={onClose}>×</button></div>
        <label>Title<input required maxLength="120" value={form.title} onChange={e => setForm({...form, title:e.target.value})} /></label>
        <label>Description<textarea rows="4" value={form.description} onChange={e => setForm({...form, description:e.target.value})} /></label>
        <div className="form-grid">
          <label>Priority<select value={form.priority} onChange={e => setForm({...form, priority:e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></label>
          <label>Status<select value={form.status} onChange={e => setForm({...form, status:e.target.value})}><option>Pending</option><option>In Progress</option><option>Completed</option></select></label>
        </div>
        <label>Due date<input type="date" value={form.dueDate ? String(form.dueDate).slice(0,10) : ""} onChange={e => setForm({...form, dueDate:e.target.value})} /></label>
        <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving ? "Saving..." : "Save task"}</button></div>
      </form>
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [filters, setFilters] = useState({ search: "", status: "All", priority: "All" });
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");

  async function load() {
    try {
      const [taskRes, statRes] = await Promise.all([
        api.get("/tasks", { params: filters }),
        api.get("/tasks/stats")
      ]);
      setTasks(taskRes.data);
      setStats(statRes.data);
    } catch (err) {
      if (err.response?.status === 401) onLogout();
    }
  }

  useEffect(() => { load(); }, [filters.search, filters.status, filters.priority]);

  async function saveTask(form) {
    try {
      if (modal) await api.put(`/tasks/${modal._id}`, form);
      else await api.post("/tasks", form);
      setModal(null); setToast("Task saved successfully"); load();
    } catch (err) { setToast(err.response?.data?.message || "Could not save task"); }
  }

  async function removeTask(id) {
    if (!confirm("Delete this task?")) return;
    try { await api.delete(`/tasks/${id}`); setToast("Task deleted"); load(); }
    catch { setToast("Could not delete task"); }
  }

  const greeting = useMemo(() => user.name?.split(" ")[0] || "there", [user.name]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>✓</span> TaskFlow</div>
        <nav><button className="active">▦ Dashboard</button></nav>
        <div className="side-bottom">
          <div className="user-mini"><div className="avatar">{user.name[0]}</div><div><b>{user.name}</b><small>{user.email}</small></div></div>
          <button className="logout" onClick={onLogout}>↪ Logout</button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div><p className="eyebrow">WORKSPACE</p><h1>Good to see you, {greeting} </h1></div>
          <button className="primary" onClick={() => setModal(null) || setModal({create:true})}>+ New task</button>
        </header>

        <section className="stats">
          <div className="stat"><span className="stat-icon">▦</span><div><small>Total tasks</small><strong>{stats.total}</strong></div></div>
          <div className="stat"><span className="stat-icon">◷</span><div><small>Pending</small><strong>{stats.pending}</strong></div></div>
          <div className="stat"><span className="stat-icon">✓</span><div><small>Completed</small><strong>{stats.completed}</strong></div></div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Your tasks</h2><p className="muted">Search, filter and manage your work.</p></div></div>
          <div className="filters">
            <div className="search">⌕<input placeholder="Search tasks..." value={filters.search} onChange={e => setFilters({...filters, search:e.target.value})}/></div>
            <select value={filters.status} onChange={e => setFilters({...filters,status:e.target.value})}><option>All</option><option>Pending</option><option>In Progress</option><option>Completed</option></select>
            <select value={filters.priority} onChange={e => setFilters({...filters,priority:e.target.value})}><option>All</option><option>Low</option><option>Medium</option><option>High</option></select>
          </div>

          <div className="task-list">
            {tasks.length === 0 ? <div className="empty"><div>✓</div><h3>No tasks found</h3><p>Create a task or change your filters.</p></div> :
              tasks.map(task => (
                <article className="task-row" key={task._id}>
                  <div className="task-main">
                    <div className={`status-dot ${task.status === "Completed" ? "done" : ""}`}></div>
                    <div><h3 className={task.status === "Completed" ? "strike" : ""}>{task.title}</h3><p>{task.description || "No description"}</p></div>
                  </div>
                  <div className="task-meta">
                    <span className={`badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                    <span className={`status ${task.status === "Completed" ? "completed" : ""}`}>{task.status}</span>
                    <span className="due">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}</span>
                    <button className="icon-btn" title="Edit" onClick={() => setModal(task)}>✎</button>
                    <button className="icon-btn danger" title="Delete" onClick={() => removeTask(task._id)}>⌫</button>
                  </div>
                </article>
              ))
            }
          </div>
        </section>
      </main>

      {modal && <TaskModal task={modal._id ? modal : null} onClose={() => setModal(null)} onSave={saveTask}/>}
      {toast && <button className="toast" onClick={() => setToast("")}>{toast}</button>}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("task_token");
    if (!token) { setChecking(false); return; }
    api.get("/auth/me").then(r => setUser(r.data.user)).catch(() => localStorage.removeItem("task_token")).finally(() => setChecking(false));
  }, []);

  function logout() {
    localStorage.removeItem("task_token");
    setUser(null);
  }

  if (checking) return <div className="loading">Loading TaskFlow...</div>;
  return user ? <Dashboard user={user} onLogout={logout}/> : <Auth onLogin={setUser}/>;
}