import { useEffect, useState } from 'react'
import axios from 'axios'
import { Layout, CheckCircle2, Clock, Trash2, User, ListTodo, Kanban, Calendar, ChevronDown, X, ListPlus, Circle, GanttChartSquare, Search } from 'lucide-react'
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'

// MERKEZİ API YAPILANDIRMASI
const API_BASE_URL = 'http://136.111.161.239:8000'

// --- 1. DRAGGABLE TASK COMPONENT ---
function DraggableTask({ task, onDelete, users, onTaskClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id.toString(),
    data: { task }
  })

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#de350b';
      case 'Medium': return '#ffab00';
      case 'Low': return '#0052cc';
      default: return '#dfe1e6';
    }
  }

  const assignee = users.find(u => u.id === task.assignee_id)

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.6 : (task.status === 'Done' ? 0.55 : 1),
    backgroundColor: 'white', padding: '15px', borderRadius: '4px', 
    boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.1)', 
    marginBottom: '10px', borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
    position: 'relative', cursor: 'grab', zIndex: isDragging ? 999 : 1,
    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s ease',
    transformOrigin: '0 0'
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => onTaskClick(task)}>
      <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b778c', zIndex: 10 }}>
        <Trash2 size={16} />
      </button>
      <div style={{ fontSize: '14px', color: '#172b4d', fontWeight: '500', paddingRight: '20px', marginBottom: '8px', textDecoration: task.status === 'Done' ? 'line-through' : 'none' }}>
        {task.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
        <User size={12} color="#6b778c" />
        <span style={{ fontSize: '12px', color: '#6b778c', fontStyle: 'italic' }}>{assignee ? assignee.username : "Unassigned"}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={14} color="#6b778c" />
            <span style={{ fontSize: '11px', color: '#6b778c' }}>ID: {task.id}</span>
         </div>
         {task.status === "Done" && <CheckCircle2 size={16} color="#36b37e" />}
      </div>
    </div>
  )
}

// --- 2. DROPPABLE COLUMN COMPONENT ---
function DroppableColumn({ id, tasks, onDelete, users, onTaskClick }) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} style={{ backgroundColor: '#ebecf0', borderRadius: '8px', padding: '12px', minHeight: '550px' }}>
      <h3 style={{ color: '#5e6c84', fontSize: '12px', textTransform: 'uppercase', marginBottom: '15px' }}>{id} • {tasks.length}</h3>
      {tasks.map(task => <DraggableTask key={task.id} task={task} onDelete={onDelete} users={users} onTaskClick={onTaskClick} />)}
    </div>
  )
}

// --- 3. MAIN APPLICATION ---
boxStyle: function App() {
  const [activeTab, setActiveTab] = useState('timeline')
  const [projects, setProjects] = useState([]) 
  const [currentProjectId, setCurrentProjectId] = useState(null) 
  const [selectedBoardSprint, setSelectedBoardSprint] = useState(null)
  const [isSprintOpen, setIsSprintOpen] = useState(false)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [sprints, setSprints] = useState([])
  
  // Panel Görünürlük Kontrolleri
  const [showForm, setShowForm] = useState(false)
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false) 
  
  // Form State Kalıpları
  const [formData, setFormData] = useState({ title: '', description: '', status: 'To Do', priority: 'Medium', sprint_id: '', assignee_id: '' })
  const [sprintFormData, setSprintFormData] = useState({ name: '', start_month: 'April', start_week: 1, end_month: 'April', end_week: 2, color: '#0052cc' })
  const [memberFormData, setMemberFormData] = useState({ username: '', email: '' })
  const [projectFormData, setProjectFormData] = useState({ name: '', description: '' }) 

  // Bağımsız Filtre Havuzu
  const [filterType, setFilterType] = useState('')
  const [filterValue, setFilterValue] = useState('')

  // Modal State Kalıpları
  const [editingTask, setEditingTask] = useState(null)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [showSubtaskForm, setShowSubtaskForm] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }))
  const columns = ["To Do", "In Progress", "Done"]
  
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const weeksPerMonth = [1, 2, 3, 4]

  const fetchData = async () => {
    try {
      const [tRes, uRes, sRes, pRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/tasks/`),
        axios.get(`${API_BASE_URL}/users/`),
        axios.get(`${API_BASE_URL}/sprints/`),
        axios.get(`${API_BASE_URL}/projects/`) 
      ])
      setTasks(tRes.data); setUsers(uRes.data); setSprints(sRes.data); setProjects(pRes.data)
      
      if (pRes.data.length > 0 && !currentProjectId) {
        setCurrentProjectId(pRes.data[0].id)
      }
    } catch (err) { console.error(err) }
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const activeSprints = sprints.filter(s => s.project_id === currentProjectId)
    if (activeSprints.length > 0) {
      setSelectedBoardSprint(activeSprints[0].id)
    } else {
      setSelectedBoardSprint(null)
    }
  }, [currentProjectId, sprints])

  useEffect(() => {
    if (activeTab === 'timeline' && sprints.length > 0) {
      const timer = setTimeout(() => {
        const aprilElement = document.getElementById('month-April')
        if (aprilElement) {
          aprilElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
        }
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [activeTab, sprints])

  const currentProjectSprints = sprints.filter(s => s.project_id === currentProjectId)
  const currentProjectTasks = tasks.filter(t => t.project_id === currentProjectId)

  const searchedTasks = currentProjectTasks.filter(task => {
    if (!filterType || !filterValue) return true 
    if (filterType === 'Priority') return task.priority === filterValue
    if (filterType === 'User') return task.assignee_id === parseInt(filterValue)
    if (filterType === 'Status') return task.status === filterValue
    if (filterType === 'Month') {
      const sprint = sprints.find(s => s.id === task.sprint_id)
      return sprint ? (sprint.start_month === filterValue || sprint.end_month === filterValue) : false
    }
    return true
  })

  const getGridColumnIndex = (month, week) => {
    const monthIndex = months.indexOf(month)
    if (monthIndex === -1) return 1
    return (monthIndex * 4) + parseInt(week)
  }

  const handleTaskClick = (task) => {
    axios.get(`${API_BASE_URL}/tasks/${task.id}`)
      .then(res => {
        setEditingTask({ ...res.data.task, subtasks: res.data.subtasks || [] })
        setShowSubtaskForm(false)
        setNewSubtaskTitle('')
      })
      .catch(() => {
        setEditingTask({ ...task, subtasks: [] })
      })
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over) return
    const taskId = active.id
    const newStatus = over.id
    
    const targetTask = tasks.find(t => t.id.toString() === taskId)
    if (targetTask && targetTask.status !== newStatus) {
      axios.patch(`${API_BASE_URL}/tasks/${taskId}/status?new_status=${newStatus}`)
        .then(() => {
          setTasks(prev => prev.map(t => t.id.toString() === taskId ? { ...t, status: newStatus } : t))
        })
        .catch(err => console.error(err))
    }
  }

  const handleCreateProject = (e) => {
    e.preventDefault()
    axios.post(`${API_BASE_URL}/projects/`, projectFormData).then((res) => {
      fetchData()
      setShowProjectForm(false)
      setCurrentProjectId(res.data.id)
      setProjectFormData({ name: '', description: '' })
    }).catch(err => console.error(err))
  }

  const handleCreateTask = (e) => {
    e.preventDefault()
    if (!formData.assignee_id || !formData.sprint_id || !currentProjectId) {
      alert("Please select a Team Member, a Sprint, and ensure a project is active!")
      return
    }
    const payload = { ...formData, project_id: currentProjectId }
    axios.post(`${API_BASE_URL}/tasks/`, payload).then(() => {
      fetchData()
      setShowForm(false)
      setFormData({ title: '', description: '', status: 'To Do', priority: 'Medium', sprint_id: '', assignee_id: '' })
    })
  }

  const handleCreateSprint = (e) => {
    e.preventDefault()
    if (!currentProjectId) return alert("Please select or create a project first!")
    
    const startIndex = months.indexOf(sprintFormData.start_month)
    const endIndex = months.indexOf(sprintFormData.end_month)
    
    if (startIndex > endIndex) {
      alert(`Invalid Timeline: End month (${sprintFormData.end_month}) cannot be chronologically before start month (${sprintFormData.start_month})!`)
      return
    }
    
    if (startIndex === endIndex && sprintFormData.start_week > sprintFormData.end_week) {
      alert(`Invalid Timeline: In ${sprintFormData.start_month}, End week (W${sprintFormData.end_week}) cannot be before start week (W${sprintFormData.start_week})!`)
      return
    }

    const payload = { ...sprintFormData, project_id: currentProjectId, start_date: new Date(), end_date: new Date(), is_active: true }
    axios.post(`${API_BASE_URL}/sprints/`, payload).then(() => {
      fetchData()
      setSprintFormData({ name: '', start_month: 'April', start_week: 1, end_month: 'April', end_week: 2, color: '#0052cc' })
    }).catch(err => console.error(err))
  }

  const handleCreateMember = (e) => {
    e.preventDefault()
    axios.post(`${API_BASE_URL}/users/`, memberFormData)
      .then(() => {
        fetchData()
        setShowMemberForm(false)
        setMemberFormData({ username: '', email: '' })
      })
      .catch(err => alert(err.response?.data?.detail || "Error adding member"))
  }

  const handleDeleteSprint = (sprintId) => {
    if (window.confirm("WARNING: Deleting this sprint will PERMANENTLY delete all tasks within it. Are you sure?")) {
      axios.delete(`${API_BASE_URL}/sprints/${sprintId}`)
        .then(() => {
          if (selectedBoardSprint === sprintId) setSelectedBoardSprint(null)
          fetchData()
        })
        .catch(err => console.error(err))
    }
  }

  const handleUpdateTask = (e) => {
    e.preventDefault()
    axios.put(`${API_BASE_URL}/tasks/${editingTask.id}`, editingTask)
      .then(() => { fetchData(); setEditingTask(null); })
      .catch(err => console.error(err))
  }

  const handleAddSubtask = (e) => {
    if (e) e.preventDefault()
    if (!newSubtaskTitle.trim()) return
    axios.post(`${API_BASE_URL}/subtasks/`, { title: newSubtaskTitle, status: "To Do", task_id: editingTask.id })
      .then((res) => {
        setEditingTask(prev => ({ ...prev, subtasks: [...prev.subtasks, res.data] }))
        setNewSubtaskTitle(''); setShowSubtaskForm(false);
      })
  }

  const handleUpdateSubtaskStatus = (subtaskId, newStatus) => {
    axios.patch(`${API_BASE_URL}/subtasks/${subtaskId}/status?new_status=${newStatus}`)
      .then(() => {
        setEditingTask(prev => ({ ...prev, subtasks: prev.subtasks.map(st => st.id === subtaskId ? { ...st, status: newStatus } : st) }))
        fetchData()
      })
  }

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this task?")) axios.delete(`${API_BASE_URL}/tasks/${id}`).then(() => fetchData())
  }

  const currentSprintName = currentProjectSprints.find(s => s.id === selectedBoardSprint)?.name || 'Select Sprint'

  return (
    <div style={{ padding: '20px 40px', backgroundColor: '#f4f5f7', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <header style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Layout color="#0052cc" size={32} />
            <h1 style={{ color: '#172b4d', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Task Management</h1>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setShowMemberForm(!showMemberForm); setShowForm(false); setShowProjectForm(false); }} style={{ backgroundColor: 'white', color: '#42526e', border: '1px solid #dfe1e6', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} /> + Add Member
            </button>
            <button onClick={() => { setShowForm(!showForm); setShowMemberForm(false); setShowProjectForm(false); }} style={{ backgroundColor: '#0052cc', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              + Create Task
            </button>
          </div>
        </div>

        {/* ACTIVE PROJECT SEÇİM ÇUBUĞU */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '12px 20px', borderRadius: '6px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#5e6c84' }}>Active Project:</span>
          <select 
            value={currentProjectId || ''} 
            onChange={e => setCurrentProjectId(e.target.value ? parseInt(e.target.value) : null)} 
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #dfe1e6', fontSize: '13px', fontWeight: '600', color: '#0052cc', outline: 'none' }}
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            {projects.length === 0 && <option value="">-- No Projects Created Yet --</option>}
          </select>
          <button onClick={() => { setShowProjectForm(!showProjectForm); setShowForm(false); setShowMemberForm(false); }} style={{ background: 'none', border: 'none', color: '#0052cc', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', padding: '0 5px' }}>
            + Create New Project
          </button>
        </div>

        <div style={{ display: 'flex', gap: '20px', borderBottom: '2px solid #dfe1e6', marginBottom: '20px' }}>
          <button onClick={() => setActiveTab('timeline')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: '12px 10px', borderBottom: activeTab === 'timeline' ? '3px solid #0052cc' : '3px solid transparent', color: activeTab === 'timeline' ? '#0052cc' : '#5e6c84', cursor: 'pointer', fontWeight: 'bold' }}>
            <GanttChartSquare size={18} /> Timeline
          </button>
          <button onClick={() => setActiveTab('board')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: '12px 10px', borderBottom: activeTab === 'board' ? '3px solid #0052cc' : '3px solid transparent', color: activeTab === 'board' ? '#0052cc' : '#5e6c84', cursor: 'pointer', fontWeight: 'bold' }}>
            <Kanban size={18} /> Board
          </button>
          <button onClick={() => setActiveTab('backlog')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: '12px 10px', borderBottom: activeTab === 'backlog' ? '3px solid #0052cc' : '3px solid transparent', color: activeTab === 'backlog' ? '#0052cc' : '#5e6c84', cursor: 'pointer', fontWeight: 'bold' }}>
            <ListTodo size={18} /> Backlog
          </button>
          <button onClick={() => setActiveTab('search')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: '12px 10px', borderBottom: activeTab === 'search' ? '3px solid #0052cc' : '3px solid transparent', color: activeTab === 'search' ? '#0052cc' : '#5e6c84', cursor: 'pointer', fontWeight: 'bold' }}>
            <Search size={18} /> Search
          </button>
        </div>
      </header>

      {/* PROJE OLUŞTURMA PANELİ */}
      {showProjectForm && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#172b4d', fontSize: '14px', marginBottom: '15px', fontWeight: 'bold', textTransform: 'uppercase' }}>+ Create New Scope Project</h3>
          <form onSubmit={handleCreateProject} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
            <input placeholder="Project Name (e.g., Generative Music Engine)" value={projectFormData.name} required onChange={e => setProjectFormData({...projectFormData, name: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #dfe1e6', fontSize: '14px' }} />
            <button type="submit" style={{ backgroundColor: '#0052cc', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Save Project</button>
          </form>
        </div>
      )}

      {/* SPRINT SELECTOR */}
      {activeTab === 'board' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '5px 0', marginBottom: '15px' }}>
          <span style={{ fontSize: '13px', color: '#5e6c84', fontWeight: 'bold' }}>Sprint:</span>
          <div style={{ position: 'relative' }}>
            <div onClick={() => setIsSprintOpen(!isSprintOpen)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', padding: '6px 12px', borderRadius: '4px', border: '1px solid #dfe1e6', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#172b4d' }}>
              {currentSprintName}
              <ChevronDown size={14} style={{ transform: isSprintOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
            </div>
            {isSprintOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'white', border: '1px solid #dfe1e6', borderRadius: '4px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', zIndex: 1000, minWidth: '160px' }}>
                {currentProjectSprints.map(s => (
                  <div key={s.id} onClick={() => { setSelectedBoardSprint(s.id); setIsSprintOpen(false); }} style={{ padding: '10px 12px', fontSize: '14px', cursor: 'pointer', color: '#172b4d', backgroundColor: selectedBoardSprint === s.id ? '#e6effc' : 'transparent' }}>
                    {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ height: '20px', width: '1px', backgroundColor: '#dfe1e6' }}></div>
          <span style={{ color: '#5e6c84', fontSize: '12px', fontStyle: 'italic' }}>Managing content for <strong>{currentSprintName}</strong>.</span>
        </div>
      )}

      {/* TEAM MEMBER CREATE FORM */}
      {showMemberForm && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#172b4d', fontSize: '14px', marginBottom: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>+ Add New Team Member</h3>
          <form onSubmit={handleCreateMember} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input placeholder="Username (e.g., Bora)" value={memberFormData.username} required onChange={e => setMemberFormData({...memberFormData, username: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #dfe1e6', fontSize: '14px' }} />
            <input type="email" placeholder="Email Address (e.g., bora@university.com)" value={memberFormData.email} required onChange={e => setMemberFormData({...memberFormData, email: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #dfe1e6', fontSize: '14px' }} />
            <button type="submit" style={{ backgroundColor: '#0052cc', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', gridColumn: 'span 2', fontSize: '14px' }}>Save Team Member</button>
          </form>
        </div>
      )}

      {/* TASK CREATE FORM */}
      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleCreateTask} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input placeholder="Task Title" value={formData.title} required onChange={e => setFormData({...formData, title: e.target.value})} style={{ padding: '10px', gridColumn: 'span 2' }} />
            <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ padding: '10px', gridColumn: 'span 2', minHeight: '80px' }} />
            
            <select value={formData.sprint_id} required onChange={e => setFormData({...formData, sprint_id: e.target.value ? parseInt(e.target.value) : ''})} style={{ padding: '10px' }}>
              <option value="">-- Select Sprint --</option>
              {currentProjectSprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            
            <select value={formData.assignee_id} required onChange={e => setFormData({...formData, assignee_id: e.target.value ? parseInt(e.target.value) : ''})} style={{ padding: '10px' }}>
              <option value="">-- Select Team Member (Assignee) --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
            
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ padding: '10px' }}>{columns.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} style={{ padding: '10px' }}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select>
            <button type="submit" style={{ backgroundColor: '#36b37e', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', gridColumn: 'span 2' }}>Save Task</button>
          </form>
        </div>
      )}

      {/* TIMELINE VIEW */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#172b4d', fontSize: '15px', marginBottom: '15px', fontWeight: 'bold' }}>+ Create Scheduled Sprint</h3>
            <form onSubmit={handleCreateSprint} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Sprint Name (e.g., Sprint 1)" required value={sprintFormData.name} onChange={e => setSprintFormData({...sprintFormData, name: e.target.value})} style={{ padding: '8px', border: '1px solid #dfe1e6', borderRadius: '4px', minWidth: '160px' }} />
              
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#5e6c84', marginBottom: '4px' }}>START MONTH</label>
                <select value={sprintFormData.start_month} onChange={e => setSprintFormData({...sprintFormData, start_month: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #dfe1e6' }}>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#5e6c84', marginBottom: '4px' }}>START WEEK</label>
                <select value={sprintFormData.start_week} onChange={e => setSprintFormData({...sprintFormData, start_week: parseInt(e.target.value)})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #dfe1e6' }}>
                  {weeksPerMonth.map(w => <option key={w} value={w}>Week {w}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#5e6c84', marginBottom: '4px' }}>END MONTH</label>
                <select value={sprintFormData.end_month} onChange={e => setSprintFormData({...sprintFormData, end_month: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #dfe1e6' }}>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#5e6c84', marginBottom: '4px' }}>END WEEK</label>
                <select value={sprintFormData.end_week} onChange={e => setSprintFormData({...sprintFormData, end_week: parseInt(e.target.value)})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #dfe1e6' }}>
                  {weeksPerMonth.map(w => <option key={w} value={w}>Week {w}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#5e6c84', marginBottom: '4px' }}>SPRINT COLOR</label>
                <input type="color" value={sprintFormData.color} onChange={e => setSprintFormData({...sprintFormData, color: e.target.value})} style={{ padding: '0px', width: '45px', height: '36px', border: '1px solid #dfe1e6', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }} />
              </div>

              <button type="submit" style={{ backgroundColor: '#36b37e', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add Sprint</button>
            </form>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
            <div style={{ minWidth: 'fit-content', display: 'grid', gridTemplateColumns: `repeat(${months.length * 4}, 1fr)`, border: '1px solid #dfe1e6', borderRadius: '4px' }}>
              
              {months.map(month => (
                <div key={month} id={`month-${month}`} style={{ gridColumn: 'span 4', textAlign: 'center', padding: '12px', fontWeight: 'bold', borderBottom: '1px solid #dfe1e6', borderRight: '1px solid #dfe1e6', backgroundColor: '#fafbfc', color: '#172b4d' }}>
                  {month}
                </div>
              ))}

              {months.map(() => weeksPerMonth.map((week, idx) => (
                <div key={idx} style={{ textAlign: 'center', padding: '10px', fontSize: '12px', fontWeight: 'bold', color: '#5e6c84', borderBottom: '2px solid #ebecf0', borderRight: '1px solid #dfe1e6', backgroundColor: '#f4f5f7', minWidth: '65px', position: 'sticky', top: 0, boxShadow: '0 2px 2px -1px rgba(0, 0, 0, 0.1)' }}>
                  W{week}
                </div>
              )))}

              <div style={{ gridColumn: `1 / span ${months.length * 4}`, display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px 0', position: 'relative', backgroundColor: '#fafbfc', minHeight: '150px' }}>
                {currentProjectSprints.map(sprint => {
                  const startCol = getGridColumnIndex(sprint.start_month, sprint.start_week)
                  const endCol = getGridColumnIndex(sprint.end_month, sprint.end_week) + 1
                  
                  const primaryColor = sprint.color || '#0052cc';
                  const isDefault = primaryColor === '#0052cc';
                  const bgColor = isDefault ? '#e6effc' : `${primaryColor}1f`;
                  
                  return (
                    <div key={sprint.id} style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length * 4}, 1fr)`, width: '100%' }}>
                      <div 
                        onClick={() => { setSelectedBoardSprint(sprint.id); setActiveTab('board'); }}
                        style={{ gridColumn: `${startCol} / ${endCol}`, backgroundColor: bgColor, border: `2px solid ${primaryColor}`, color: primaryColor, padding: '12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,82,204,0.05)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: '4px', marginRight: '4px', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = isDefault ? '#d2e3fc' : `${primaryColor}33`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = bgColor; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        {sprint.name}
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSprint(sprint.id); }} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: primaryColor, display: 'flex', alignItems: 'center', opacity: 0.6, transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
                {currentProjectSprints.length === 0 && (
                  <div style={{ textHeading: 'center', color: '#6b778c', fontStyle: 'italic', width: '100%', paddingLeft: '20px' }}>No scheduled sprints available for this project. Use the form above to add one!</div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* BOARD VIEW */}
      {activeTab === 'board' ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {columns.map(col => (
              <DroppableColumn key={col} id={col} tasks={currentProjectTasks.filter(t => t.status === col && t.sprint_id === selectedBoardSprint)} onDelete={handleDelete} users={users} onTaskClick={handleTaskClick} />
            ))}
          </div>
        </DndContext>
      ) : null}

      {/* BACKLOG VIEW */}
      {activeTab === 'backlog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {currentProjectSprints.map(sprint => (
            <div key={sprint.id} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '25px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #f4f5f7', paddingBottom: '12px' }}>
                <Calendar size={18} color={sprint.color || "#0052cc"} />
                <h2 style={{ color: '#172b4d', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>{sprint.name} <span style={{ fontSize: '12px', color: '#6b778c', fontWeight: 'normal' }}>({sprint.start_month} W{sprint.start_week} - {sprint.end_month} W{sprint.end_week})</span></h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #ebecf0', color: '#5e6c84', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '12px', width: '100px', textAlign: 'center' }}>TASK ID</th>
                    <th style={{ padding: '12px', width: '35%', textAlign: 'left' }}>TASK</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>STATUS</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>PRIORITY</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>TEAM MEMBER</th>
                    <th style={{ padding: '12px', width: '80px', textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {currentProjectTasks.filter(t => t.sprint_id === sprint.id).map(task => (
                    <tr key={task.id} style={{ borderBottom: '1px solid #ebecf0', opacity: task.status === 'Done' ? 0.55 : 1, transition: 'opacity 0.2s ease', cursor: 'pointer' }} onClick={() => handleTaskClick(task)}>
                      <td style={{ padding: '12px', color: '#6b778c', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>#{task.id}</td>
                      <td style={{ padding: '12px', fontWeight: '500', color: '#172b4d', textAlign: 'left', textDecoration: task.status === 'Done' ? 'line-through' : 'none' }}>{task.title}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ backgroundColor: '#dfe1e6', padding: '4px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold', color: '#42526e' }}>{task.status}</span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>
                        <span style={{ color: task.priority === 'High' ? '#de350b' : task.priority === 'Medium' ? '#ffab00' : '#0052cc', fontWeight: 'bold' }}>{task.priority}</span>
                      </td>
                      <td style={{ padding: '12px', color: '#172b4d', fontSize: '13px', textAlign: 'center' }}>{users.find(u => u.id === task.assignee_id)?.username || 'Unassigned'}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDelete(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#de350b' }}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* SEARCH VIEW */}
      {activeTab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#5e6c84' }}>Advanced Filters:</span>
            
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setFilterValue(''); }} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #dfe1e6', fontSize: '13px', color: '#172b4d', fontWeight: '500', outline: 'none' }}>
              <option value="">-- Select Filter Type --</option>
              <option value="Month">Month</option>
              <option value="Priority">Priority</option>
              <option value="User">Team Member</option>
              <option value="Status">Status</option>
            </select>

            <select value={filterValue} disabled={!filterType} onChange={e => setFilterValue(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #dfe1e6', fontSize: '13px', color: '#172b4d', fontWeight: '500', outline: 'none', backgroundColor: !filterType ? '#f4f5f7' : 'white' }}>
              <option value="">-- Select Value --</option>
              {filterType === 'Month' && months.map(m => <option key={m} value={m}>{m}</option>)}
              {filterType === 'Priority' && ['Low', 'Medium', 'High'].map(p => <option key={p} value={p}>{p}</option>)}
              {filterType === 'User' && users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              {filterType === 'Status' && ['To Do', 'In Progress', 'Done'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {filterType && filterValue && (
              <button onClick={() => { setFilterType(''); setFilterValue(''); }} style={{ background: 'none', border: 'none', color: '#0052cc', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <X size={14} /> Clear Filter
              </button>
            )}
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '25px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ borderBottom: '2px solid #f4f5f7', paddingBottom: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#172b4d', fontWeight: 'bold', fontSize: '16px' }}>
              <Search size={18} color="#0052cc" /> Search Results ({searchedTasks.length})
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #ebecf0', color: '#5e6c84', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px', width: '100px', textAlign: 'center' }}>TASK ID</th>
                  <th style={{ padding: '12px', width: '35%', textAlign: 'left' }}>TASK</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>PRIORITY</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>TEAM MEMBER</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>SPRINT</th>
                  <th style={{ padding: '12px', width: '80px', textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {searchedTasks.map(task => (
                  <tr key={task.id} style={{ borderBottom: '1px solid #ebecf0', opacity: task.status === 'Done' ? 0.55 : 1, cursor: 'pointer' }} onClick={() => handleTaskClick(task)}>
                    <td style={{ padding: '12px', color: '#6b778c', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>#{task.id}</td>
                    <td style={{ padding: '12px', fontWeight: '500', color: '#172b4d', textAlign: 'left', textDecoration: task.status === 'Done' ? 'line-through' : 'none' }}>{task.title}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: '#dfe1e6', padding: '4px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold', color: '#42526e' }}>{task.status}</span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>
                      <span style={{ color: task.priority === 'High' ? '#de350b' : task.priority === 'Medium' ? '#ffab00' : '#0052cc', fontWeight: 'bold' }}>{task.priority}</span>
                    </td>
                    <td style={{ padding: '12px', color: '#172b4d', fontSize: '13px', textAlign: 'center' }}>{users.find(u => u.id === task.assignee_id)?.username || 'Unassigned'}</td>
                    <td style={{ padding: '12px', color: '#0052cc', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>{sprints.find(s => s.id === task.sprint_id)?.name || 'N/A'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDelete(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#de350b' }}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {searchedTasks.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: '#6b778c', fontStyle: 'italic', padding: '30px' }}>No tasks match the selected search filters in this project.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TASK DETAIL MODAL */}
      {editingTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(9, 30, 66, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }} onClick={() => setEditingTask(null)}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '700px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditingTask(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b778c' }}><X size={20} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5e6c84', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '20px', letterSpacing: '0.5px' }}><Kanban size={14} color="#0052cc" /> Task Details • #{editingTask.id}</div>
            <form onSubmit={handleUpdateTask}>
              <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#5e6c84', textTransform: 'uppercase' }}>Task Name</label>
                    <input type="text" value={editingTask.title} required onChange={e => setEditingTask({...editingTask, title: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #dfe1e6', fontSize: '15px', fontWeight: '500', color: '#172b4d', backgroundColor: '#fafbfc' }} />
                  </div>
                  <div style={{ borderTop: '1px solid #ebecf0', paddingTop: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#5e6c84', textTransform: 'uppercase', marginBottom: '12px' }}><ListPlus size={14} /> Subtasks ({editingTask.subtasks?.length || 0})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      {editingTask.subtasks && editingTask.subtasks.length > 0 ? (
                        editingTask.subtasks.map(st => (
                          <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f4f5f7', padding: '8px 12px', borderRadius: '4px', borderLeft: st.status === 'Done' ? '3px solid #36b37e' : st.status === 'In Progress' ? '3px solid #ffab00' : '3px solid #42526e', opacity: st.status === 'Done' ? 0.6 : 1, transition: '0.2s' }}>
                            <Circle size={10} color={st.status === 'Done' ? '#36b37e' : st.status === 'In Progress' ? '#ffab00' : '#42526e'} fill={st.status === 'Done' ? '#36b37e' : st.status === 'In Progress' ? '#ffab00' : '#42526e'} />
                            <span style={{ fontSize: '13px', color: '#172b4d', fontWeight: '500', textDecoration: st.status === 'Done' ? 'line-through' : 'none' }}>{st.title}</span>
                            <select value={st.status} onChange={(e) => handleUpdateSubtaskStatus(st.id, e.target.value)} style={{ marginLeft: 'auto', backgroundColor: st.status === 'Done' ? '#e3fcef' : st.status === 'In Progress' ? '#fff0b3' : '#dfe1e6', color: st.status === 'Done' ? '#006644' : st.status === 'In Progress' ? '#172b4d' : '#42526e', border: 'none', padding: '4px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}>
                              <option value="To Do">To Do</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Done">Done</option>
                            </select>
                          </div>
                        ))
                      ) : <div style={{ fontSize: '13px', color: '#6b778c', fontStyle: 'italic', paddingLeft: '4px' }}>No subtasks created yet.</div>}
                    </div>
                    {showSubtaskForm ? (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                        <input type="text" placeholder="What needs to be done?" value={newSubtaskTitle} autoFocus onChange={e => setNewSubtaskTitle(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: '4px', border: '2px solid #0052cc', fontSize: '13px' }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }} />
                        <button type="button" onClick={handleAddSubtask} style={{ backgroundColor: '#36b37e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Add</button>
                        <button type="button" onClick={() => setShowSubtaskForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b778c', fontSize: '13px', fontWeight: '600' }}>Cancel</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setShowSubtaskForm(true)} style={{ backgroundColor: 'transparent', color: '#36b37e', border: '1px solid #36b37e', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '5px' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(54, 179, 126, 0.05)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>+ Add Subtask</button>
                    )}
                  </div>
                </div>
                
                <div style={{ flex: 0.8, backgroundColor: '#f4f5f7', padding: '16px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#5e6c84', textTransform: 'uppercase' }}>Team Member</label>
                    <select value={editingTask.assignee_id || ''} required onChange={e => setEditingTask({...editingTask, assignee_id: parseInt(e.target.value)})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #dfe1e6', fontSize: '13px', color: '#172b4d', fontWeight: '500', backgroundColor: 'white' }}>
                      {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#5e6c84', textTransform: 'uppercase' }}>Priority</label>
                    <select value={editingTask.priority} onChange={e => setEditingTask({...editingTask, priority: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #dfe1e6', fontSize: '13px', color: '#172b4d', fontWeight: '500', backgroundColor: 'white' }}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#5e6c84', textTransform: 'uppercase' }}>Current Status</span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#42526e', paddingLeft: '2px' }}>{editingTask.status}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #ebecf0', paddingTop: '15px' }}>
                <button type="button" onClick={() => setEditingTask(null)} style={{ backgroundColor: 'transparent', border: 'none', padding: '10px 15px', cursor: 'pointer', color: '#42526e', fontWeight: '600', fontSize: '14px' }}>Cancel</button>
                <button type="submit" style={{ backgroundColor: '#0052cc', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App