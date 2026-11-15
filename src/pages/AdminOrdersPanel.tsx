import { useEffect, useState } from 'react'
import { API_URL } from '../lib/api'

export type DeliveryWorker = { id: string; name: string }

type OrderRow = {
  id: string
  artworkTitle: string
  quantity: number
  total: number | string
  status: string
  createdAt: string
  buyerName?: string
  artistName?: string
  shippingAddress?: string
  deliveryAssignmentId?: string | null
  deliveryStatus?: string | null
  deliveryManName?: string | null
}

type SalesSummary = {
  salesTotal: number
  paidOrderCount: number
  unitsSold: number
  artworkCount: number
  userCount: number
}

const ORDER_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

const formatMoney = (value: number | string) =>
  `GH\u20B5 ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>
}

function AdminOrdersPanel({ workers }: { workers: DeliveryWorker[] }) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState('')
  const [workerByOrder, setWorkerByOrder] = useState<Record<string, string>>({})

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const [ordersResponse, summaryResponse] = await Promise.all([
          fetch(`${API_URL}/workspace/orders`, { credentials: 'include' }),
          fetch(`${API_URL}/workspace/sales-summary`, { credentials: 'include' }),
        ])
        const ordersData = await readJson(ordersResponse)
        const summaryData = await readJson(summaryResponse)

        if (!ordersResponse.ok) {
          throw new Error(String(ordersData.message || 'Unable to load orders.'))
        }
        if (cancelled) return

        setOrders(Array.isArray(ordersData.orders) ? (ordersData.orders as OrderRow[]) : [])
        setSummary(summaryResponse.ok ? (summaryData as unknown as SalesSummary) : null)
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Unable to load orders.')
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

  async function changeStatus(orderId: string, status: string) {
    setBusyId(orderId)
    try {
      const response = await fetch(
        `${API_URL}/workspace/orders/${encodeURIComponent(orderId)}/status`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      )
      const data = await readJson(response)
      if (!response.ok) throw new Error(String(data.message || 'Unable to update the order.'))
      setMessage(`Order status changed to ${status}.`)
      reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update the order.')
    } finally {
      setBusyId('')
    }
  }

  async function assignDelivery(orderId: string) {
    const deliveryManId = workerByOrder[orderId]
    if (!deliveryManId) {
      setMessage('Choose a delivery worker first.')
      return
    }

    setBusyId(orderId)
    try {
      const response = await fetch(`${API_URL}/deliveries/from-order`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, deliveryManId }),
      })
      const data = await readJson(response)
      if (!response.ok) throw new Error(String(data.message || 'Unable to assign the delivery.'))
      setMessage(String(data.message || 'Delivery assigned.'))
      reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to assign the delivery.')
    } finally {
      setBusyId('')
    }
  }

  const pendingCount = orders.filter((order) => order.status === 'PENDING').length

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <h3>Orders & sales</h3>
          <p>
            Review buyer orders, confirm payment, and assign paid orders to a delivery worker.
            Only paid orders count as sales.
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

      <div className="admin-report-summary">
        <div className="admin-report-summary-card">
          <span>Confirmed sales</span>
          <strong>{formatMoney(summary?.salesTotal ?? 0)}</strong>
          <small>Paid, processing, shipped and delivered</small>
        </div>
        <div className="admin-report-summary-card">
          <span>Paid orders</span>
          <strong>{summary?.paidOrderCount ?? 0}</strong>
          <small>{summary?.unitsSold ?? 0} unit(s) sold</small>
        </div>
        <div className="admin-report-summary-card">
          <span>Awaiting payment</span>
          <strong>{pendingCount}</strong>
          <small>Orders marked PENDING</small>
        </div>
        <div className="admin-report-summary-card">
          <span>All orders</span>
          <strong>{orders.length}</strong>
          <small>Across all buyers</small>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="admin-empty-state">
          <strong>{loading ? 'Loading orders...' : 'No orders yet'}</strong>
          <p>Orders placed by buyers will appear here.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Artwork</th>
                <th>Buyer</th>
                <th>Artist</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Delivery</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const canAssign =
                  !order.deliveryAssignmentId &&
                  (order.status === 'PAID' || order.status === 'PROCESSING')
                return (
                  <tr key={order.id}>
                    <td title={order.id}>{order.id.slice(0, 8)}</td>
                    <td>
                      {order.artworkTitle}
                      {order.quantity > 1 ? ` x${order.quantity}` : ''}
                    </td>
                    <td>{order.buyerName ?? '-'}</td>
                    <td>{order.artistName ?? '-'}</td>
                    <td>{order.createdAt ? order.createdAt.slice(0, 10) : '-'}</td>
                    <td>{formatMoney(order.total)}</td>
                    <td>
                      <select
                        value={order.status}
                        disabled={busyId === order.id}
                        onChange={(event) => void changeStatus(order.id, event.target.value)}
                        aria-label={`Status for order ${order.id}`}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {order.deliveryAssignmentId ? (
                        <>
                          <span
                            className={`admin-badge ${order.deliveryStatus === 'Delivered' ? 'good' : 'pending'}`}
                          >
                            {order.deliveryStatus ?? 'Assigned'}
                          </span>
                          <div>
                            <small>{order.deliveryManName ?? ''}</small>
                          </div>
                        </>
                      ) : canAssign ? (
                        <div className="admin-row-actions">
                          <select
                            value={workerByOrder[order.id] ?? ''}
                            onChange={(event) =>
                              setWorkerByOrder((current) => ({
                                ...current,
                                [order.id]: event.target.value,
                              }))
                            }
                            aria-label={`Delivery worker for order ${order.id}`}
                          >
                            <option value="">Choose worker</option>
                            {workers.map((worker) => (
                              <option key={worker.id} value={worker.id}>{worker.name}</option>
                            ))}
                          </select>
                          <button
                            className="admin-primary-button"
                            disabled={busyId === order.id}
                            onClick={() => void assignDelivery(order.id)}
                          >
                            Assign
                          </button>
                        </div>
                      ) : (
                        <small>
                          {order.status === 'PENDING'
                            ? 'Mark as PAID first'
                            : order.status === 'CANCELLED'
                              ? 'Cancelled'
                              : '-'}
                        </small>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default AdminOrdersPanel
