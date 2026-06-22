import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedTargets: Record<string, string> = {
  hero: "flamedula/adm/hero",
  actions: "flamedula/adm/actions",
  media: "flamedula/adm/media",
  team: "flamedula/adm/team",
  testimonials: "flamedula/adm/testimonials"
};

const allowedResourceTypes = new Set(["image", "video"]);
const allowedRoles = new Set(["super_admin", "admin", "operator"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGINS") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
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
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
  const uploadPreset = Deno.env.get("CLOUDINARY_UPLOAD_PRESET") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabasePublishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  if (!cloudName || !apiKey || !apiSecret || !supabaseUrl || !supabasePublishableKey) {
    return jsonResponse({ error: "Edge Function secrets are not configured" }, 500);
  }

  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing bearer token" }, 401);
  }

  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    global: {
      headers: { Authorization: authorization }
    }
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("role, active")
    .eq("user_id", userResult.user.id)
    .eq("active", true)
    .maybeSingle();

  if (profileError) {
    return jsonResponse({ error: "Unable to validate admin profile" }, 403);
  }

  if (!profile || !allowedRoles.has(profile.role)) {
    return jsonResponse({ error: "Insufficient permission" }, 403);
  }

  let body: { target?: string; resourceType?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const target = body.target || "media";
  const resourceType = body.resourceType || "image";
  const folder = allowedTargets[target];

  if (!folder) {
    return jsonResponse({ error: "Invalid upload target" }, 400);
  }

  if (!allowedResourceTypes.has(resourceType)) {
    return jsonResponse({ error: "Invalid resource type" }, 400);
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signatureParams: Record<string, string | number> = {
    folder,
    timestamp
  };

  if (uploadPreset) {
    signatureParams.upload_preset = uploadPreset;
  }

  const signature = await buildCloudinarySignature(signatureParams, apiSecret);

  return jsonResponse({
    timestamp,
    signature,
    cloudName,
    apiKey,
    uploadPreset,
    folder,
    resourceType
  });
});
