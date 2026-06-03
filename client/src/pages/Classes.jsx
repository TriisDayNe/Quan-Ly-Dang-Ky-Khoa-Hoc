import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const statusLabels = { upcoming: 'Sắp khai giảng', ongoing: 'Đang học', completed: 'Đã kết thúc', cancelled: 'Đã hủy' }
const statusColors = { upcoming: 'bg-blue-100 text-blue-700', ongoing: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-gray-500', cancelled: 'bg-red-100 text-red-700' }
const emptyForm = { course_id: '', teacher_id: '', name: '', schedule: '', room: '', max_students: '20', status: 'upcoming' }

export default function Classes() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [classes, setClasses] = useState([])
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(() => {
    axios.get('/api/classes', { params: { search } }).then(r => setClasses(r.data))
  }, [search])

  useEffect(() => { fetchData(); axios.get('/api/courses').then(r => setCourses(r.data)); axios.get('/api/employees/teachers').then(r => setTeachers(r.data)) }, [fetchData])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({ course_id: c.course_id, teacher_id: c.teacher_id || '', name: c.name, schedule: c.schedule || '', room: c.room || '', max_students: c.max_students || 20, status: c.status })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editing) await axios.put(`/api/classes/${editing.id}`, form)
      else await axios.post('/api/classes', form)
      setModalOpen(false); fetchData()
    } catch (err) { alert(err.response?.data?.error || 'Lỗi') }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa lớp học này?')) return
    try { await axios.delete(`/api/classes/${id}`); fetchData() } catch (err) { alert(err.response?.data?.error) }
  }

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const fmtDate = (d) => {
    if (!d) return '-'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Quản lý lớp học</h1>
        {isAdmin && <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"><Plus size={18} /> Thêm lớp học</button>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tìm kiếm lớp học..." />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Mã lớp</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Tên lớp</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Khóa học</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Giảng viên</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Lịch học</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Phòng</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Học viên</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Trạng thái</th>
                {isAdmin && <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Tác vụ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {classes.length === 0 ? (
                <tr><td colSpan={isAdmin ? 9 : 8} className="text-center py-8 text-gray-400">Chưa có lớp học nào</td></tr>
              ) : classes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">{c.code}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{c.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{c.course_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{c.teacher_name || '-'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{c.schedule || '-'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{c.room || '-'}</td>
                  <td className="px-6 py-3 text-sm text-center text-gray-700 whitespace-nowrap">{c.current_students}/{c.max_students}</td>
                  <td className="px-6 py-3 text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[c.status]}`}>{statusLabels[c.status]}</span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal title={editing ? 'Sửa lớp học' : 'Thêm lớp học'} open={modalOpen} onClose={() => setModalOpen(false)} size="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Khóa học</label>
              <select value={form.course_id} onChange={e => update('course_id', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">-- Chọn khóa học --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name} - {new Intl.NumberFormat('vi-VN').format(c.price)}đ</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giảng viên</label>
              <select value={form.teacher_id} onChange={e => update('teacher_id', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">-- Chọn giảng viên --</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên lớp</label>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lịch học</label>
              <input type="text" value={form.schedule} onChange={e => update('schedule', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="VD: Thứ 2,4 - 18:00-20:00" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phòng học</label>
              <input type="text" value={form.room} onChange={e => update('room', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="VD: P201" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sĩ số tối đa</label>
              <input type="number" value={form.max_students} onChange={e => update('max_students', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select value={form.status} onChange={e => update('status', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="upcoming">Sắp khai giảng</option>
                <option value="ongoing">Đang học</option>
                <option value="completed">Đã kết thúc</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">{editing ? 'Cập nhật' : 'Tạo mới'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
