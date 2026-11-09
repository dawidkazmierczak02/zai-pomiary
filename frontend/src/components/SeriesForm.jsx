import { useId, useState } from 'react'
import { api, fieldErrors } from '../api'
import Modal from './Modal'

const ICONS = [
  { value: 'circle', label: 'Koło' },
  { value: 'square', label: 'Kwadrat' },
  { value: 'triangle', label: 'Trójkąt' },
  { value: 'diamond', label: 'Romb' },
]

function initialValues(series) {
  if (!series) return { name: '', minValue: '', maxValue: '', color: '#1d4ed8', icon: 'circle', unit: '' }
  return {
    name: series.name,
    minValue: String(series.minValue),
    maxValue: String(series.maxValue),
    color: series.color,
    icon: series.icon || 'circle',
    unit: series.unit || '',
  }
}

// szybka podpowiedź bez wysyłania zapytania
function validate(values) {
  const errors = {}
  const name = values.name.trim()
  if (!name) errors.name = 'Podaj nazwę serii.'
  else if (name.length > 100) errors.name = 'Nazwa może mieć najwyżej 100 znaków.'
  if (values.minValue === '' || Number.isNaN(Number(values.minValue))) errors.minValue = 'Podaj liczbę.'
  if (values.maxValue === '' || Number.isNaN(Number(values.maxValue))) errors.maxValue = 'Podaj liczbę.'
  if (!errors.minValue && !errors.maxValue && Number(values.minValue) >= Number(values.maxValue)) {
    errors.maxValue = 'Wartość maksymalna musi być większa niż minimalna.'
  }
  if (values.unit.trim().length > 20) errors.unit = 'Jednostka może mieć najwyżej 20 znaków.'
  return errors
}

// series = null wtedy nowa seria, obiekt serii wtedy edycja
export default function SeriesForm({ series, onClose, onSaved }) {
  const id = useId()
  const [values, setValues] = useState(() => initialValues(series))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)

    function change(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError(null)
  }

  // Właściwości wspólne dla każdego pola powiązanie z komunikatem błędu
  function fieldProps(field) {
    return {
      id: `${id}-${field}`,
      'aria-invalid': errors[field] ? 'true' : undefined,
      'aria-describedby': errors[field] ? `${id}-${field}-error` : undefined,
    }
  }

  function FieldError({ field }) {
    if (!errors[field]) return null
    return <span id={`${id}-${field}-error`} className="field-error">{errors[field]}</span>
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const clientErrors = validate(values)
    setErrors(clientErrors)
    setFormError(null)
    if (Object.keys(clientErrors).length > 0) return

    const body = {
      name: values.name.trim(),
      minValue: Number(values.minValue),
      maxValue: Number(values.maxValue),
      color: values.color,
      icon: values.icon,
      unit: values.unit.trim() || null,
    }
    setBusy(true)
    try {
      if (series) {
        await api(`/api/series/${series.id}`, { method: 'PUT', auth: true, body })
        onSaved(`Zapisano zmiany w serii „${body.name}”.`)
      } else {
        await api('/api/series', { method: 'POST', auth: true, body })
        onSaved(`Utworzono serię „${body.name}”.`)
      }
    } catch (err) {
      setErrors(fieldErrors(err))
      setFormError(
        err.status === 409 ? `Nie można zmienić przedziału. ${err.message}` : err.message,
      )
      setBusy(false)
    }
  }

  return (
    <Modal title={series ? 'Edycja serii' : 'Nowa seria'} open onClose={onClose}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor={`${id}-name`}>Nazwa</label>
          <input {...fieldProps('name')} value={values.name} onChange={(e) => change('name', e.target.value)} />
          <FieldError field="name" />
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor={`${id}-minValue`}>Wartość minimalna</label>
            <input
              {...fieldProps('minValue')}
              type="number"
              step="any"
              value={values.minValue}
              onChange={(e) => change('minValue', e.target.value)}
            />
            <FieldError field="minValue" />
          </div>
          <div className="field">
            <label htmlFor={`${id}-maxValue`}>Wartość maksymalna</label>
            <input
              {...fieldProps('maxValue')}
              type="number"
              step="any"
              value={values.maxValue}
              onChange={(e) => change('maxValue', e.target.value)}
            />
            <FieldError field="maxValue" />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label htmlFor={`${id}-color`}>Kolor</label>
            <input {...fieldProps('color')} type="color" value={values.color} onChange={(e) => change('color', e.target.value)} />
            <FieldError field="color" />
          </div>
          <div className="field">
            <label htmlFor={`${id}-icon`}>Kształt znacznika</label>
            <select {...fieldProps('icon')} value={values.icon} onChange={(e) => change('icon', e.target.value)}>
              {ICONS.map((icon) => (
                <option key={icon.value} value={icon.value}>{icon.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${id}-unit`}>Jednostka</label>
            <input {...fieldProps('unit')} value={values.unit} placeholder="np. °C" onChange={(e) => change('unit', e.target.value)} />
            <FieldError field="unit" />
          </div>
        </div>

        {formError && <p role="alert" className="error">{formError}</p>}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>Anuluj</button>
          <button type="submit" className="button" disabled={busy}>
            {busy ? 'Zapisywanie…' : series ? 'Zapisz zmiany' : 'Dodaj serię'}
          </button>
        </div>
      </form>
    </Modal>
  )
}