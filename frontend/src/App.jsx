import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, getSession, setSession } from './api'
import AdminPanel from './components/AdminPanel'
import Filters from './components/Filters'
import Header from './components/Header'
import LoginDialog from './components/LoginDialog'
import MeasurementsChart from './components/MeasurementsChart'
import MeasurementsTable from './components/MeasurementsTable'
import PasswordDialog from './components/PasswordDialog'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000


function toLocalInput(date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function toIso(localValue) {
  const date = new Date(localValue)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export default function App() {
  // ---------- Sesja administratora ----------
  const [currentSession, setCurrentSession] = useState(getSession)
  const [openDialog, setOpenDialog] = useState(null) 
  const [notice, setNotice] = useState('')

  const updateSession = useCallback((newSession) => {
    setSession(newSession)
    setCurrentSession(newSession)
  }, [])

  // api.js zgłasza zdarzenie gdy serwer odrzuci token np. wygasł po godzinie
  useEffect(() => {
    function handleExpired() {
      setCurrentSession(null)
      setNotice('Sesja wygasła. Zaloguj się ponownie.')
    }
    window.addEventListener('auth-expired', handleExpired)
    return () => window.removeEventListener('auth-expired', handleExpired)
  }, [])

  function handleLoggedIn(newSession) {
    updateSession(newSession)
    setOpenDialog(null)
    setNotice(`Zalogowano jako ${newSession.username}.`)
  }

  async function handleLogout() {
    try {
      await api('/api/auth/logout', { method: 'POST', auth: true })
    } catch {
      // Nawet jeśli serwer nie odpowie wylogowanie lokalne
    }
    updateSession(null)
    setNotice('Wylogowano.')
  }

  function handlePasswordChanged() {
    setOpenDialog(null)
    setNotice('Hasło zostało zmienione.')
  }

  // Komunikat o powodzeniu znika sam po 6 sekundach 
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  // ---------- Serie i filtry ----------
  const [series, setSeries] = useState([])
  const [seriesLoading, setSeriesLoading] = useState(true)
  const [seriesError, setSeriesError] = useState(null)

  const [selectedIds, setSelectedIds] = useState([])
  const [range, setRange] = useState(() => {
    const now = new Date()
    return { from: toLocalInput(new Date(now.getTime() - WEEK_MS)), to: toLocalInput(now) }
  })

  const [measurements, setMeasurements] = useState([])
  const [measurementsLoading, setMeasurementsLoading] = useState(false)
  const [measurementsError, setMeasurementsError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)


// Serie na starcie i po każdej zmianie w panelu administratora
// Nowe serie są od razu zaznaczone a usunięte znikają z zaznaczenia
  const knownSeriesIds = useRef(new Set())
  const loadSeries = useCallback(async () => {
    const data = await api('/api/series')
    const known = knownSeriesIds.current
    knownSeriesIds.current = new Set(data.map((s) => s.id))
    setSeries(data)
    setSelectedIds((selected) => [
      ...selected.filter((id) => knownSeriesIds.current.has(id)),
      ...data.filter((s) => !known.has(s.id)).map((s) => s.id),
    ])
  }, [])

  useEffect(() => {
    loadSeries()
      .catch((err) => setSeriesError(err.message))
      .finally(() => setSeriesLoading(false))
  }, [loadSeries])

  const seriesParam = [...selectedIds].sort((a, b) => a - b).join(',')

  // Wyniki – pobierane od nowa przy każdej zmianie filtrów (F5)
  useEffect(() => {
    if (!seriesParam) return
    const params = new URLSearchParams({ series: seriesParam, limit: '10000' })
    const from = toIso(range.from)
    const to = toIso(range.to)
    if (from) params.set('from', from)
    if (to) params.set('to', to)

    if (from && to && from > to) {
      setMeasurements([])
      setMeasurementsLoading(false)
      setMeasurementsError('Data „Od” musi być wcześniejsza niż data „Do”.')
      return
    }

    let cancelled = false // odpowiedź na stary filtr nie nadpisze nowszej
    setMeasurementsLoading(true)
    setMeasurementsError(null)
    api(`/api/measurements?${params}`)
      .then((data) => {
        if (!cancelled) setMeasurements(data)
      })
      .catch((err) => {
        if (!cancelled) setMeasurementsError(err.message)
      })
      .finally(() => {
        if (!cancelled) setMeasurementsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [seriesParam, range.from, range.to])

  const seriesById = useMemo(() => Object.fromEntries(series.map((s) => [s.id, s])), [series])
  const visibleSeries = series.filter((s) => selectedIds.includes(s.id))
  const visibleMeasurements = measurements.filter((m) => selectedIds.includes(m.seriesId))
  const hasData = visibleMeasurements.length > 0

  let emptyMessage = 'Brak wyników w wybranym zakresie czasu.'
  if (selectedIds.length === 0) emptyMessage = 'Zaznacz co najmniej jedną serię.'

  return (
    <>
      <a className="skip-link" href="#main">Przejdź do treści</a>
      <Header
        username={currentSession?.username}
        onLoginClick={() => setOpenDialog('login')}
        onPasswordClick={() => setOpenDialog('password')}
        onLogout={handleLogout}
      />

      <div className="notice-area" role="status" aria-live="polite">
        {notice && (
          <p className="notice">
            {notice}
            <button type="button" className="icon-button" onClick={() => setNotice('')} aria-label="Zamknij komunikat">
              ×
            </button>
          </p>
        )}
      </div>

      <main id="main" className="layout">
        <aside className="panel filters-area" aria-labelledby="filters-title">
          <h2 id="filters-title">Filtry</h2>
          {seriesLoading && <p>Wczytywanie serii…</p>}
          {seriesError && <p role="alert" className="error">Nie udało się pobrać serii: {seriesError}</p>}
          <Filters
            series={series}
            selectedIds={selectedIds}
            onSelectedChange={setSelectedIds}
            range={range}
            onRangeChange={setRange}
          />
        </aside>

        <section className="panel chart-area" aria-labelledby="chart-title">
          <h2 id="chart-title">Wykres</h2>
          {measurementsError && (
            <p role="alert" className="error">Nie udało się pobrać wyników: {measurementsError}</p>
          )}
          {hasData ? (
            <MeasurementsChart
              series={visibleSeries}
              measurements={visibleMeasurements}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : (
            !measurementsLoading && <div className="placeholder">{emptyMessage}</div>
          )}
        </section>

        <section className="panel table-area" aria-labelledby="table-title">
          <h2 id="table-title">Wyniki pomiarów</h2>
          <p className="status muted" aria-live="polite">
            {measurementsLoading ? 'Wczytywanie wyników…' : `Liczba wyników: ${visibleMeasurements.length}`}
          </p>
          {hasData && (
            <MeasurementsTable
              measurements={visibleMeasurements}
              seriesById={seriesById}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </section>
        {currentSession && (
          <section className="panel admin-area" aria-labelledby="admin-title">
            <h2 id="admin-title">Panel administratora</h2>
            <AdminPanel series={series} onSeriesChanged={loadSeries} onNotice={setNotice} />
          </section>
        )}
      </main>

      <LoginDialog
        open={openDialog === 'login'}
        onClose={() => setOpenDialog(null)}
        onLoggedIn={handleLoggedIn}
      />
      <PasswordDialog
        open={openDialog === 'password'}
        onClose={() => setOpenDialog(null)}
        onChanged={handlePasswordChanged}
      />
    </>
  )
}