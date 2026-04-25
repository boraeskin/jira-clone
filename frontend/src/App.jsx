import { useEffect, useState } from 'react'
import axios from 'axios'
import { Layout, CheckCircle2, Clock, AlertCircle, PlusCircle, Trash2, User, ListTodo, Kanban, Calendar, Filter } from 'lucide-react'
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

// --- 1. SÜRÜKLENEBİLİR KART BİLEŞENİ (Renkler ve Smooth Geçişler Korundu) ---
function DraggableTask({ task, onDelete, users }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id.toString(),
    data: { task }
  })

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#de350b';   // Kırmızı
      case 'Medium': return '#ffab00'; // Sarı
      case 'Low': return '#0052cc';    // Mavi
      default: return '#dfe1e6';
    }
  }

  const assignee = users.find(u => u.id === task.assignee_id)

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
    backgroundColor: 'white', padding: '15px', borderRadius: '4px', 
    boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.1)', 
    marginBottom: '10px',
    borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
    position: 'relative', cursor: 'grab', zIndex: isDragging ? 999 : 1,
    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s ease',
    transformOrigin: '0 0'
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
        style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b778c' }}
      >
        <Trash2 size={16} />
      </button>
      <div style={{ fontSize: '14px', color: '#172b4d', fontWeight: '500', paddingRight: '20px', marginBottom: '8px' }}>{task.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
        <User size={12} color="#6b778c" />
        <span style={{ fontSize: '12px', color: '#5e6c84', fontStyle: 'italic' }}>{assignee ? assignee.username : "Atanmadı"}</span>
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

// --- 2. BIRAKILABİLİR SÜTUN BİLEŞENİ ---
function DroppableColumn({ id, tasks, onDelete, users }) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} style={{ backgroundColor: '#ebecf0', borderRadius: '8px', padding: '12px', minHeight: '550px' }}>
      <h3 style={{ color: '#5e6c84', fontSize: '12px', textTransform: 'uppercase', marginBottom: '15px' }}>{id} • {tasks.length}</h3>
      {tasks.map(task => <DraggableTask key={task.id} task={task} onDelete={onDelete} users={users} />)}
    </div>
  )
}

// --- 3. ANA UYGULAMA ---
function App() {
  const [activeTab, setActiveTab] = useState('board')
  const [selectedBoardSprint, setSelectedBoardSprint] = useState(1) // Board'da filtrelenecek sprint
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [sprints, setSprints] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ 
    title: '', description: '', status: 'To Do', priority: 'Medium', sprint_id: 1, assignee_id: '' 
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const columns = ["To Do", "In Progress", "Done"]

  const fetchData = async () => {
    try {
      const [tasksRes, usersRes, sprintsRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/tasks/'),
        axios.get('http://127.0.0.1:8000/users/'),
        axios.get('http://127.0.0.1:8000/sprints/')
      ])
      setTasks(tasksRes.data)
      setUsers(usersRes.data)
      setSprints(sprintsRes.data)
      
      if (usersRes.data.length > 0 && !formData.assignee_id) {
        setFormData(prev => ({ ...prev, assignee_id: usersRes.data[0].id }))
      }
    } catch (err) { console.error(err) }
  }

  useEffect(() => { fetchData() }, [])

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over) return
    const taskId = active.id
    const newStatus = over.id
    if (tasks.find(t => t.id.toString() === taskId).status !== newStatus) {
      axios.patch(`http://127.0.0.1:8000/tasks/${taskId}/status?new_status=${newStatus}`)
        .then(() => setTasks(prev => prev.map(t => t.id.toString() === taskId ? { ...t, status: newStatus } : t)))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    axios.post('http://127.0.0.1:8000/tasks/', formData).then(() => {
      fetchData(); setShowForm(false); setFormData({ ...formData, title: '', description: '' })
    })
  }

  const handleDelete = (id) => {
    if (window.confirm("Silinsin mi?")) axios.delete(`http://127.0.0.1:8000/tasks/${id}`).then(() => fetchData())
  }

  return (
    <div style={{ padding: '20px 40px', backgroundColor: '#f4f5f7', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      <header style={{ marginBottom: '20px', borderBottom: '2px solid #dfe1e6', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Layout color="#0052cc" size={32} />
            <h1 style={{ color: '#172b4d', margin: 0, fontSize: '24px' }}>Project Management</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ backgroundColor: '#0052cc', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            + Yeni Görev
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          {/* SEKMELER */}
          <div style={{ display: 'flex', gap: '20px' }}>
            <button onClick={() => setActiveTab('board')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: '10px', borderBottom: activeTab === 'board' ? '3px solid #0052cc' : '3px solid transparent', color: activeTab === 'board' ? '#0052cc' : '#5e6c84', cursor: 'pointer', fontWeight: 'bold' }}>
              <Kanban size={18} /> Board
            </button>
            <button onClick={() => setActiveTab('backlog')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: '10px', borderBottom: activeTab === 'backlog' ? '3px solid #0052cc' : '3px solid transparent', color: activeTab === 'backlog' ? '#0052cc' : '#5e6c84', cursor: 'pointer', fontWeight: 'bold' }}>
              <ListTodo size={18} /> Backlog
            </button>
          </div>

          {/* SPRINT FİLTRESİ (Sadece Board sekmesinde görünür) */}
          {activeTab === 'board' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', padding: '6px 12px', borderRadius: '4px', border: '1px solid #dfe1e6', marginBottom: '5px' }}>
              <Filter size={16} color="#5e6c84" />
              <span style={{ fontSize: '13px', color: '#5e6c84', fontWeight: '600' }}>Sprint:</span>
              <select 
                value={selectedBoardSprint} 
                onChange={(e) => setSelectedBoardSprint(parseInt(e.target.value))}
                style={{ border: 'none', outline: 'none', color: '#0052cc', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
              >
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </header>

      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', marginBottom: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h2 style={{ textAlign: 'center', color: '#172b4d', marginBottom: '25px', fontSize: '18px' }}>Yeni Görev Oluştur</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input placeholder="Görev Başlığı" value={formData.title} required onChange={e => setFormData({...formData, title: e.target.value})} style={{ padding: '10px', gridColumn: 'span 2' }} />
            <textarea placeholder="Açıklama" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ padding: '10px', gridColumn: 'span 2', minHeight: '80px' }} />
            
            <select value={formData.sprint_id} required onChange={e => setFormData({...formData, sprint_id: parseInt(e.target.value)})} style={{ padding: '10px' }}>
              <option value="">Sprint Seçin...</option>
              {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select value={formData.assignee_id} required onChange={e => setFormData({...formData, assignee_id: parseInt(e.target.value)})} style={{ padding: '10px' }}>
              <option value="">Sorumlu Seçin...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>

            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ padding: '10px' }}>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} style={{ padding: '10px' }}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <button type="submit" style={{ backgroundColor: '#36b37e', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', gridColumn: 'span 2' }}>Kaydet</button>
          </form>
        </div>
      )}

      {/* SEKME İÇERİĞİ */}
      {activeTab === 'board' ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {columns.map(col => (
              <DroppableColumn 
                key={col} 
                id={col} 
                /* FİLTRELEME: Sadece seçilen sprinte ait görevler board'da görünür */
                tasks={tasks.filter(t => t.status === col && t.sprint_id === selectedBoardSprint)} 
                onDelete={handleDelete} 
                users={users} 
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {sprints.map(sprint => (
            <div key={sprint.id} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #ebecf0', paddingBottom: '10px' }}>
                <Calendar size={18} color="#0052cc" />
                <h2 style={{ color: '#172b4d', fontSize: '18px', margin: 0 }}>{sprint.name}</h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #ebecf0', color: '#5e6c84', fontSize: '12px' }}>
                    <th style={{ padding: '12px' }}>GÖREV</th>
                    <th style={{ padding: '12px' }}>DURUM</th>
                    <th style={{ padding: '12px' }}>ÖNCELİK</th>
                    <th style={{ padding: '12px' }}>SORUMLU</th>
                    <th style={{ padding: '12px' }}>İŞLEM</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.filter(t => t.sprint_id === sprint.id).map(task => (
                    <tr key={task.id} style={{ borderBottom: '1px solid #ebecf0' }}>
                      <td style={{ padding: '12px', fontWeight: '500', color: '#172b4d' }}>{task.title}</td>
                      <td style={{ padding: '12px' }}><span style={{ backgroundColor: '#dfe1e6', padding: '4px 8px', borderRadius: '3px', fontSize: '12px' }}>{task.status}</span></td>
                      <td style={{ padding: '12px' }}>{task.priority}</td>
                      <td style={{ padding: '12px' }}>{users.find(u => u.id === task.assignee_id)?.username || 'Atanmadı'}</td>
                      <td style={{ padding: '12px' }}>
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
    </div>
  )
}

export default App