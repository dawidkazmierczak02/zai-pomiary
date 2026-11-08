import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import Filters from './components/Filters'
import Header from './components/Header'
import MeasurementsChart from './components/MeasurementsChart'
import MeasurementsTable from './components/MeasurementsTable'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Data format pola 
function toLocalInput(date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}


function toIso(localValue) {
  const date = new Date(localValue)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export default function App() {
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

  // Serie  raz, po pierwszym wyświetleniu domyślnie wszystkie są widoczne
  useEffect(() => {
    api('/api/series')
      .then((data) => {
        setSeries(data)
        setSelectedIds(data.map((s) => s.id))
      })
      .catch((err) => setSeriesError(err.message))
      .finally(() => setSeriesLoading(false))
  }, [])

  // Identyfikatory zaznaczonych serii w stałej kolejności
  const seriesParam = [...selectedIds].sort((a, b) => a - b).join(',')

  // Wyniki pobierane od nowa przy każdej zmianie filtrów (F5)
  useEffect(() => {
    if (!seriesParam) return
    const params = new URLSearchParams({ series: seriesParam, limit: '10000' })
    const from = toIso(range.from)
    const to = toIso(range.to)
    if (from) params.set('from', from)
    if (to) params.set('to', to)

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
      <Header />

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
      </main>
    </>
  )
}