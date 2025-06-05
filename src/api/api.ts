const API_BASE_URL: string = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000';

const getToken = (): string | null => {
  return localStorage.getItem('token');
};

const handleLogout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

interface BackendErrorResponse {
  message: string;
}

interface StructuredError extends Error {
  response?: {
    data: BackendErrorResponse;
    status: number;
  };
  message: string;
  originalError?: any;
}

/**
 * Generic API call function with JWT authentication.
 * @param {string} endpoint - The API endpoint (e.g., '/auth/protected-test').
 * @param {'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'} method - The HTTP method.
 * @param {object | null} [data=null] - The request body data.
 * @param {boolean} [requiresAuth=true] - Whether the endpoint requires authentication.
 * @returns {Promise<any>} - A promise that resolves with the JSON response data.
 * @throws {StructuredError} - Throws a structured error if the request fails or returns a non-OK status.
 */

const api = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD',
  data: object | null = null,
  requiresAuth: boolean = true
): Promise<any> => {
  const url: string = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth) {
    const token: string | null = getToken();
    if (!token) {
      console.error('Authentication required but no token found.');
      handleLogout();
      throw { message: 'Authentication required.' } as StructuredError;
    }
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
    body: data ? JSON.stringify(data) : null,
  };

  if (method === 'GET' || method === 'HEAD') {
    delete options.body;
  }

  try {
    const response: Response = await fetch(url, options);

    if (!response.ok) {
      const errorData: BackendErrorResponse = await response.json().catch(() => ({ message: response.statusText }));

      if ((response.status === 401 || response.status === 403) && requiresAuth) {
        console.error(`Authentication error on protected route: ${response.status}`);
        handleLogout();
        throw { message: errorData.message, response: { data: errorData, status: response.status } } as StructuredError;
      }
      console.error(`API Error: ${response.status} - ${errorData.message}`);
      throw { message: errorData.message, response: { data: errorData, status: response.status } } as StructuredError;
    }
    const text: string = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error: any) {
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('API call re-throwing structured error:', error);
      throw error as StructuredError;
    } else {
      console.error('Network or unexpected API call error:', error);
      throw { message: 'Network error or unexpected API issue.', originalError: error } as StructuredError;
    }
  }
};

export default api;