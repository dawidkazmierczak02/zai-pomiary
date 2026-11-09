import { useCallback, useEffect, useId, useState } from 'react'
import { api } from '../api'
import { formatDateTime, formatValue } from '../format'

export default function RejectedLog({ series }) {
  const id = useId()
  const [entries, setEntries] = useState([])
  const [seriesFilter, setSeriesFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const seriesById = Object.fromEntries(series.map((s) => [s.id, s]))

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ limit: '100' })
    if (seriesFilter) params.set('series', seriesFilter)
    try {
      setEntries(await api(`/api/rejected-measurements?${params}`, { auth: true }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [seriesFilter])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="admin-section">
      <div className="section-header">
        <h3>Odrzucone wyniki (100 najnowszych)</h3>
        <button type="button" className="button secondary" onClick={load}>Odśwież</button>
      </div>
      <div className="field filter-field">
        <label htmlFor={`${id}-series`}>Seria</label>
        <select id={`${id}-series`} value={seriesFilter} onChange={(event) => setSeriesFilter(event.target.value)}>
          <option value="">Wszystkie serie</option>
          {series.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {error && <p role="alert" className="error">{error}</p>}
      {loading ? (
        <p>Wczytywanie logu…</p>
      ) : entries.length === 0 ? (
        <p className="muted">Brak odrzuconych wyników.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table plain">
            <thead>
              <tr>
                <th scope="col">Odrzucono</th>
                <th scope="col">Seria</th>
                <th scope="col">Czujnik</th>
                <th scope="col" className="num">Wartość</th>
                <th scope="col">Czas pomiaru</th>
                <th scope="col">Powód</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.createdAt)}</td>
                  <td>{seriesById[entry.seriesId]?.name ?? '–'}</td>
                  <td>{entry.sensorName ?? '–'}</td>
                  <td className="num">{entry.value != null ? formatValue(entry.value) : '–'}</td>
                  <td>{entry.timestamp ? formatDateTime(entry.timestamp) : '–'}</td>
                  <td className="reason">{entry.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}