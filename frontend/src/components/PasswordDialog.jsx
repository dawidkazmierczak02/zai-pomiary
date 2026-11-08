import { useState } from 'react'
import { api } from '../api'
import Modal from './Modal'

const MIN_LENGTH = 8

export default function PasswordDialog({ open, onClose, onChanged }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function reset() {
    setCurrentPassword('')
    setNewPassword('')
    setRepeatPassword('')
    setError(null)
  }

  function close() {
    reset()
    onClose()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    // Najpierw sprawdzenie w przeglądarce bez wysyłania zapytania
    if (newPassword.length < MIN_LENGTH) {
      setError(`Nowe hasło musi mieć co najmniej ${MIN_LENGTH} znaków.`)
      return
    }
    if (newPassword !== repeatPassword) {
      setError('Powtórzone hasło różni się od nowego hasła.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await api('/api/auth/password', {
        method: 'PUT',
        auth: true,
        body: { currentPassword, newPassword },
      })
      reset()
      onChanged()
    } catch (err) {
      setError(err.status === 403 ? 'Podane bieżące hasło jest niepoprawne.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Zmiana hasła" open={open} onClose={close}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Bieżące hasło</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Nowe hasło (min. {MIN_LENGTH} znaków)</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Powtórz nowe hasło</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={repeatPassword}
            onChange={(event) => setRepeatPassword(event.target.value)}
          />
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={close}>Anuluj</button>
          <button type="submit" className="button" disabled={busy}>
            {busy ? 'Zapisywanie…' : 'Zmień hasło'}
          </button>
        </div>
      </form>
    </Modal>
  )
}