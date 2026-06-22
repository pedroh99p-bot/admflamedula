import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedTargets: Record<string, string> = {
  hero: "flamedula/site/hero",
  actions: "flamedula/site/actions",
  media: "flamedula/site/media",
  team: "flamedula/site/team",
  testimonials: "flamedula/site/testimonials",
  branding: "flamedula/site/branding"
};

const imageEagerTransformations = [
  "f_webp,q_auto:good,c_limit,w_1920",
  "f_webp,q_auto:good,c_fill,g_auto,w_900,h_600",
  "f_webp,q_auto:eco,c_fill,g_auto,w_480,h_320"
].join("|");

const allowedResourceTypes = new Set(["image", "video"]);
const allowedRoles = new Set(["super_admin", "admin", "operator"]);

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

async function sha1Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildCloudinarySignature(params: Record<string, string | number>, apiSecret: string) {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return sha1Hex(`${serialized}${apiSecret}`);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(request) });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed" }, 405);
  }

  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
  const uploadPreset = Deno.env.get("CLOUDINARY_UPLOAD_PRESET") || null;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabasePublishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  if (!cloudName || !apiKey || !apiSecret || !supabaseUrl || !supabasePublishableKey) {
    return jsonResponse(request, { error: "Edge Function secrets are not configured" }, 500);
  }

  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return jsonResponse(request, { error: "Missing bearer token" }, 401);
  }

  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    global: {
      headers: { Authorization: authorization }
    }
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) {
    return jsonResponse(request, { error: "Invalid session" }, 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("role, active")
    .eq("user_id", userResult.user.id)
    .eq("active", true)
    .maybeSingle();

  if (profileError) {
    return jsonResponse(request, { error: "Unable to validate admin profile" }, 403);
  }

  if (!profile || !allowedRoles.has(profile.role)) {
    return jsonResponse(request, { error: "Insufficient permission" }, 403);
  }

  let body: { target?: string; resourceType?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Invalid JSON body" }, 400);
  }

  const target = body.target || "media";
  const resourceType = body.resourceType || "image";
  const folder = allowedTargets[target];

  if (!folder) {
    return jsonResponse(request, { error: "Invalid upload target" }, 400);
  }

  if (!allowedResourceTypes.has(resourceType)) {
    return jsonResponse(request, { error: "Invalid resource type" }, 400);
  }

  const timestamp = Math.round(Date.now() / 1000);
  const isImage = resourceType === "image";
  const eager = isImage ? imageEagerTransformations : null;
  const eagerAsync = isImage ? false : null;
  const signatureParams: Record<string, string | number> = {
    folder,
    timestamp
  };

  if (uploadPreset) {
    signatureParams.upload_preset = uploadPreset;
  }

  if (eager) {
    signatureParams.eager = eager;
    signatureParams.eager_async = "false";
  }

  const signature = await buildCloudinarySignature(signatureParams, apiSecret);

  return jsonResponse(request, {
    success: true,
    timestamp,
    signature,
    cloudName,
    apiKey,
    uploadPreset,
    folder,
    resourceType,
    target,
    eager,
    eagerAsync
  });
});
