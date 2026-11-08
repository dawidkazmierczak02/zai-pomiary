import { useEffect, useRef } from 'react'
import { formatDateTime, formatValue } from '../format'
import SeriesMarker from './SeriesMarker'

export default function MeasurementsTable({ measurements, seriesById, selectedId, onSelect }) {
  const selectedRowRef = useRef(null)

  // Wybór punktu na wykresie przewija tabelę do odpowiedniego wiersza
  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  // API zwraca wyniki rosnąco tabela pokazuje najnowsze na górze
  const rows = [...measurements].reverse()

  function toggle(id) {
    onSelect(id === selectedId ? null : id)
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <caption className="visually-hidden">
          Wyniki pomiarów wybranych serii od najnowszych. Wybierz wiersz, aby wyróżnić punkt na wykresie.
        </caption>
        <thead>
          <tr>
            <th scope="col">Czas pomiaru</th>
            <th scope="col">Seria</th>
            <th scope="col" className="num">Wartość</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const s = seriesById[m.seriesId]
            const isSelected = m.id === selectedId
            return (
              <tr
                key={m.id}
                ref={isSelected ? selectedRowRef : null}
                className={isSelected ? 'selected' : undefined}
                aria-current={isSelected ? 'true' : undefined}
                tabIndex={0}
                onClick={() => toggle(m.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggle(m.id)
                  }
                }}
              >
                <td>{formatDateTime(m.timestamp)}</td>
                <td>
                  <span className="series-cell">
                    <SeriesMarker color={s.color} icon={s.icon} />
                    {s.name}
                  </span>
                </td>
                <td className="num">
                  {formatValue(m.value)} {s.unit}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}