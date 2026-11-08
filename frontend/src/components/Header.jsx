export default function Header({ username, onLoginClick, onPasswordClick, onLogout }) {
  return (
    <header className="app-header">
      <div>
        <h1>Serie pomiarowe</h1>
        <p className="subtitle">Instalacja przemysłowa – pomiary z czujników IoT</p>
      </div>
      <nav aria-label="Konto" className="account">
        {username ? (
          <>
            <span className="muted">
              Zalogowano: <strong>{username}</strong>
            </span>
            <button type="button" className="button secondary" onClick={onPasswordClick}>
              Zmień hasło
            </button>
            <button type="button" className="button" onClick={onLogout}>
              Wyloguj
            </button>
          </>
        ) : (
          <button type="button" className="button" onClick={onLoginClick}>
            Zaloguj się
          </button>
        )}
      </nav>
    </header>
  )
}