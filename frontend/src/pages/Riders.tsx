import { useEffect, useState } from 'react'
import api from '../lib/api'
import type { Rider, PaginatedResponse, Zone } from '../types'
import { Bike } from 'lucide-react'
import { CardSkeleton, EmptyState, PageHeader, cardClass } from '../components/ui'

export default function Riders() {
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: ridersData } = await api.get<PaginatedResponse<Rider>>('/riders/?page_size=100')
      setRiders(ridersData.results)
      await api.get<Zone[]>('/parcels/zones/')
    } catch (err) {
      console.error('Failed to fetch', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <CardSkeleton count={6} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riders"
        description="View rider capacity, vehicle types, availability and zone coverage. Riders are managed through the backend."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {riders.length === 0 ? (
          <div className={`${cardClass} col-span-full`}>
            <EmptyState
              icon={Bike}
              title="No riders yet"
              description="Riders are seeded from the backend. Contact an administrator to add riders."
            />
          </div>
        ) : (
          riders.map((rider) => (
            <div key={rider.id} className={`${cardClass} p-6 hover:-translate-y-1`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-700 to-teal-500 shadow-lg shadow-primary-900/20">
                  <Bike className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-950">{rider.user_name || rider.username}</h3>
                  <p className="text-sm text-slate-500">{rider.zone_name || 'No Zone'}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Capacity</span>
                  <span className="font-medium">{rider.current_load}/{rider.capacity}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-primary-700 to-teal-500 transition-all"
                    style={{ width: `${(rider.current_load / rider.capacity) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Remaining</span>
                  <span className="font-medium">{rider.remaining_capacity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vehicle</span>
                  <span className="font-medium capitalize">{rider.vehicle_type.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Available</span>
                  <span className={`font-medium ${rider.is_available ? 'text-green-600' : 'text-red-600'}`}>
                    {rider.is_available ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}