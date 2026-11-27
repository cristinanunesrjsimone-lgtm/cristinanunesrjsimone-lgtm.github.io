const API = (
  import.meta.env.VITE_API_URL ||
  'https://sanesfruitbe.onrender.com/api'
).replace(/\/+$/, '');

export function token() {
  return localStorage.getItem('sanesfruit_token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {

  const headers = new Headers(options.headers);

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const accessToken = token();

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const endpoint = path.startsWith('/') ? path : `/${path}`;

  const response = await fetch(`${API}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));

    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message;

    throw new Error(message || `Erro ${response.status}`);
  }

  return response.status === 204
    ? (undefined as T)
    : response.json();
}

export async function login(email: string, senha: string) {

  const result = await api<{
    accessToken: string;
    usuario: {
      nome: string;
      perfil: string;
    };
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha })
  });

  localStorage.setItem(
    'sanesfruit_token',
    result.accessToken
  );

  localStorage.setItem(
    'sanesfruit_user',
    JSON.stringify(result.usuario)
  );

  return result.usuario;
}

export function imageUrl(path?: string | null): string {

  const backendUrl = API.replace(/\/api\/?$/, '');

  if (!path || !path.trim()) {
    return `${backendUrl}/uploads/produtos/sem-foto.svg`;
  }

  if (path.startsWith('/uploads/')) {
    return `${backendUrl}${path}`;
  }

  return path;
}