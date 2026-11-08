import { useEffect, useMemo, useRef } from 'react'
import {
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { pl } from 'date-fns/locale'
import { Line } from 'react-chartjs-2'
import { formatValue } from '../format'

ChartJS.register(LinearScale, TimeScale, PointElement, LineElement, Tooltip, Legend)

const POINT_STYLES = { circle: 'circle', square: 'rect', triangle: 'triangle', diamond: 'rectRot' }
// Różne style linii serie da się rozróżnić także bez kolorów (T6)
const LINE_DASHES = [[], [8, 4], [2, 3], [12, 3, 2, 3]]

export default function MeasurementsChart({ series, measurements, selectedId, onSelect }) {
  const chartRef = useRef(null)

  const { data, options } = useMemo(() => {
    // Każda jednostka dostaje własną oś Y
    const units = [...new Set(series.map((s) => s.unit || ''))]
    const axisId = (unit) => `y${units.indexOf(unit || '')}`

    const datasets = series.map((s, index) => {
      const points = measurements
        .filter((m) => m.seriesId === s.id)
        .map((m) => ({ x: Date.parse(m.timestamp), y: m.value, id: m.id }))

      return {
        label: s.unit ? `${s.name} (${s.unit})` : s.name,
        seriesName: s.name,
        unit: s.unit || '',
        data: points,
        yAxisID: axisId(s.unit),
        borderColor: s.color,
        backgroundColor: s.color,
        borderWidth: 2,
        borderDash: LINE_DASHES[index % LINE_DASHES.length],
        pointStyle: POINT_STYLES[s.icon] || 'circle',
        // Wybrany punkt jest większy i ma grube obramowanie
        pointRadius: points.map((p) => (p.id === selectedId ? 9 : 3)),
        pointBorderWidth: points.map((p) => (p.id === selectedId ? 3 : 1)),
        pointBorderColor: points.map((p) => (p.id === selectedId ? '#1a2230' : s.color)),
        pointHoverRadius: 7,
      }
    })

    const scales = {
      x: {
        type: 'time',
        adapters: { date: { locale: pl } },
        time: {
          tooltipFormat: 'dd.MM.yyyy HH:mm',
          displayFormats: { minute: 'HH:mm', hour: 'HH:mm', day: 'dd.MM' },
        },
        title: { display: true, text: 'Czas' },
      },
    }
    units.forEach((unit, i) => {
      scales[`y${i}`] = {
        type: 'linear',
        position: i % 2 === 0 ? 'left' : 'right',
        title: { display: true, text: unit || 'Wartość' },
        grid: { drawOnChartArea: i === 0 }, // siatka tylko od pierwszej osi
      }
    })

    return {
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'nearest', intersect: false },
        scales,
        plugins: {
          legend: { labels: { usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.seriesName}: ${formatValue(ctx.parsed.y)} ${ctx.dataset.unit}`,
            },
          },
        },
        // Kliknięcie punktu zaznacza go i tabela przewinie się do tego wiersza
        onClick: (_event, elements, chart) => {
          if (elements.length === 0) return
          const { datasetIndex, index } = elements[0]
          onSelect(chart.data.datasets[datasetIndex].data[index].id)
        },
      },
    }
  }, [series, measurements, selectedId, onSelect])

// Po wyborze wiersza w tabeli pokazujemy dymek z wartością przy tym punkcie (F6).
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    let active = []
    let position = { x: 0, y: 0 }
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const index = dataset.data.findIndex((point) => point.id === selectedId)
      if (index !== -1) {
        active = [{ datasetIndex, index }]
        const element = chart.getDatasetMeta(datasetIndex).data[index]
        if (element) position = { x: element.x, y: element.y }
      }
    })
    chart.setActiveElements(active)
    chart.tooltip.setActiveElements(active, position)
    chart.render()
  }, [selectedId, data])

  return (
    <div className="chart-box">
      <Line
        ref={chartRef}
        data={data}
        options={options}
        role="img"
        aria-label="Wykres wartości pomiarów wybranych serii w czasie. Te same dane zawiera tabela wyników."
      />
    </div>
  )
}