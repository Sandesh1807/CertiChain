/** Dev-mode session marker: issued on the local node in this browser session. */
const KEY = "certichain:local";

export function markLocalIssue() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* private mode */
  }
}

export function wasLocalIssue() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function clearLocalIssue() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
