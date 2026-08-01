import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Parcels from './pages/Parcels'
import ParcelDetail from './pages/ParcelDetail'
import Riders from './pages/Riders'
import RiderDetail from './pages/RiderDetail'
import Dispatch from './pages/Dispatch'
import ScanParcel from './pages/ScanParcel'
import Delivery from './pages/Delivery'
import Reports from './pages/Reports'
import Tracking from './pages/Tracking'

export default function App() {
  const { fetchUser, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      fetchUser()
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/track" element={<Tracking />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/parcels"
          element={
            <ProtectedRoute>
              <Layout><Parcels /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/parcels/:trackingId"
          element={
            <ProtectedRoute>
              <Layout><ParcelDetail /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/riders"
          element={
            <ProtectedRoute roles={['admin', 'hub_manager']}>
              <Layout><Riders /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/riders/:riderId"
          element={
            <ProtectedRoute roles={['admin', 'hub_manager']}>
              <Layout><RiderDetail /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatch"
          element={
            <ProtectedRoute roles={['admin', 'hub_manager']}>
              <Layout><Dispatch /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute roles={['admin', 'hub_manager', 'rider']}>
              <Layout><ScanParcel /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/delivery"
          element={
            <ProtectedRoute>
              <Layout><Delivery /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={['admin', 'hub_manager']}>
              <Layout><Reports /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}