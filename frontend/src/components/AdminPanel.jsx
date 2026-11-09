import { useState } from 'react'
import RejectedLog from './RejectedLog'
import SensorsManager from './SensorsManager'
import SeriesManager from './SeriesManager'

const TABS = [
  { id: 'series', label: 'Serie' },
  { id: 'sensors', label: 'Czujniki' },
  { id: 'rejected', label: 'Log błędów' },
]

export default function AdminPanel({ series, onSeriesChanged, onNotice }) {
  const [tab, setTab] = useState('series')

  return (
    <>
      <div className="tab-buttons" role="group" aria-label="Sekcje panelu administratora">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab-button${tab === t.id ? ' active' : ''}`}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'series' && <SeriesManager series={series} onChanged={onSeriesChanged} onNotice={onNotice} />}
      {tab === 'sensors' && <SensorsManager series={series} onNotice={onNotice} />}
      {tab === 'rejected' && <RejectedLog series={series} />}
    </>
  )
}