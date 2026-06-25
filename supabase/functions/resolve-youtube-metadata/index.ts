import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedRoles = new Set(["super_admin", "admin", "operator"]);
const allowedCmsRoles = new Set(["owner", "editor"]);
const allowedHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com"
]);

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "";
  const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowOrigin = configuredOrigins.length === 0 || configuredOrigins.includes("*")
    ? "*"
    : configuredOrigins.includes(origin)
      ? origin
      : configuredOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function jsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(request),
      "Content-Type": "application/json"
    }
  });
}

function extractVideoId(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (!allowedHosts.has(host)) return null;

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

function fallbackPayload(videoId: string, message = "") {
  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    title: "",
    authorName: "",
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    thumbnailWidth: 480,
    thumbnailHeight: 360,
    fallback: true,
    message
  };
}

async function validateCmsAccess(request: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabasePublishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
    || Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabasePublishableKey) {
    return { error: "Edge Function secrets are not configured", status: 500 };
  }

  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return { error: "Missing bearer token", status: 401 };
  }

  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    global: {
      headers: { Authorization: authorization }
    }
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) {
    return { error: "Invalid session", status: 401 };
  }

  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("role, active")
    .eq("user_id", userResult.user.id)
    .eq("active", true)
    .maybeSingle();

  if (profileError || !profile || !allowedRoles.has(profile.role)) {
    return { error: "Insufficient permission", status: 403 };
  }

  const { data: cmsAccess, error: cmsAccessError } = await supabase
    .from("admin_app_access")
    .select("access_role, active")
    .eq("user_id", userResult.user.id)
    .eq("app_code", "cms")
    .eq("active", true)
    .maybeSingle();

  if (cmsAccessError || !cmsAccess || !allowedCmsRoles.has(cmsAccess.access_role)) {
    return { error: "Insufficient CMS permission", status: 403 };
  }

  return { error: "", status: 200 };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(request) });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed" }, 405);
  }

  const access = await validateCmsAccess(request);
  if (access.error) {
    return jsonResponse(request, { error: access.error }, access.status);
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Invalid JSON body" }, 400);
  }

  const videoId = extractVideoId(String(body.url || ""));
  if (!videoId) {
    return jsonResponse(request, { error: "Invalid YouTube URL" }, 400);
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;

  try {
    const response = await fetch(oembedUrl, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return jsonResponse(request, fallbackPayload(videoId, "YouTube oEmbed unavailable"));
    }

    const metadata = await response.json();
    return jsonResponse(request, {
      videoId,
      canonicalUrl,
      embedUrl,
      title: String(metadata.title || ""),
      authorName: String(metadata.author_name || ""),
      thumbnailUrl: String(metadata.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`),
      thumbnailWidth: Number(metadata.thumbnail_width || 480),
      thumbnailHeight: Number(metadata.thumbnail_height || 360),
      fallback: false
    });
  } catch {
    return jsonResponse(request, fallbackPayload(videoId, "YouTube oEmbed unavailable"));
  }
});
