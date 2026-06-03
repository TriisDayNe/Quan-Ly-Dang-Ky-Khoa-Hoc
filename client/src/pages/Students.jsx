import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'

const emptyForm = { name: '', email: '', phone: '', address: '', date_of_birth: '', gender: 'male' }
const genderLabels = { male: 'Nam', female: 'Nữ', other: 'Khác' }

export default function Students() {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(() => {
    axios.get('/api/students', { params: { search } }).then(r => setStudents(r.data))
  }, [search])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, email: s.email || '', phone: s.phone || '', address: s.address || '', date_of_birth: s.date_of_birth || '', gender: s.gender || 'male' }); setModalOpen(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editing) await axios.put(`/api/students/${editing.id}`, form)
      else await axios.post('/api/students', form)
      setModalOpen(false); fetchData()
    } catch (err) { alert(err.response?.data?.error || 'Lỗi') }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa học viên này?')) return
    try { await axios.delete(`/api/students/${id}`); fetchData() } catch (err) { alert(err.response?.data?.error) }
  }

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const fmtDate = (d) => {
    if (!d) return '-'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  const today = new Date().toLocaleDateString('vi-VN')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Quản lý học viên</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"><Plus size={18} /> Thêm học viên</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tìm kiếm học viên..." />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Mã HV</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Họ tên</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Email</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">SĐT</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Ngày sinh</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Địa chỉ</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Giới tính</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Ngày tạo</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Chưa có học viên nào</td></tr>
              ) : students.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">{s.code}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{s.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{s.email || '-'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{s.phone || '-'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDate(s.date_of_birth)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 max-w-[200px] truncate">{s.address || '-'}</td>
                  <td className="px-6 py-3 text-sm text-center text-gray-500 whitespace-nowrap">{genderLabels[s.gender] || '-'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDate(s.created_at?.split(' ')[0])}</td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => openEdit(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal title={editing ? 'Sửa học viên' : 'Thêm học viên'} open={modalOpen} onClose={() => setModalOpen(false)} size="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input type="text" value={form.phone} onChange={e => update('phone', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
              <input type="date" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
              <select value={form.gender} onChange={e => update('gender', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
              <input type="text" value={form.address} onChange={e => update('address', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tạo</label>
              <input type="text" value={!editing ? today : fmtDate(editing?.created_at?.split(' ')[0])} disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
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
