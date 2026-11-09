import { useState } from 'react'
import { api } from '../api'
import Modal from './Modal'

export default function LoginDialog({ open, onClose, onLoggedIn }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Zamknięcie okna czyści hasło i komunikat 
  function close() {
    setPassword('')
    setError(null)
    onClose()
  }
  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { username, password } })
      setPassword('')
      onLoggedIn({ token: data.accessToken, username })
    } catch (err) {
      setError(err.status === 401 ? 'Niepoprawny login lub hasło.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Logowanie administratora" open={open} onClose={close}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Login</span>
          <input
            autoComplete="username"
            required
            value={username}
            onChange={(event) => {
              setUsername(event.target.value)
              setError(null)
            }}
          />
        </label>
        <label className="field">
          <span>Hasło</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError(null)
            }}
          />
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={close}>Anuluj</button>
          <button type="submit" className="button" disabled={busy}>
            {busy ? 'Logowanie…' : 'Zaloguj'}
          </button>
        </div>
      </form>
    </Modal>
  )
}