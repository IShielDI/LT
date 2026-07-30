import { useEffect, useState } from 'react'
import api from '../lib/api'
import type { ParcelList, PaginatedResponse } from '../types'
import { Package, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  registered: '#94a3b8',
  sorted: '#60a5fa',
  assigned: '#3b82f6',
  in_transit: '#f59e0b',
  delivered: '#22c55e',
  failed: '#ef4444',
  reattempt_scheduled: '#a855f7',
}

export default function Dashboard() {
  const [parcels, setParcels] = useState<ParcelList[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get<PaginatedResponse<ParcelList>>('/parcels/parcels/?page_size=100')
        setParcels(data.results)
      } catch (err) {
        console.error('Failed to fetch dashboard data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const delivered = parcels.filter((p) => p.status === 'delivered').length
  const failed = parcels.filter((p) => p.status === 'failed').length
  const inTransit = parcels.filter((p) => p.status === 'in_transit').length
  const total = parcels.length

  const statusData = Object.entries(
    parcels.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  const zoneData = Object.entries(
    parcels.reduce((acc, p) => {
      const zone = p.zone_name || 'Unzoned'
      acc[zone] = (acc[zone] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([zone, count]) => ({ zone, count }))

  const stats = [
    { label: 'Total Parcels', value: total, icon: Package, color: 'bg-blue-500' },
    { label: 'Delivered Today', value: delivered, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Failed', value: failed, icon: XCircle, color: 'bg-red-500' },
    { label: 'In Transit', value: inTransit, icon: Clock, color: 'bg-amber-500' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Parcels by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Zone-wise Parcel Count</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={zoneData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="zone" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent parcels */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            Recent Parcels
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receiver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {parcels.slice(0, 10).map((parcel) => (
                <tr key={parcel.tracking_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">
                    {parcel.tracking_id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-sm">{parcel.receiver_name}</td>
                  <td className="px-6 py-4 text-sm">{parcel.zone_name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      parcel.priority === 'express'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {parcel.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-2 py-1 text-xs rounded-full text-white"
                      style={{ backgroundColor: STATUS_COLORS[parcel.status] || '#94a3b8' }}
                    >
                      {parcel.status.replace(/_/g, ' ')}
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