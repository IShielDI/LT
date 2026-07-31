import { useEffect, useState } from 'react'
import api from '../lib/api'
import type { Rider, PaginatedResponse, Zone } from '../types'
import { Bike, Plus } from 'lucide-react'
import { CardSkeleton, EmptyState, PageHeader, buttonPrimary, cardClass, inputClass } from '../components/ui'

export default function Riders() {
  const [riders, setRiders] = useState<Rider[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [riderRes, zoneRes] = await Promise.all([
        api.get<PaginatedResponse<Rider>>('/riders/?page_size=100'),
        api.get<Zone[]>('/parcels/zones/'),
      ])
      setRiders(riderRes.data.results)
      setZones(zoneRes.data)
    } catch (err) {
      console.error('Failed to fetch', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData)
    try {
      await api.post('/riders/', data)
      setShowForm(false)
      fetchData()
    } catch (err) {
      console.error('Failed to create rider', err)
    }
  }

  if (loading) {
    return <CardSkeleton count={6} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riders"
        description="Manage rider capacity, vehicle types, availability and zone coverage."
        actions={
        <button
          onClick={() => setShowForm(!showForm)}
          className={buttonPrimary}
        >
          <Plus className="w-4 h-4" />
          New Rider
        </button>
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className={`${cardClass} space-y-5 p-6`}>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Add New Rider</h3>
            <p className="mt-1 text-sm text-slate-500">Assign a user profile, capacity, zone and vehicle type.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">User ID</label>
              <input name="user" type="number" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Capacity</label>
              <input name="capacity" type="number" min="1" defaultValue="10" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Zone</label>
              <select name="zone" className={inputClass}>
                <option value="">No Zone</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Vehicle Type</label>
              <select name="vehicle_type" className={inputClass}>
                <option value="bike">Bike</option>
                <option value="scooter">Scooter</option>
                <option value="car">Car</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
                <option value="on_foot">On Foot</option>
              </select>
            </div>
          </div>
          <button type="submit" className={buttonPrimary}>
            Create Rider
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {riders.length === 0 ? (
          <div className={`${cardClass} col-span-full`}>
            <EmptyState
              icon={Bike}
              title="No riders yet"
              description="Add your first rider to start assigning parcels and tracking delivery capacity."
              action={<button onClick={() => setShowForm(true)} className={buttonPrimary}><Plus className="h-4 w-4" /> Add rider</button>}
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