import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, BookOpen, Users, GraduationCap, UserCog,
  FileText, Receipt, LogOut, Menu, X, Building
} from 'lucide-react'
import { useState } from 'react'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isAdmin = user?.role === 'admin'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Tổng quan' },
    { to: '/courses', icon: BookOpen, label: 'Khóa học' },
    { to: '/classes', icon: Building, label: 'Lớp học' },
    { to: '/students', icon: GraduationCap, label: 'Học viên' },
    ...(isAdmin ? [{ to: '/employees', icon: UserCog, label: 'Nhân viên' }] : []),
    { to: '/registrations', icon: FileText, label: 'Phiếu đăng ký' },
    { to: '/payments', icon: Receipt, label: 'Phiếu thu' },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-800 flex flex-col transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">Trung tâm Anh ngữ</h1>
              <p className="text-slate-400 text-xs">Hệ thống quản lý</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map(link => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <link.icon size={20} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-slate-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs">{user?.role === 'admin' ? 'Admin' : 'Nhân viên'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600 hover:text-gray-800">
            <Menu size={24} />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800">
              {links.find(l => l.to === window.location.pathname || (l.to === '/' && window.location.pathname === '/'))?.label || 'Tổng quan'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Users size={16} className="text-blue-600" />
            </div>
            <span className="text-sm text-gray-600 hidden sm:inline">{user?.name}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
