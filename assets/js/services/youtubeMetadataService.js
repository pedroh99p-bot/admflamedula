import { getSession } from "./authService.js";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com"
]);

function getFunctionUrl() {
  const { SUPABASE_URL } = window.FLAMEDULA_CONFIG || {};
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL nao configurada para chamar Edge Function.");
  }
  return `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/resolve-youtube-metadata`;
}

export function extractYouTubeVideoId(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS.has(host)) return null;

    if (host.endsWith("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (url.pathname === "/watch") return url.searchParams.get("v") || null;
    if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/").filter(Boolean)[1] || null;
    if (url.pathname.startsWith("/embed/")) return url.pathname.split("/").filter(Boolean)[1] || null;
    return null;
  } catch {
    return null;
  }
}

export function buildYouTubeMetadataFallback(value) {
  const videoId = extractYouTubeVideoId(value);
  if (!videoId) return null;
  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    title: "",
    authorName: "",
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    thumbnailWidth: 480,
    thumbnailHeight: 360,
    fallback: true
  };
}

export async function resolveYouTubeMetadata(value) {
  const fallback = buildYouTubeMetadataFallback(value);
  if (!fallback) {
    throw new Error("Cole uma URL valida do YouTube.");
  }

  const session = await getSession();
  if (!session?.access_token) {
    throw new Error("Sessao expirada. Entre novamente no ADM.");
  }

  try {
    const response = await fetch(getFunctionUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ url: fallback.canonicalUrl })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ...fallback,
        message: body.error || "Nao foi possivel obter o titulo automaticamente."
      };
    }

    return {
      ...fallback,
      ...body,
      fallback: Boolean(body.fallback)
    };
  } catch (error) {
    return {
      ...fallback,
      message: error?.message || "Nao foi possivel obter o titulo automaticamente."
    };
  }
}
