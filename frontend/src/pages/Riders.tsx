import { useEffect, useState } from 'react'
import api from '../lib/api'
import type { Rider, PaginatedResponse, Zone } from '../types'
import { Bike, Plus } from 'lucide-react'

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Riders</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          New Rider
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl p-6 border border-gray-200 space-y-4">
          <h3 className="font-semibold">Add New Rider</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">User ID</label>
              <input name="user" type="number" required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Capacity</label>
              <input name="capacity" type="number" min="1" defaultValue="10" required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zone</label>
              <select name="zone" className="w-full px-3 py-2 border rounded-lg">
                <option value="">No Zone</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vehicle Type</label>
              <select name="vehicle_type" className="w-full px-3 py-2 border rounded-lg">
                <option value="bike">Bike</option>
                <option value="scooter">Scooter</option>
                <option value="car">Car</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
                <option value="on_foot">On Foot</option>
              </select>
            </div>
          </div>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
            Create Rider
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {riders.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Bike className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            No riders found
          </div>
        ) : (
          riders.map((rider) => (
            <div key={rider.id} className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <Bike className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{rider.user_name || rider.username}</h3>
                  <p className="text-sm text-gray-500">{rider.zone_name || 'No Zone'}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Capacity</span>
                  <span className="font-medium">{rider.current_load}/{rider.capacity}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${(rider.current_load / rider.capacity) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Remaining</span>
                  <span className="font-medium">{rider.remaining_capacity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Vehicle</span>
                  <span className="font-medium capitalize">{rider.vehicle_type.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Available</span>
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