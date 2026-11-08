import { useEffect, useState } from 'react'
import { api } from './api'

export default function App() {
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Po pierwszym wyświetleniu strony pobieranie listę serii z API
  useEffect(() => {
    api('/api/series')
      .then(setSeries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main>
      <h1>Serie pomiarowe</h1>
      {loading && <p>Wczytywanie…</p>}
      {error && <p role="alert">Nie udało się pobrać serii: {error}</p>}
      <ul>
        {series.map((s) => (
          <li key={s.id}>
            {s.name}: zakres {s.minValue}–{s.maxValue} {s.unit}
          </li>
        ))}
      </ul>
    </main>
  )
}