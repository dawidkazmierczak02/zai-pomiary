import { useState } from 'react'
import { api } from '../api'
import { formatValue } from '../format'
import SeriesForm from './SeriesForm'
import SeriesMarker from './SeriesMarker'

export default function SeriesManager({ series, onChanged, onNotice }) {
  const [editing, setEditing] = useState(null) 
  const [error, setError] = useState(null)

  async function handleSaved(message) {
    setEditing(null)
    await onChanged()
    onNotice(message)
  }

  async function handleDelete(s) {
    const confirmed = window.confirm(
      `Usunąć serię „${s.name}”? Zostaną usunięte także wszystkie jej wyniki i czujniki.`,
    )
    if (!confirmed) return
    setError(null)
    try {
      await api(`/api/series/${s.id}`, { method: 'DELETE', auth: true })
      await onChanged()
      onNotice(`Usunięto serię „${s.name}”.`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <h3>Serie pomiarowe</h3>
        <button type="button" className="button" onClick={() => setEditing('new')}>Dodaj serię</button>
      </div>
      {error && <p role="alert" className="error">{error}</p>}

      {series.length === 0 ? (
        <p className="muted">Nie ma jeszcze żadnej serii.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table plain">
            <thead>
              <tr>
                <th scope="col">Seria</th>
                <th scope="col" className="num">Przedział</th>
                <th scope="col">Jednostka</th>
                <th scope="col">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="series-cell">
                      <SeriesMarker color={s.color} icon={s.icon} />
                      {s.name}
                    </span>
                  </td>
                  <td className="num">{formatValue(s.minValue)} – {formatValue(s.maxValue)}</td>
                  <td>{s.unit || '–'}</td>
                  <td className="actions">
                    <button type="button" className="button secondary small" onClick={() => setEditing(s)} aria-label={`Edytuj serię ${s.name}`}>
                      Edytuj
                    </button>
                    <button type="button" className="button danger small" onClick={() => handleDelete(s)} aria-label={`Usuń serię ${s.name}`}>
                      Usuń
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <SeriesForm
          series={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}