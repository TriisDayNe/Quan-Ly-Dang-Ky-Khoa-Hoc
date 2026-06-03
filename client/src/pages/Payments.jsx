import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Plus, Search, Edit2, Trash2, Eye, FileText } from 'lucide-react'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

export default function Payments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    registration_id: '', student_id: '', employee_id: user?.id || '',
    amount: '', payment_date: new Date().toISOString().slice(0, 10)
  })
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(() => {
    const params = { search }
    axios.get('/api/payments', { params }).then(r => setPayments(r.data))
  }, [search])

  useEffect(() => {
    fetchData()
    axios.get('/api/registrations', { params: { status: 'success' } }).then(r => setRegistrations(r.data))
  }, [fetchData])

  const emptyForm = {
    registration_id: '', student_id: '', employee_id: user?.id || '',
    amount: '', payment_date: new Date().toISOString().slice(0, 10)
  }

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (p) => {
    setEditing(p)
    setForm({
      registration_id: p.registration_id, student_id: p.student_id, employee_id: p.employee_id || user?.id || '',
      amount: p.amount, payment_date: p.payment_date
    })
    setModalOpen(true)
  }
  const openView = async (p) => {
    try { const res = await axios.get(`/api/payments/${p.id}`); setViewing(res.data); setViewOpen(true) } catch { alert('Không tải được chi tiết') }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form, amount: parseFloat(form.amount), payment_method: 'cash' }
      if (editing) await axios.put(`/api/payments/${editing.id}`, payload)
      else await axios.post('/api/payments', payload)
      setModalOpen(false); fetchData()
    } catch (err) { alert(err.response?.data?.error || 'Lỗi') }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa phiếu thu này?')) return
    try { await axios.delete(`/api/payments/${id}`); fetchData() } catch (err) { alert(err.response?.data?.error) }
  }

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleRegChange = (regId) => {
    update('registration_id', regId)
    const reg = registrations.find(r => r.id == regId)
    if (reg) {
      update('student_id', reg.student_id)
      if (!editing) update('amount', reg.final_amount)
    }
  }

  const formatMoney = (v) => new Intl.NumberFormat('vi-VN').format(v)

  const fmtDate = (d) => {
    if (!d) return '-'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Quản lý phiếu thu</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"><Plus size={18} /> Tạo phiếu thu</button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tìm kiếm..." />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Mã phiếu thu</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Mã phiếu ĐK</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Nhân viên thu</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Ngày thu</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Số tiền</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Chưa có phiếu thu nào</td></tr>
              ) : payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">{p.receipt_number}</td>
                  <td className="px-6 py-3 text-sm text-blue-600 whitespace-nowrap">{p.registration_code}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 whitespace-nowrap">{p.employee_name || user?.name || '-'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDate(p.payment_date)}</td>
                  <td className="px-6 py-3 text-sm text-right font-semibold text-green-600 whitespace-nowrap">{formatMoney(p.amount)} đ</td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => openView(p)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><Eye size={16} /></button>
                      <button onClick={() => openEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal title={editing ? 'Sửa phiếu thu' : 'Tạo phiếu thu'} open={modalOpen} onClose={() => setModalOpen(false)} size="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm">
            Nhân viên thu: <strong>{user?.name}</strong> (tự động theo tài khoản đăng nhập)
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phiếu đăng ký</label>
            <select value={form.registration_id} onChange={e => handleRegChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">-- Chọn phiếu đăng ký --</option>
              {registrations.map(r => <option key={r.id} value={r.id}>{r.code} - {r.student_name} - {r.course_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền thu (VNĐ)</label>
              <input type="number" value={form.amount} onChange={e => update('amount', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày thu</label>
              <input type="date" value={form.payment_date} onChange={e => update('payment_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">{editing ? 'Cập nhật' : 'Tạo phiếu thu'}</button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal title="Chi tiết phiếu thu" open={viewOpen} onClose={() => setViewOpen(false)} size="max-w-2xl">
        {viewing && (
          <div className="space-y-4">
            <div className="text-center border-b pb-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FileText size={20} className="text-blue-600" />
                <h3 className="text-lg font-bold text-blue-800">PHIẾU THU</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600">{viewing.receipt_number}</p>
              <p className="text-sm text-gray-500 mt-1">Ngày: {fmtDate(viewing.payment_date)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Học viên:</span><p className="font-medium">{viewing.student_name} ({viewing.student_code})</p></div>
              <div><span className="text-gray-500">Khóa học:</span><p className="font-medium">{viewing.course_name}</p></div>
              <div><span className="text-gray-500">Lớp học:</span><p className="font-medium">{viewing.class_name}</p></div>
              <div><span className="text-gray-500">Mã phiếu ĐK:</span><p className="font-medium text-blue-600">{viewing.registration_code}</p></div>
              <div><span className="text-gray-500">Nhân viên thu:</span><p className="font-medium">{viewing.employee_name || user?.name || '-'}</p></div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Số tiền thu</p>
              <p className="text-3xl font-bold text-green-700">{formatMoney(viewing.amount)} <span className="text-lg">VNĐ</span></p>
              <p className="text-sm text-gray-400 mt-1">Bằng chữ: {numberToWords(viewing.amount)} đồng</p>
            </div>

            <div className="text-center text-xs text-gray-400 pt-2 border-t">
              <p>Trung tâm Anh ngữ - Hệ thống quản lý đăng ký khóa học</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function numberToWords(n) {
  if (!n || n === 0) return 'không'
  const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
  const tens = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi']
  const thousands = ['', 'nghìn', 'triệu', 'tỷ']
  n = Math.floor(n)
  if (n === 0) return 'không'
  const groups = []
  while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000) }
  const readGroup = (g) => {
    const h = Math.floor(g / 100), t = Math.floor((g % 100) / 10), u = g % 10
    let s = ''
    if (h > 0) s += units[h] + ' trăm '
    if (t === 0 && h > 0 && u > 0) s += 'lẻ '
    if (t > 0) s += tens[t] + ' '
    if (u > 0) s += (u === 5 && t > 0 ? 'lăm' : units[u])
    return s.trim()
  }
  return groups.map((g, i) => g === 0 ? '' : readGroup(g) + (thousands[i] ? ' ' + thousands[i] : '')).reverse().join(' ').trim()
}
