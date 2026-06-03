import { useState, useEffect } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, Users, BookOpen, FileText, TrendingUp, Clock } from 'lucide-react'

const statusColors = {
  success: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700'
}
const statusLabels = { success: 'Thành công', pending: 'Đang chờ', cancelled: 'Đã hủy' }

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [revenue, setRevenue] = useState([])
  const [recentRegs, setRecentRegs] = useState([])
  const [period, setPeriod] = useState('month')
  const [year, setYear] = useState(new Date().getFullYear().toString())

  useEffect(() => {
    axios.get('/api/dashboard/summary').then(r => setSummary(r.data))
    axios.get('/api/dashboard/recent-registrations', { params: { limit: 10 } }).then(r => setRecentRegs(r.data))
  }, [])

  useEffect(() => {
    axios.get('/api/dashboard/revenue', { params: { period, year } }).then(r => setRevenue(r.data))
  }, [period, year])

  const formatMoney = (v) => {
    if (v >= 1e9) return (v / 1e9).toFixed(1) + ' tỷ'
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'tr'
    if (v >= 1e3) return (v / 1e3).toFixed(0) + 'k'
    return v
  }

  const cards = [
    { label: 'Doanh thu hôm nay', value: summary?.todayRevenue || 0, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', format: true },
    { label: 'Tổng doanh thu', value: summary?.totalRevenue || 0, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', format: true },
    { label: 'Học viên', value: summary?.totalStudents || 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', format: false },
    { label: 'Khóa học', value: summary?.totalCourses || 0, icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-50', format: false },
    { label: 'Lớp đang hoạt động', value: summary?.totalClasses || 0, icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50', format: false },
    { label: 'Đăng ký chờ xử lý', value: summary?.pendingRegs || 0, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', format: false },
  ]

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${c.bg} rounded-lg flex items-center justify-center`}>
                <c.icon size={20} className={c.color} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{c.format ? formatMoney(c.value) : c.value}</p>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Biểu đồ doanh thu</h3>
          <div className="flex items-center gap-2">
            <select value={period} onChange={e => setPeriod(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="day">Theo ngày</option>
              <option value="month">Theo tháng</option>
              <option value="quarter">Theo quý</option>
              <option value="year">Theo năm</option>
            </select>
            <input type="number" value={year} onChange={e => setYear(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="h-80">
          {revenue.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">Chưa có dữ liệu doanh thu</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={formatMoney} />
                <Tooltip formatter={(value) => [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value), 'Doanh thu']} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent registrations table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Đăng ký gần đây</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Mã phiếu</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Học viên</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Khóa học</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Lớp học</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Ngày ĐK</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentRegs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Chưa có phiếu đăng ký nào</td></tr>
              ) : recentRegs.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">{r.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.student_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{r.course_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{r.class_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{r.registration_date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[r.status]}`}>
                      {statusLabels[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
