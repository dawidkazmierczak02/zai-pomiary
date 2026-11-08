// Znacznik serii kształt + kolor
export default function SeriesMarker({ color, icon, size = 16 }) {
  const style = { fill: color, stroke: '#1a2230', strokeWidth: 1 }

  let shape
  if (icon === 'square') {
    shape = <rect x="2" y="2" width="12" height="12" {...style} />
  } else if (icon === 'triangle') {
    shape = <polygon points="8,1.5 14.5,14 1.5,14" {...style} />
  } else if (icon === 'diamond') {
    shape = <polygon points="8,1 15,8 8,15 1,8" {...style} />
  } else {
    shape = <circle cx="8" cy="8" r="6" {...style} />
  }

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      {shape}
    </svg>
  )
}