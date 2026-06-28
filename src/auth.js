// Frontend-only mock auth. Persists to localStorage — NOT secure, for
// prototype/demo use only. Replace with a real backend + httpOnly session later.
const SESSION_KEY = "tt_session";
const USERS_KEY = "tt_users";

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function getUsers() {
  return readJSON(USERS_KEY, {});
}

export function isAuthed() {
  return !!localStorage.getItem(SESSION_KEY);
}

export function currentUser() {
  return readJSON(SESSION_KEY, null);
}

export function login(email, password) {
  const key = email.trim().toLowerCase();
  const user = getUsers()[key];
  if (!user) throw new Error("등록되지 않은 이메일입니다.");
  if (user.password !== password) throw new Error("비밀번호가 일치하지 않습니다.");
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email: key, name: user.name }));
}

export function signup({ name, email, password }) {
  const key = email.trim().toLowerCase();
  const users = getUsers();
  if (users[key]) throw new Error("이미 가입된 이메일입니다.");
  users[key] = { name: name.trim(), password };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email: key, name: name.trim() }));
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}
