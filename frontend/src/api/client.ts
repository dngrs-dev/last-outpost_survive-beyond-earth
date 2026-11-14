const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${BASE_URL}/api${normalizedPath}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      const data = JSON.parse(text);
      const value: unknown = data.detail ?? data;
      if (typeof value === 'string') {
        detail = value;
      } else if (Array.isArray(value)) {
        detail = value.map((entry) => {
          const location = Array.isArray(entry.loc) ? entry.loc.filter((part: unknown) => part !== 'body').join('.') : '';
          return `${location ? `${location}: ` : ''}${entry.msg || 'Invalid input'}`;
        }).join('; ');
      } else {
        detail = JSON.stringify(value);
      }
    } catch {
      // The response body has already been read; retain plain-text server errors.
    }
    throw new ApiError(
      response.status,
      detail || `HTTP error ${response.status}`,
      detail
    );
  }

  return response.json() as Promise<T>;
}
