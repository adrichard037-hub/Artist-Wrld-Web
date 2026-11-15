import { useEffect, useState } from 'react'
import { API_URL } from '../lib/api'

type AssignmentRow = {
  id: string
  orderReference?: string | null
  artworkTitle: string
  customerName: string
  pickup: string
  destination: string
  scheduledDate?: string | null
  status: string
  deliveryManName?: string | null
}

const DELIVERY_STATUSES = ['Assigned', 'Picked Up', 'In Transit', 'Delivered']

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>
}

function AdminDeliveriesPanel() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState('')

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const response = await fetch(`${API_URL}/deliveries`, { credentials: 'include' })
        const data = await readJson(response)
        if (!response.ok) throw new Error(String(data.message || 'Unable to load deliveries.'))
        if (cancelled) return
        setAssignments(Array.isArray(data.assignments) ? (data.assignments as AssignmentRow[]) : [])
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Unable to load deliveries.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  function reload() {
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  async function changeStatus(id: string, status: string) {
    setBusyId(id)
    try {
      const response = await fetch(`${API_URL}/deliveries/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await readJson(response)
      if (!response.ok) throw new Error(String(data.message || 'Unable to update the delivery.'))
      setMessage(`Delivery status changed to ${status}.`)
      reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update the delivery.')
    } finally {
      setBusyId('')
    }
  }

  const activeCount = assignments.filter((item) => item.status !== 'Delivered').length

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <h3>Delivery management</h3>
          <p>
            {activeCount} active delivery(ies). Assign paid orders to a delivery worker from
            Orders & Sales.
          </p>
        </div>
        <button
          className="admin-secondary-button"
          onClick={reload}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {message && (
        <div className="admin-notice" role="status">
          <span>{message}</span>
          <button onClick={() => setMessage('')} aria-label="Dismiss message">x</button>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="admin-empty-state">
          <strong>{loading ? 'Loading deliveries...' : 'No delivery records yet'}</strong>
          <p>Deliveries appear here after you assign a paid order to a delivery worker.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Artwork</th>
                <th>Customer</th>
                <th>Courier</th>
                <th>Pickup</th>
                <th>Destination</th>
                <th>Scheduled</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((item) => (
                <tr key={item.id}>
                  <td title={item.orderReference ?? ''}>
                    {item.orderReference ? item.orderReference.slice(0, 8) : '-'}
                  </td>
                  <td>{item.artworkTitle}</td>
                  <td>{item.customerName}</td>
                  <td>{item.deliveryManName ?? '-'}</td>
                  <td>{item.pickup}</td>
                  <td>{item.destination}</td>
                  <td>{item.scheduledDate ? item.scheduledDate.slice(0, 10) : 'Not scheduled'}</td>
                  <td>
                    <select
                      value={item.status}
                      disabled={busyId === item.id}
                      onChange={(event) => void changeStatus(item.id, event.target.value)}
                      aria-label={`Status for delivery ${item.id}`}
                    >
                      {DELIVERY_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default AdminDeliveriesPanel
