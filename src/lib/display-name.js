function isEmailLike(value) {
  return typeof value === "string" && /@/.test(value.trim());
}

function titleCaseLocalPart(value) {
  return value
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeHandle(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[._\-\s]+/g, "");
}

function firstNonEmail(...values) {
  for (const value of values) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (trimmed && !isEmailLike(trimmed)) return trimmed;
  }
  return "";
}

function nameFromEmail(email) {
  if (!isEmailLike(email)) return "";
  const local = email.split("@")[0]?.trim() ?? "";
  return local ? titleCaseLocalPart(local) : "";
}

function isLoginHandle(value, user) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;

  const normalized = normalizeHandle(trimmed);
  const username = normalizeHandle(user?.username);
  const localRaw = String(user?.email || "")
    .split("@")[0]
    .trim()
    .toLowerCase();
  const local = normalizeHandle(localRaw);
  const firstSegment = localRaw.split(/[._\-]+/)[0] || "";

  if (username && normalized === username) return true;
  if (local && normalized === local) return true;
  if (firstSegment && trimmed.toLowerCase() === firstSegment) return true;
  return false;
}

function firstRealName(user, ...values) {
  for (const value of values) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (trimmed && !isEmailLike(trimmed) && !isLoginHandle(trimmed, user)) {
      return trimmed;
    }
  }
  return "";
}

function nameQuality(name) {
  if (!name) return 0;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length * 100 + name.trim().length;
}

function pickPreferredName(...names) {
  let best = "";
  let bestScore = 0;

  for (const name of names) {
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed || isEmailLike(trimmed)) continue;
    const score = nameQuality(trimmed);
    if (score > bestScore) {
      best = trimmed;
      bestScore = score;
    }
  }

  return best;
}

/** Nombre visible: nunca un correo ni el identificador de login. */
export function getDisplayName(user) {
  if (!user) return "";
  return (
    firstRealName(user, user.nombre, user.name) ||
    nameFromEmail(user.email) ||
    firstNonEmail(user.username)
  );
}

export function getDisplayInitial(user) {
  const name = getDisplayName(user);
  if (name) return name.charAt(0).toUpperCase();
  return "U";
}

export function mergeAuthUser(current, incoming) {
  if (!incoming) return current ?? null;
  if (!current) {
    const nombre = getDisplayName(incoming);
    return nombre ? { ...incoming, nombre } : incoming;
  }

  const incomingReal = firstRealName(incoming, incoming.nombre, incoming.name);
  const nombre =
    incomingReal ||
    pickPreferredName(getDisplayName(current), getDisplayName(incoming)) ||
    incoming.nombre ||
    current.nombre ||
    "";

  return {
    ...current,
    ...incoming,
    nombre,
    email: incoming.email || current.email || null,
    username: incoming.username || current.username || "",
  };
}
