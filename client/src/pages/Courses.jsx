import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const emptyForm = { name: '', price: '', start_date: '', end_date: '', duration: '' }

function formatCurrency(val) {
  if (!val) return ''
  return Number(val.replace(/\D/g, '')).toLocaleString('vi-VN')
}

export default function Courses() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [courses, setCourses] = useState([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(() => {
    axios.get('/api/courses', { params: { search } }).then(r => setCourses(r.data))
  }, [search])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({
      name: c.name, price: c.price ? c.price.toLocaleString('vi-VN') : '', start_date: c.start_date || '', end_date: c.end_date || '',
      duration: c.duration || ''
    })
    setModalOpen(true)
  }

  const handlePriceChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '')
    setForm(p => ({ ...p, price: raw ? Number(raw).toLocaleString('vi-VN') : '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        duration: parseInt(form.duration) || 0,
        price: parseInt(form.price.replace(/\D/g, '')) || 0
      }
      if (editing) await axios.put(`/api/courses/${editing.id}`, payload)
      else await axios.post('/api/courses', payload)
      setModalOpen(false)
      fetchData()
    } catch (err) { alert(err.response?.data?.error || 'Lỗi') }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa khóa học này?')) return
    try { await axios.delete(`/api/courses/${id}`); fetchData() } catch (err) { alert(err.response?.data?.error) }
  }

  const update = (field, value) => setForm(p => ({ ...p, [field]: value }))

  const fmtDate = (d) => {
    if (!d) return '-'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Quản lý khóa học</h1>
        {isAdmin && <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"><Plus size={18} /> Thêm khóa học</button>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tìm kiếm khóa học..." />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Mã khóa học</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Tên khóa học</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Phí</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Ngày bắt đầu</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Ngày kết thúc</th>
                {isAdmin && <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Tác vụ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.length === 0 ? (
                <tr><td colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-gray-400">Chưa có khóa học nào</td></tr>
              ) : courses.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">{c.code}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{c.name}</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-700 font-medium whitespace-nowrap">{new Intl.NumberFormat('vi-VN').format(c.price)} đ</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDate(c.start_date)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDate(c.end_date)}</td>
                  {isAdmin && (
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal title={editing ? 'Sửa khóa học' : 'Thêm khóa học'} open={modalOpen} onClose={() => setModalOpen(false)} size="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên khóa học</label>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Học phí (VNĐ)</label>
              <input type="text" value={form.price} onChange={handlePriceChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="VD: 10.000.000" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số buổi</label>
              <input type="number" value={form.duration} onChange={e => update('duration', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
              <input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
              <input type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50">{editing ? 'Cập nhật' : 'Tạo mới'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
