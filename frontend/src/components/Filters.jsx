import SeriesMarker from './SeriesMarker'

export default function Filters({ series, selectedIds, onSelectedChange, range, onRangeChange }) {
  function toggleSeries(id) {
    if (selectedIds.includes(id)) {
      onSelectedChange(selectedIds.filter((selected) => selected !== id))
    } else {
      onSelectedChange([...selectedIds, id])
    }
  }

  return (
    <form className="filters" onSubmit={(event) => event.preventDefault()}>
      <fieldset>
        <legend>Zakres czasu</legend>
        <label className="field">
          <span>Od</span>
          <input
            type="datetime-local"
            value={range.from}
            max={range.to}
            onChange={(event) => onRangeChange({ ...range, from: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Do</span>
          <input
            type="datetime-local"
            value={range.to}
            min={range.from}
            onChange={(event) => onRangeChange({ ...range, to: event.target.value })}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Widoczne serie</legend>
        {series.length === 0 && <p className="muted">Brak serii do wyświetlenia.</p>}
        <ul className="series-list">
          {series.map((s) => (
            <li key={s.id}>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(s.id)}
                  onChange={() => toggleSeries(s.id)}
                />
                <SeriesMarker color={s.color} icon={s.icon} />
                <span>
                  {s.name}
                  {s.unit && <span className="muted"> ({s.unit})</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
    </form>
  )
}