import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Plus, Search, Edit2, Trash2, Eye, EyeOff } from 'lucide-react'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const emptyForm = { name: '', email: '', role: 'staff', phone: '', address: '', password: '' }
const roleLabels = { admin: 'Admin', staff: 'Nhân viên' }

export default function Employees() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const fetchData = useCallback(() => {
    axios.get('/api/employees', { params: { search } }).then(r => setEmployees(r.data))
  }, [search])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (e) => { setEditing(e); setForm({ name: e.name, email: e.email, role: e.role, phone: e.phone || '', address: e.address || '', password: '' }); setModalOpen(true) }

  const isValidPhone = (phone) => /^0\d{9}$/.test(phone)

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!isValidPhone(form.phone)) return alert('Số điện thoại phải bắt đầu bằng số 0 và gồm đúng 10 chữ số')
    setLoading(true)
    try {
      if (editing) await axios.put(`/api/employees/${editing.id}`, form)
      else await axios.post('/api/employees', form)
      setModalOpen(false); fetchData()
    } catch (err) { alert(err.response?.data?.error || 'Lỗi') }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa nhân viên này?')) return
    try { await axios.delete(`/api/employees/${id}`); fetchData() } catch (err) { alert(err.response?.data?.error) }
  }

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Quản lý nhân viên</h1>
        {isAdmin && <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"><Plus size={18} /> Thêm nhân viên</button>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tìm kiếm nhân viên..." />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Mã NV</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Họ tên</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Mật khẩu</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">SĐT</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Vai trò</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Ngày tạo</th>
                {isAdmin && <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Tác vụ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.length === 0 ? (
                <tr><td colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-gray-400">Chưa có nhân viên nào</td></tr>
              ) : employees.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">{e.code}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{e.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.email}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">{e.password_display || e.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.phone || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${e.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{roleLabels[e.role]}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.created_at?.split(' ')[0]}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openEdit(e)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(e.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal title={editing ? 'Sửa nhân viên' : 'Thêm nhân viên'} open={modalOpen} onClose={() => setModalOpen(false)} size="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-lg text-sm">
            Mã nhân viên sẽ được tạo tự động. {!editing ? 'Nếu không nhập mật khẩu, hệ thống sẽ dùng mã nhân viên làm mật khẩu mặc định.' : 'Có thể để trống nếu không muốn đổi mật khẩu.'}
          </div>
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
              <input type="text" value={form.phone} onChange={e => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} inputMode="numeric" pattern="0[0-9]{9}" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu {editing && <span className="text-xs text-gray-500">(để trống nếu không đổi)</span>}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => update('password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                placeholder={editing ? 'Nhập mật khẩu mới' : 'Có thể để trống để dùng mã nhân viên'}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
              <select value={form.role} onChange={e => update('role', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="staff">Nhân viên</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
              <input type="text" value={form.address} onChange={e => update('address', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
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
