import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Plus, Search, Edit2, Trash2, Eye, X } from 'lucide-react'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const statusLabels = { success: 'Thành công', pending: 'Đang chờ', cancelled: 'Đã hủy' }
const statusColors = { success: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', cancelled: 'bg-red-100 text-red-700' }

export default function Registrations() {
  const { user } = useAuth()
  const [registrations, setRegistrations] = useState([])
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [selectedClasses, setSelectedClasses] = useState([])
  const [form, setForm] = useState({
    student_id: '', employee_id: user?.id || '',
    registration_date: new Date().toISOString().slice(0, 10),
    status: 'pending'
  })
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(() => {
    const params = { search }
    if (statusFilter) params.status = statusFilter
    axios.get('/api/registrations', { params }).then(r => setRegistrations(r.data))
  }, [search, statusFilter])

  useEffect(() => {
    fetchData()
    axios.get('/api/students').then(r => setStudents(r.data))
    axios.get('/api/classes').then(r => setClasses(r.data.filter(c => c.status !== 'completed' && c.status !== 'cancelled')))
    axios.get('/api/employees').then(r => setEmployees(r.data))
  }, [fetchData])

  const emptyForm = {
    student_id: '', employee_id: user?.id || '',
    registration_date: new Date().toISOString().slice(0, 10),
    status: 'pending'
  }

  const openCreate = () => { setEditing(null); setForm(emptyForm); setSelectedClasses([]); setModalOpen(true) }
  const openEdit = (r) => {
    setEditing(r)
    setForm({ student_id: r.student_id, employee_id: r.employee_id || '', registration_date: r.registration_date, status: r.status })
    // Parse existing class_ids
    const ids = r.class_ids ? r.class_ids.split(',').map(Number) : [r.class_id]
    setSelectedClasses(ids)
    setModalOpen(true)
  }
  const openView = async (r) => {
    try { const res = await axios.get(`/api/registrations/${r.id}`); setViewing(res.data); setViewOpen(true) } catch { alert('Không tải được chi tiết') }
  }

  // Calculate total from selected classes
  const calcTotal = () => {
    return selectedClasses.reduce((sum, cid) => {
      const cls = classes.find(c => c.id == cid)
      return sum + (cls?.course_price || 0)
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedClasses.length === 0) return alert('Vui lòng chọn ít nhất 1 lớp học')
    setLoading(true)
    try {
      const payload = {
        ...form,
        class_ids: selectedClasses
      }
      if (editing) {
        payload.class_id = selectedClasses[0]
        payload.class_ids = selectedClasses.join(',')
        payload.total_amount = calcTotal()
        await axios.put(`/api/registrations/${editing.id}`, payload)
      } else {
        await axios.post('/api/registrations', payload)
      }
      setModalOpen(false); fetchData()
    } catch (err) { alert(err.response?.data?.error || 'Lỗi') }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa phiếu đăng ký này?')) return
    try { await axios.delete(`/api/registrations/${id}`); fetchData() } catch (err) { alert(err.response?.data?.error) }
  }

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const toggleClass = (classId) => {
    setSelectedClasses(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    )
  }

  const handleStudentChange = (studentId) => {
    update('student_id', studentId)
    if (!editing) setSelectedClasses([])
  }

  const fmtDate = (d) => {
    if (!d) return '-'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  const todayStr = new Date().toLocaleDateString('vi-VN')
  const totalAmount = calcTotal()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Quản lý phiếu đăng ký</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"><Plus size={18} /> Tạo phiếu đăng ký</button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tìm kiếm..." />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Đang chờ</option>
          <option value="success">Thành công</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Mã phiếu</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Nhân viên</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Học viên</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Ngày đăng ký</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Tổng tiền</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Trạng thái</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registrations.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Chưa có phiếu đăng ký nào</td></tr>
              ) : registrations.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">{r.code}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 whitespace-nowrap">{r.employee_name || '-'}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 whitespace-nowrap">{r.student_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDate(r.registration_date)}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium text-gray-700 whitespace-nowrap">{new Intl.NumberFormat('vi-VN').format(r.final_amount)} đ</td>
                  <td className="px-6 py-3 text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[r.status]}`}>{statusLabels[r.status]}</span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => openView(r)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><Eye size={16} /></button>
                      <button onClick={() => openEdit(r)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal title={editing ? 'Sửa phiếu đăng ký' : 'Tạo phiếu đăng ký'} open={modalOpen} onClose={() => setModalOpen(false)} size="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên</label>
              <select value={form.employee_id} onChange={e => update('employee_id', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">-- Chọn NV --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.code} - {e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày đăng ký</label>
              <input type="text" value={!editing ? todayStr : fmtDate(form.registration_date)} disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Học viên</label>
            <select value={form.student_id} onChange={e => handleStudentChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">-- Chọn học viên --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name} - {s.phone || 'N/A'}</option>)}
            </select>
          </div>

          {/* Multi-select classes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lớp học {!editing && <span className="text-blue-600 text-xs">(chọn nhiều lớp, tổng tiền tự tính)</span>}
            </label>
            <div className="border border-gray-300 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
              {classes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Chưa có lớp học khả dụng</p>
              ) : classes.map(c => {
                const isChecked = selectedClasses.includes(c.id)
                return (
                  <label key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm transition ${isChecked ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleClass(c.id)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                    <span className="flex-1 font-medium text-gray-700">{c.code} - {c.name}</span>
                    <span className="text-xs text-gray-400">{c.course_name}</span>
                    <span className="text-xs font-medium text-blue-600">{c.course_price ? new Intl.NumberFormat('vi-VN').format(c.course_price) + 'đ' : ''}</span>
                  </label>
                )
              })}
            </div>
            {selectedClasses.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedClasses.map(cid => {
                  const cls = classes.find(c => c.id == cid)
                  return cls ? (
                    <span key={cid} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {cls.code} - {cls.course_name}
                      {!editing && <button type="button" onClick={() => toggleClass(cid)}><X size={12} /></button>}
                    </span>
                  ) : null
                })}
              </div>
            )}
          </div>

          {/* Auto-calculated total */}
          <div className="bg-green-50 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Tổng tiền:</span>
            <span className="text-xl font-bold text-green-700">{new Intl.NumberFormat('vi-VN').format(totalAmount)} đ</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select value={form.status} onChange={e => update('status', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="pending">Đang chờ</option>
              <option value="success">Thành công</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">{editing ? 'Cập nhật' : 'Tạo phiếu'}</button>
          </div>
        </form>
      </Modal>

      <Modal title={`Chi tiết phiếu đăng ký ${viewing?.code || ''}`} open={viewOpen} onClose={() => setViewOpen(false)} size="max-w-2xl">
        {viewing && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Mã phiếu:</span> <span className="font-semibold text-blue-700">{viewing.code}</span></div>
                <div><span className="text-gray-500">Ngày đăng ký:</span> <span className="font-medium">{fmtDate(viewing.registration_date)}</span></div>
                <div><span className="text-gray-500">Nhân viên:</span> <span className="font-medium">{viewing.employee_name || '-'}</span></div>
                <div><span className="text-gray-500">Trạng thái:</span> <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[viewing.status]}`}>{statusLabels[viewing.status]}</span></div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">Thông tin học viên</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Mã HV:</span> <span className="font-medium">{viewing.student_code}</span></div>
                <div><span className="text-gray-500">Họ tên:</span> <span className="font-medium">{viewing.student_name}</span></div>
                <div><span className="text-gray-500">SĐT:</span> <span>{viewing.student_phone || '-'}</span></div>
                <div><span className="text-gray-500">Email:</span> <span>{viewing.student_email || '-'}</span></div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">Lớp học đã chọn</h4>
              {viewing.all_classes?.length > 0 ? (
                <div className="space-y-2">
                  {viewing.all_classes.map((cls, i) => (
                    <div key={i} className="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 rounded">
                      <div>
                        <span className="font-medium text-gray-700">{cls.code || ''} - {cls.name}</span>
                        <span className="text-gray-400 ml-2">({cls.course_name})</span>
                      </div>
                      <span className="font-medium text-blue-600">{cls.course_price ? new Intl.NumberFormat('vi-VN').format(cls.course_price) + ' đ' : ''}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold text-lg border-t pt-2 mt-2">
                    <span>Tổng cộng:</span>
                    <span className="text-green-600">{new Intl.NumberFormat('vi-VN').format(viewing.final_amount)} đ</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Không có thông tin lớp học</p>
              )}
            </div>

            {viewing.payments?.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Lịch sử thanh toán</h4>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Phiếu thu</th><th className="pb-2">Số tiền</th><th className="pb-2">Ngày thu</th></tr></thead>
                  <tbody>{viewing.payments.map(p => <tr key={p.id} className="border-b border-gray-50"><td className="py-2 font-medium text-blue-600">{p.receipt_number}</td><td className="py-2">{new Intl.NumberFormat('vi-VN').format(p.amount)} đ</td><td className="py-2">{fmtDate(p.payment_date)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
