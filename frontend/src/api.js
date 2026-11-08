// Błąd zwrócony przez API w formacie Problem Details 
export class ApiError extends Error {
  constructor(status, problem) {
    super(problem?.detail || problem?.title || `Błąd serwera (${status})`)
    this.status = status
    this.problem = problem
  }
}

// Wysyła zapytanie do API i zwraca odpowiedź jako Jave
export async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) return null 
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, data)
  return data
}