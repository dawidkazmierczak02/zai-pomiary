export default function Header() {
  return (
    <header className="app-header">
      <div>
        <h1>Serie pomiarowe</h1>
        <p className="subtitle">Instalacja przemysłowa – pomiary z czujników IoT</p>
      </div>
      <nav aria-label="Konto">
        <button type="button" className="button">Zaloguj się</button>
      </nav>
    </header>
  )
}