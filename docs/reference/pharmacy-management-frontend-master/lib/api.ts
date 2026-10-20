const API_URL = "http://localhost:4000/api";

type ApiOptions = RequestInit & {
  auth?: boolean;
};

export async function apiFetch<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const { auth = true, headers, ...fetchOptions } = options;

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("pharmacy_token")
      : null;

  const requestHeaders = new Headers(headers);

  requestHeaders.set("Accept", "application/json");

  // Only send Content-Type when the request actually has a body.
  if (fetchOptions.body !== undefined && fetchOptions.body !== null) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth && token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers: requestHeaders,
  });

  let data: unknown;

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

export function setToken(token: string) {
  localStorage.setItem("pharmacy_token", token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("pharmacy_token");
}

export function removeToken() {
  localStorage.removeItem("pharmacy_token");
}