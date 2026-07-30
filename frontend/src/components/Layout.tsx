import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import {
  LayoutDashboard, Package, Bike, Send, Truck, FileText,
  Search, LogOut, Menu, X,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'hub_manager', 'rider'] },
  { to: '/parcels', label: 'Parcels', icon: Package, roles: ['admin', 'hub_manager', 'rider'] },
  { to: '/riders', label: 'Riders', icon: Bike, roles: ['admin', 'hub_manager'] },
  { to: '/dispatch', label: 'Dispatch', icon: Send, roles: ['admin', 'hub_manager'] },
  { to: '/delivery', label: 'Delivery', icon: Truck, roles: ['admin', 'hub_manager', 'rider'] },
  { to: '/reports', label: 'Reports', icon: FileText, roles: ['admin', 'hub_manager'] },
  { to: '/track', label: 'Track', icon: Search, roles: ['admin', 'hub_manager', 'rider'] },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  )

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:translate-x-0 z-30 w-64 bg-white border-r border-gray-200 min-h-screen transition-transform`}
      >
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary-600">DeliveryHub</h1>
          <p className="text-xs text-gray-500 mt-1">Operations Platform</p>
        </div>
        <nav className="p-4 space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-700 font-semibold text-sm">
                {user?.first_name?.[0] || user?.username?.[0] || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h2 className="text-lg font-semibold text-gray-800 hidden lg:block">
            Delivery Hub Management
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="capitalize">{user?.role?.replace('_', ' ')}</span>
          </div>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}