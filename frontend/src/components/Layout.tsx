import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import {
  LayoutDashboard, Package, Bike, Send, Scan, Truck, FileText,
  Search, LogOut, Menu, X, Bell, ChevronRight, Warehouse, CalendarDays,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'hub_manager', 'rider'] },
  { to: '/parcels', label: 'Parcels', icon: Package, roles: ['admin', 'hub_manager', 'rider'] },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, roles: ['admin', 'hub_manager', 'rider'] },
  { to: '/riders', label: 'Riders', icon: Bike, roles: ['admin', 'hub_manager'] },
  { to: '/dispatch', label: 'Dispatch', icon: Send, roles: ['admin', 'hub_manager'] },
  { to: '/scan', label: 'Scan Parcel', icon: Scan, roles: ['admin', 'hub_manager', 'rider'] },
  { to: '/delivery', label: 'Delivery Updates', icon: Truck, roles: ['admin', 'hub_manager', 'rider'] },
  { to: '/reports', label: 'Reports', icon: FileText, roles: ['admin', 'hub_manager'] },
  { to: '/track', label: 'Tracking', icon: Search, roles: ['admin', 'hub_manager', 'rider'] },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-white/10 bg-zinc-950 text-white shadow-2xl shadow-black/40 transition-transform duration-300 lg:translate-x-0`}
      >
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-300 shadow-lg shadow-yellow-500/20">
              <Warehouse className="h-6 w-6 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Delivery Hub</h1>
              <p className="text-xs text-zinc-500">Logistics Command Center</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-yellow-500 text-zinc-950 shadow-lg shadow-yellow-900/20'
                    : 'text-zinc-300 hover:bg-yellow-400/10 hover:text-white'
                }`
              }
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                {item.label}
              </span>
              <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-70" />
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <button
            onClick={() => navigate('/profile')}
            className="mb-3 w-full rounded-2xl bg-zinc-900/70 p-3 ring-1 ring-white/10 text-left transition-all hover:bg-zinc-800/70 hover:ring-yellow-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500 text-zinc-950 ring-2 ring-yellow-500/20">
                <span className="text-sm font-bold">
                  {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs capitalize text-zinc-500">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-200 transition-all hover:bg-red-500/10 hover:text-red-100"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-zinc-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/85 px-4 py-3 shadow-sm shadow-black/30 backdrop-blur-xl lg:px-8">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 lg:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden lg:block">
            <h2 className="text-sm font-semibold text-zinc-50">Delivery Hub Management</h2>
            <p className="text-xs text-zinc-400">Monitor parcels, riders, dispatch and delivery operations.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 shadow-sm hover:border-yellow-500/40 hover:bg-yellow-400/10 hover:text-yellow-300"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-yellow-500 ring-2 ring-zinc-900" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg z-50">
                  <div className="p-4 border-b border-zinc-800">
                    <h3 className="font-semibold text-zinc-50">Notifications</h3>
                  </div>
                  <div className="p-4 text-sm text-zinc-400">
                    <p className="mb-2">• Parcel #PKG-1234 assigned to rider John</p>
                    <p className="mb-2">• Delivery completed for PKG-1233</p>
                    <p>• 3 parcels pending assignment</p>
                  </div>
                </div>
              )}
            </div>
            <div className="hidden items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 shadow-sm sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold capitalize text-zinc-400">{user?.role?.replace('_', ' ')}</span>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}