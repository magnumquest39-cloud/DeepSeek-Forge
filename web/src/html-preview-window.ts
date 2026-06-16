const PREVIEW_PREFIX = "forgeagent.htmlPreview.";
const PREVIEW_TTL_MS = 10 * 60 * 1000;

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older browsers/WebViews that lack crypto.randomUUID()
  // Uses crypto.getRandomValues() (available since Chrome 11 / WebView 37)
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  buf[6] = (buf[6]! & 0x0f) | 0x40; // version 4
  buf[8] = (buf[8]! & 0x3f) | 0x80; // variant
  const parts = Array.from(buf, (b) => b.toString(16).padStart(2, "0"));
  return `${parts[0]!}${parts[1]!}${parts[2]!}${parts[3]!}-${parts[4]!}${parts[5]!}-${parts[6]!}${parts[7]!}-${parts[8]!}${parts[9]!}-${parts[10]!}${parts[11]!}${parts[12]!}${parts[13]!}${parts[14]!}${parts[15]!}`;
}

export type StoredHtmlPreview = {
  html: string;
  title: string;
  createdAt: number;
  expiresAt: number;
};

export function storeHtmlPreview(html: string, title = "DeepSeek-Forge HTML Preview"): string {
  cleanupExpiredHtmlPreviews();
  const id = generateId();
  const now = Date.now();
  const payload: StoredHtmlPreview = {
    html,
    title,
    createdAt: now,
    expiresAt: now + PREVIEW_TTL_MS,
  };
  localStorage.setItem(`${PREVIEW_PREFIX}${id}`, JSON.stringify(payload));
  return id;
}

export function readStoredHtmlPreview(id: string): StoredHtmlPreview | null {
  const raw = localStorage.getItem(`${PREVIEW_PREFIX}${id}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredHtmlPreview>;
    if (
      typeof parsed.html !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt < Date.now()
    ) {
      localStorage.removeItem(`${PREVIEW_PREFIX}${id}`);
      return null;
    }
    return {
      html: parsed.html,
      title: parsed.title,
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
      expiresAt: parsed.expiresAt,
    };
  } catch {
    localStorage.removeItem(`${PREVIEW_PREFIX}${id}`);
    return null;
  }
}

export function openHtmlPreviewDocument(html: string, title?: string): void {
  const id = storeHtmlPreview(html, title);
  const url = `/html-preview?id=${encodeURIComponent(id)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function cleanupExpiredHtmlPreviews(): void {
  const now = Date.now();
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PREVIEW_PREFIX)) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? "{}") as Partial<StoredHtmlPreview>;
      if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < now) {
        localStorage.removeItem(key);
      }
    } catch {
      localStorage.removeItem(key);
    }
  }
}
