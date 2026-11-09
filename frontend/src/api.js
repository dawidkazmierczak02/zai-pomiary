const SESSION_KEY = 'zai-session'


let session = readStoredSession()

function readStoredSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export function getSession() {
  return session
}

export function setSession(newSession) {
  session = newSession
  try {
    if (newSession) sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // tryb prywatny sesja zostanie tylko w pamięci do odświeżenia strony
  }
}

// Błąd zwrócony przez API w formacie Problem Details
export class ApiError extends Error {
  constructor(status, problem) {
    super(problem?.detail || problem?.title || `Błąd serwera (${status})`)
    this.status = status
    this.problem = problem
  }
}

export async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && session) headers.Authorization = `Bearer ${session.token}`

  const response = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Token wygasł lub został unieważniony 
  if (auth && response.status === 401) {
    setSession(null)
    window.dispatchEvent(new Event('auth-expired'))
  }

  if (response.status === 204) return null //usunięcie brak treści
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, data)
  return data
}

/** Błędy walidacji z odpowiedzi API */
export function fieldErrors(error) {
  const result = {}
  for (const item of error?.problem?.errors ?? []) result[item.field] = item.message
  return result
}