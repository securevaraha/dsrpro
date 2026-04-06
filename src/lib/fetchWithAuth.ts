export interface FetchWithAuthOptions {
  retryOnAuthError?: boolean
  retryDelayMs?: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchWithAuthOptions = {}
): Promise<Response> {
  const { retryOnAuthError = true, retryDelayMs = 180 } = options

  const baseInit: RequestInit = {
    cache: 'no-store',
    credentials: 'include',
    ...init,
    headers: {
      ...(init.headers || {}),
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    },
  }

  let response = await fetch(input, baseInit)

  if (!retryOnAuthError || (response.status !== 401 && response.status !== 403)) {
    return response
  }

  // Session cookie propagation can lag briefly after opening a new tab/window.
  const authCheck = await fetch('/api/auth/me', {
    cache: 'no-store',
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    },
  })

  if (!authCheck.ok) {
    return response
  }

  await sleep(retryDelayMs)
  response = await fetch(input, baseInit)
  return response
}
