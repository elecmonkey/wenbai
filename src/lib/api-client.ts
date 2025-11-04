export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ApiResponse<T> = {
  message: string;
  data?: T;
  error?: string;
};

export async function apiRequest<T>(
  input: RequestInfo,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const hasBody = text.length > 0;
  let payload: ApiResponse<T> | null = null;

  if (hasBody) {
    try {
      payload = JSON.parse(text) as ApiResponse<T>;
    } catch (error) {
      throw new ApiError(
        `Invalid JSON response: ${(error as Error).message}`,
        response.status,
      );
    }
  }

  if (!response.ok) {
    const errorMessage =
      payload?.error ?? payload?.message ?? response.statusText;
    throw new ApiError(errorMessage, response.status);
  }

  if (payload?.data !== undefined) {
    return payload.data;
  }

  return (payload as unknown as T) ?? (undefined as T);
}
