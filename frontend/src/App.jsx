import { useEffect, useState } from 'react'
import { api } from './api'
import Filters from './components/Filters'
import Header from './components/Header'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Data format pola 
function toLocalInput(date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

export default function App() {
  const [series, setSeries] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [range, setRange] = useState(() => {
    const now = new Date()
    return { from: toLocalInput(new Date(now.getTime() - WEEK_MS)), to: toLocalInput(now) }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  
  useEffect(() => {
    api('/api/series')
      .then((data) => {
        setSeries(data)
        setSelectedIds(data.map((s) => s.id))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <a className="skip-link" href="#main">Przejdź do treści</a>
      <Header />

      <main id="main" className="layout">
        <aside className="panel filters-area" aria-labelledby="filters-title">
          <h2 id="filters-title">Filtry</h2>
          {loading && <p>Wczytywanie serii…</p>}
          {error && <p role="alert">Nie udało się pobrać serii: {error}</p>}
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
          <div className="placeholder">Tu pojawi się wykres wybranych serii.</div>
        </section>

        <section className="panel table-area" aria-labelledby="table-title">
          <h2 id="table-title">Wyniki pomiarów</h2>
          <div className="placeholder">Tu pojawi się tabela wyników.</div>
        </section>
      </main>
    </>
  )
}