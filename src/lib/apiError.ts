type ApiErrorPayload = {
  message?: unknown;
  error?: unknown;
};

export function extractApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (!error) return fallback;

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (error instanceof Error && error.message.trim()) {
    const axiosLike = error as Error & {
      response?: { data?: ApiErrorPayload | string; status?: number };
    };
    const responseData = axiosLike.response?.data;
    if (typeof responseData === 'string' && responseData.trim()) {
      if (responseData.includes('Composer detected') && responseData.includes('sodium')) {
        return 'Server setup issue: PHP sodium extension is missing in Apache. Enable extension=sodium in php.ini and restart Apache.';
      }
      const trimmed = responseData.trim();
      if (!trimmed.startsWith('<')) {
        return trimmed.length > 280 ? `${trimmed.slice(0, 280)}…` : trimmed;
      }
    }
    const apiMessage =
      typeof responseData === 'object' && responseData !== null
        ? (responseData as ApiErrorPayload).message
        : undefined;
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage.trim();
    }
    const genericAxios = /^Request failed with status code \d+$/i.test(error.message.trim());
    if (!genericAxios) {
      return error.message.trim();
    }
    if (axiosLike.response?.status === 500) {
      return 'Server error (500). If you changed your device date/time manually, turn on automatic date & time and try again.';
    }
  }

  if (typeof error === 'object' && error !== null) {
    const payload = error as ApiErrorPayload & { response?: { data?: ApiErrorPayload } };
    const nested = payload.response?.data;
    const candidates = [payload.message, nested?.message, nested?.error, payload.error];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return fallback;
}

export async function readApiJson<T = Record<string, unknown>>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid response from server. Please try again.');
  }
}
