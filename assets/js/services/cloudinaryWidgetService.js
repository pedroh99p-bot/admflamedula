import { getSession } from "./authService.js";
import { createMediaAsset } from "./mediaAssetService.js";
import { MediaAssetRegistrationError } from "./cloudinaryService.js";

const WIDGET_SCRIPT_URL = "https://upload-widget.cloudinary.com/latest/global/all.js";
const MAX_IMAGE_BYTES = 12_582_912;
const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"];
const TARGET_FOLDERS = {
  hero: "flamedula/site/hero",
  actions: "flamedula/site/actions",
  media: "flamedula/site/media"
};

let scriptPromise = null;
let widgetInstance = null;
let widgetTarget = "";

function getFunctionUrl() {
  const { SUPABASE_URL } = window.FLAMEDULA_CONFIG || {};
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL nao configurada para chamar Edge Function.");
  }
  return `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/generate-cloudinary-signature`;
}

function assertTarget(target) {
  if (!TARGET_FOLDERS[target]) throw new Error("Destino de upload invalido.");
}

function notify(callback, status, message = "") {
  if (typeof callback === "function") callback(status, message);
}

function getEagerUrl(info, index) {
  return info?.eager?.[index]?.secure_url || null;
}

function buildTransformedUrl(secureUrl, transformation) {
  if (!secureUrl || !transformation) return null;
  return secureUrl.replace("/upload/", `/upload/${transformation}/`);
}

function normalizeWidgetFormat(format = "") {
  const lower = String(format || "").toLowerCase();
  return lower === "jpg" ? "jpeg" : lower;
}

export function normalizeCloudinaryWidgetResult(info, target = "media") {
  assertTarget(target);
  if (!info?.public_id || !info?.secure_url) {
    throw new Error("Resposta Cloudinary sem identificador de imagem.");
  }

  const folder = TARGET_FOLDERS[target];
  const webpUrl = getEagerUrl(info, 0)
    || buildTransformedUrl(info.secure_url, "f_webp,q_auto:good,c_limit,w_1920");
  const cardUrl = getEagerUrl(info, 1)
    || buildTransformedUrl(info.secure_url, "f_webp,q_auto:good,c_fill,g_auto,w_900,h_600");
  const thumbnailUrl = getEagerUrl(info, 2)
    || buildTransformedUrl(info.secure_url, "f_webp,q_auto:eco,c_fill,g_auto,w_480,h_320");

  return {
    cloudinary_public_id: info.public_id,
    secure_url: info.secure_url,
    resource_type: "image",
    asset_type: target,
    asset_usage: target,
    folder,
    original_filename: info.original_filename || info.display_name || info.public_id,
    display_name: info.display_name || info.original_filename || info.public_id,
    format: normalizeWidgetFormat(info.format),
    width: info.width || null,
    height: info.height || null,
    bytes: info.bytes || null,
    version: info.version || null,
    delivery_url: buildTransformedUrl(info.secure_url, "f_auto,q_auto,dpr_auto"),
    webp_url: webpUrl,
    card_url: cardUrl,
    thumbnail_url: thumbnailUrl,
    transformation_profile: "standard_image",
    optimization_status: webpUrl && cardUrl && thumbnailUrl ? "ready" : "pending",
    optimized_at: webpUrl && cardUrl && thumbnailUrl ? new Date().toISOString() : null,
    metadata: {
      cloudinary_asset_id: info.asset_id || null,
      etag: info.etag || null,
      upload_source: "adm_widget",
      target,
      source: info.source || "uw",
      eager_count: info.eager?.length || 0,
      original_url: info.url || null
    }
  };
}

export function loadCloudinaryUploadWidgetScript() {
  if (window.cloudinary?.createUploadWidget) return Promise.resolve(window.cloudinary);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${WIDGET_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.cloudinary), { once: true });
      existing.addEventListener("error", () => reject(new Error("Nao foi possivel carregar o Widget Cloudinary.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.cloudinary);
    script.onerror = () => reject(new Error("Nao foi possivel carregar o Widget Cloudinary."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function requestCloudinaryWidgetSignature({ target = "media", paramsToSign = {} } = {}) {
  assertTarget(target);
  const session = await getSession();
  if (!session?.access_token) {
    throw new Error("Sessao expirada. Entre novamente no ADM.");
  }

  const response = await fetch(getFunctionUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      target,
      resourceType: "image",
      paramsToSign
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error("Sessao expirada ao gerar assinatura.");
    if (response.status === 403) throw new Error("Sem permissao para enviar midias.");
    throw new Error(body.error || "Falha ao gerar assinatura Cloudinary.");
  }

  if (!body.signature || !body.apiKey || !body.cloudName || !body.folder) {
    throw new Error("Assinatura Cloudinary incompleta.");
  }

  if (body.target !== target || body.folder !== TARGET_FOLDERS[target]) {
    throw new Error("Assinatura Cloudinary retornou destino invalido.");
  }

  return body;
}

async function registerWidgetAsset({ info, target, altText = "" }) {
  const session = await getSession();
  const payload = {
    ...normalizeCloudinaryWidgetResult(info, target),
    alt_text: altText || null,
    uploaded_by: session?.user?.id || null
  };

  const mediaAsset = await createMediaAsset(payload);
  if (!mediaAsset?.id) {
    throw new Error("media_assets nao retornou id do asset.");
  }

  return mediaAsset;
}

function closeCurrentWidget() {
  try {
    widgetInstance?.close?.({ quiet: true });
  } catch {
    // Cloudinary Widget does not expose a stable close contract across all versions.
  }
}

export function destroyCloudinaryUploadWidget() {
  closeCurrentWidget();
  try {
    widgetInstance?.destroy?.();
  } catch {
    // Best-effort cleanup only.
  }
  widgetInstance = null;
  widgetTarget = "";
}

function createWidget({ target, altText, onStatus }) {
  assertTarget(target);
  const cloudName = window.FLAMEDULA_CONFIG?.CLOUDINARY_CLOUD_NAME || "dhbrxzt5a";

  const options = {
    cloudName,
    resourceType: "image",
    multiple: false,
    maxFiles: 1,
    sources: ["local", "camera"],
    clientAllowedFormats: ALLOWED_FORMATS,
    maxFileSize: MAX_IMAGE_BYTES,
    showAdvancedOptions: false,
    showPoweredBy: false,
    cropping: false,
    prepareUploadParams: async (callback, paramsToSign = {}) => {
      try {
        notify(onStatus, "processing", "Processando imagem...");
        const signed = await requestCloudinaryWidgetSignature({ target, paramsToSign });
        callback({
          apiKey: signed.apiKey,
          api_key: signed.apiKey,
          signature: signed.signature,
          timestamp: signed.timestamp || paramsToSign.timestamp,
          uploadSignatureTimestamp: signed.timestamp || paramsToSign.timestamp,
          folder: signed.folder,
          resourceType: "image"
        });
      } catch (error) {
        notify(onStatus, "error", error.message || "Falha ao assinar upload.");
        callback({ cancel: true });
      }
    }
  };

  return window.cloudinary.createUploadWidget(options, async (error, result) => {
    if (error) {
      notify(onStatus, "error", error.message || "Nao foi possivel enviar a imagem.");
      widgetInstance?.__reject?.(error);
      return;
    }

    const event = result?.event;
    if (event === "display-changed") notify(onStatus, "opening_widget", "Abrindo seletor de imagens...");
    if (event === "upload-added") notify(onStatus, "uploading", "Enviando imagem...");
    if (event === "queues-start") notify(onStatus, "uploading", "Enviando imagem...");
    if (event === "queues-end") notify(onStatus, "processing", "Processando imagem...");
    if (event === "abort") widgetInstance?.__resolve?.(null);
    if (event === "close") widgetInstance?.__resolve?.(null);
    if (event !== "success") return;

    try {
      notify(onStatus, "registering", "Registrando no painel...");
      const mediaAsset = await registerWidgetAsset({
        info: result.info,
        target,
        altText: typeof altText === "function" ? altText() : altText
      });
      notify(onStatus, "ready", "Imagem pronta para publicar.");
      widgetInstance?.__resolve?.({
        upload: result.info,
        mediaAsset,
        target
      });
    } catch (registrationError) {
      const retryContext = {
        upload: result.info,
        target,
        resourceType: "image",
        folder: TARGET_FOLDERS[target],
        fileName: result.info?.original_filename || result.info?.public_id || "",
        fileSize: result.info?.bytes || 0,
        displayName: result.info?.display_name || result.info?.original_filename || "",
        altText: typeof altText === "function" ? altText() : altText,
        assetType: target,
        uploadedBy: (await getSession())?.user?.id || null
      };
      const wrapped = new MediaAssetRegistrationError(
        "Imagem enviada, mas ainda nao registrada no painel.",
        retryContext,
        registrationError
      );
      notify(onStatus, "partial_error", wrapped.message);
      widgetInstance?.__reject?.(wrapped);
    }
  });
}

export async function openCloudinaryUploadWidget({
  target = "media",
  altText = "",
  onStatus
} = {}) {
  assertTarget(target);
  notify(onStatus, "opening_widget", "Abrindo seletor de imagens...");
  await loadCloudinaryUploadWidgetScript();

  if (!widgetInstance || widgetTarget !== target) {
    destroyCloudinaryUploadWidget();
    widgetInstance = createWidget({ target, altText, onStatus });
    widgetTarget = target;
  }

  return new Promise((resolve, reject) => {
    widgetInstance.__resolve = resolve;
    widgetInstance.__reject = reject;
    widgetInstance.open();
  });
}
