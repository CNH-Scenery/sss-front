const SESSION_KEY = "tt_session";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function currentSession() {
  return readJSON(SESSION_KEY, null);
}

function saveSession(payload) {
  const accessToken = payload?.access_token ?? payload?.accessToken;
  if (!accessToken) {
    throw new Error("로그인 응답에 access_token이 없습니다.");
  }

  const session = {
    accessToken,
    tokenType: payload?.token_type ?? payload?.tokenType ?? "bearer",
    user: payload?.user ?? null,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function extractErrorMessage(data, status) {
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.map((item) => item?.msg).filter(Boolean).join("\n");
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  if (status === 401 || status === 403) return "이메일 또는 비밀번호를 확인하세요.";
  return "로그인 요청에 실패했습니다.";
}

async function requestJSON(path, { method = "GET", body, auth = false } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) Object.assign(headers, getAuthHeaders());

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("백엔드 서버에 연결할 수 없습니다. 서버 실행 상태와 VITE_API_BASE_URL을 확인하세요.");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(extractErrorMessage(data, response.status));
  }
  return data;
}

export function isAuthed() {
  return !!currentSession()?.accessToken;
}

export function currentUser() {
  const session = currentSession();
  return session?.user ?? null;
}

export function getAccessToken() {
  return currentSession()?.accessToken ?? "";
}

export function getAuthHeaders() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(email, password) {
  const key = email.trim().toLowerCase();
  const data = await requestJSON("/api/auth/login", {
    method: "POST",
    body: { email: key, password },
  });
  return saveSession(data);
}

export async function signup({ name, email, password }) {
  const key = email.trim().toLowerCase();
  const data = await requestJSON("/api/auth/signup", {
    method: "POST",
    body: { name: name.trim(), email: key, password },
  });
  return saveSession(data);
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}
