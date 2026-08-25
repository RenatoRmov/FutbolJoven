const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/refresh`, { method: "POST", credentials: "include" })
      .then((res) => res.ok)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function handleErrorResponse(res: Response): Promise<never> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const message = (body as { message?: string })?.message ?? `Error ${res.status}`;
  throw new ApiError(res.status, message, body);
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401 && retry && path !== "/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, options, false);
    }
  }

  if (!res.ok) return handleErrorResponse(res);

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Multipart upload — no Content-Type override, the browser sets the boundary. */
async function requestFile<T>(path: string, formData: FormData, retry = true): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return requestFile<T>(path, formData, false);
  }

  if (!res.ok) return handleErrorResponse(res);
  return res.json() as Promise<T>;
}

/** Downloads a file response (e.g. an .xlsx export) by triggering a browser save. */
async function downloadFile(path: string, filename: string, retry = true): Promise<void> {
  const res = await fetch(`${API_URL}/api${path}`, { credentials: "include" });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return downloadFile(path, filename, false);
  }

  if (!res.ok) return handleErrorResponse(res);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postFile: <T>(path: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return requestFile<T>(path, formData);
  },
  download: downloadFile,
};
