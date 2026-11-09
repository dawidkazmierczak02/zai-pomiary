import { useCallback, useEffect, useId, useState } from 'react'
import { api, fieldErrors } from '../api'
import { formatDateTime } from '../format'

export default function SensorsManager({ series, onNotice }) {
  const id = useId()
  const [sensors, setSensors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [name, setName] = useState('')
  const [seriesId, setSeriesId] = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const [newKey, setNewKey] = useState(null) //  name apiKey  – pokazywany tylko raz
  const [copied, setCopied] = useState(false)

  const seriesById = Object.fromEntries(series.map((s) => [s.id, s]))

  const load = useCallback(async () => {
    setError(null)
    try {
      setSensors(await api('/api/sensors', { auth: true }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Lista czujników na start i po każdej zmianie serii usunięcie serii usuwa jej czujniki
  useEffect(() => {
    load()
  }, [load, series])

  async function handleRegister(event) {
    event.preventDefault()
    const errors = {}
    if (!name.trim()) errors.name = 'Podaj nazwę czujnika.'
    else if (name.trim().length > 100) errors.name = 'Nazwa może mieć najwyżej 100 znaków.'
    if (!seriesId) errors.seriesId = 'Wybierz serię.'
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setBusy(true)
    try {
      const created = await api('/api/sensors', {
        method: 'POST',
        auth: true,
        body: { name: name.trim(), seriesId: Number(seriesId) },
      })
      setNewKey({ name: created.name, apiKey: created.apiKey })
      setCopied(false)
      setName('')
      await load()
    } catch (err) {
      setFormErrors({ ...fieldErrors(err), form: err.message })
    } finally {
      setBusy(false)
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(newKey.apiKey)
      setCopied(true)
    } catch {
      setCopied(false) 
    }
  }

  async function handleUnregister(sensor) {
    const confirmed = window.confirm(
      `Wyrejestrować czujnik „${sensor.name}”? Jego klucz API od razu przestanie działać. Zebrane wyniki pozostaną.`,
    )
    if (!confirmed) return
    try {
      await api(`/api/sensors/${sensor.id}`, { method: 'DELETE', auth: true })
      onNotice(`Wyrejestrowano czujnik „${sensor.name}”.`)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-section">
      <h3>Rejestracja czujnika</h3>
      <form className="inline-form" onSubmit={handleRegister} noValidate>
        <div className="field">
          <label htmlFor={`${id}-name`}>Nazwa czujnika</label>
          <input
            id={`${id}-name`}
            value={name}
            placeholder="np. Czujnik temperatury T2"
            aria-invalid={formErrors.name ? 'true' : undefined}
            aria-describedby={formErrors.name ? `${id}-name-error` : undefined}
            onChange={(event) => setName(event.target.value)}
          />
          {formErrors.name && <span id={`${id}-name-error`} className="field-error">{formErrors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor={`${id}-series`}>Seria</label>
          <select
            id={`${id}-series`}
            value={seriesId}
            aria-invalid={formErrors.seriesId ? 'true' : undefined}
            aria-describedby={formErrors.seriesId ? `${id}-series-error` : undefined}
            onChange={(event) => setSeriesId(event.target.value)}
          >
            <option value="">– wybierz –</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {formErrors.seriesId && <span id={`${id}-series-error`} className="field-error">{formErrors.seriesId}</span>}
        </div>
        <button type="submit" className="button" disabled={busy}>
          {busy ? 'Rejestrowanie…' : 'Zarejestruj czujnik'}
        </button>
      </form>
      {formErrors.form && <p role="alert" className="error">{formErrors.form}</p>}

      {newKey && (
        <div className="key-box" role="status">
          <p>
            <strong>Klucz API czujnika „{newKey.name}”.</strong> Zapisz go teraz – serwer przechowuje
            tylko jego skrót i nie da się go wyświetlić ponownie.
          </p>
          <code className="api-key">{newKey.apiKey}</code>
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={copyKey}>
              {copied ? 'Skopiowano ✓' : 'Kopiuj klucz'}
            </button>
            <button type="button" className="button" onClick={() => setNewKey(null)}>
              Zapisałem klucz
            </button>
          </div>
        </div>
      )}

      <h3>Zarejestrowane czujniki</h3>
      {error && <p role="alert" className="error">{error}</p>}
      {loading ? (
        <p>Wczytywanie czujników…</p>
      ) : sensors.length === 0 ? (
        <p className="muted">Nie ma zarejestrowanych czujników.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table plain">
            <thead>
              <tr>
                <th scope="col">Czujnik</th>
                <th scope="col">Seria</th>
                <th scope="col">Zarejestrowany</th>
                <th scope="col">Ostatni wynik</th>
                <th scope="col">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((sensor) => (
                <tr key={sensor.id}>
                  <td>{sensor.name}</td>
                  <td>{seriesById[sensor.seriesId]?.name ?? `#${sensor.seriesId}`}</td>
                  <td>{formatDateTime(sensor.createdAt)}</td>
                  <td>{sensor.lastMeasurementAt ? formatDateTime(sensor.lastMeasurementAt) : 'brak'}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="button danger small"
                      onClick={() => handleUnregister(sensor)}
                      aria-label={`Wyrejestruj czujnik ${sensor.name}`}
                    >
                      Wyrejestruj
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}