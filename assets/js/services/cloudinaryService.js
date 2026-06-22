import { getSession } from "./authService.js";
import { createMediaAsset } from "./mediaAssetService.js";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const IMAGE_TYPES = {
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "image/png": new Set(["png"]),
  "image/webp": new Set(["webp"])
};
const VIDEO_TYPES = {
  "video/mp4": new Set(["mp4"]),
  "video/webm": new Set(["webm"])
};

function getFunctionUrl() {
  const { SUPABASE_URL } = window.FLAMEDULA_CONFIG || {};
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL nao configurada para chamar Edge Function.");
  }
  return `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/generate-cloudinary-signature`;
}

export function validateUploadFile(file, resourceType) {
  if (!file) throw new Error("Selecione um arquivo.");
  if (!file.size) throw new Error("Arquivo vazio nao pode ser enviado.");

  const extension = getFileExtension(file.name);

  if (resourceType === "image") {
    if (!IMAGE_TYPES[file.type]) throw new Error("Imagem deve ser JPG, PNG ou WebP.");
    if (!IMAGE_TYPES[file.type].has(extension)) throw new Error("Extensao do arquivo nao corresponde ao tipo da imagem.");
    if (file.size > MAX_IMAGE_BYTES) throw new Error("Imagem acima do limite de 12MB.");
  }

  if (resourceType === "video") {
    if (!VIDEO_TYPES[file.type]) throw new Error("Video deve ser MP4 ou WebM.");
    if (!VIDEO_TYPES[file.type].has(extension)) throw new Error("Extensao do arquivo nao corresponde ao tipo do video.");
    if (file.size > MAX_VIDEO_BYTES) throw new Error("Video acima do limite de 80MB.");
    return;
  }

  if (resourceType !== "image") {
    throw new Error("Tipo de recurso invalido para upload.");
  }
}

function getFileExtension(filename) {
  return String(filename || "").split(".").pop()?.toLowerCase() || "";
}

export async function requestCloudinarySignature({ target, resourceType }) {
  const session = await getSession();
  if (!session?.access_token) {
    throw new Error("Sessao administrativa ausente.");
  }

  const response = await fetch(getFunctionUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ target, resourceType })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Nao foi possivel gerar assinatura Cloudinary.");
  }

  return body;
}

export async function uploadToCloudinary(file, signaturePayload) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signaturePayload.apiKey);
  formData.append("timestamp", String(signaturePayload.timestamp));
  formData.append("signature", signaturePayload.signature);
  formData.append("folder", signaturePayload.folder);
  if (signaturePayload.uploadPreset) {
    formData.append("upload_preset", signaturePayload.uploadPreset);
  }
  if (signaturePayload.eager) {
    formData.append("eager", signaturePayload.eager);
    formData.append("eager_async", String(signaturePayload.eagerAsync));
  }

  const url = `https://api.cloudinary.com/v1_1/${signaturePayload.cloudName}/${signaturePayload.resourceType}/upload`;
  const response = await fetch(url, {
    method: "POST",
    body: formData
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error?.message || "Upload Cloudinary falhou.");
  }

  return body;
}

function getEagerUrl(upload, index) {
  return upload.eager?.[index]?.secure_url || null;
}

function buildTransformedUrl(secureUrl, transformation) {
  if (!secureUrl || !transformation) return null;
  return secureUrl.replace("/upload/", `/upload/${transformation}/`);
}

function getOptimizedUploadFields(upload, signature, resourceType) {
  if (resourceType === "video") {
    return {
      delivery_url: upload.secure_url,
      webp_url: null,
      card_url: upload.thumbnail_url || null,
      thumbnail_url: upload.thumbnail_url || null,
      transformation_profile: "video_original",
      optimization_status: "not_applicable",
      optimized_at: null,
      eager_count: upload.eager?.length || 0
    };
  }

  const webpUrl = getEagerUrl(upload, 0);
  const cardUrl = getEagerUrl(upload, 1);
  const thumbnailUrl = getEagerUrl(upload, 2);
  const ready = Boolean(webpUrl && cardUrl && thumbnailUrl);

  return {
    delivery_url: buildTransformedUrl(upload.secure_url, "f_auto,q_auto,dpr_auto"),
    webp_url: webpUrl,
    card_url: cardUrl,
    thumbnail_url: thumbnailUrl,
    transformation_profile: "standard_image",
    optimization_status: ready ? "ready" : "pending",
    optimized_at: ready ? new Date().toISOString() : null,
    eager_count: upload.eager?.length || 0
  };
}

export function getMediaAssetPreviewUrl(asset) {
  return asset?.card_url
    || asset?.webp_url
    || asset?.delivery_url
    || asset?.secure_url
    || "";
}

export function getMediaAssetThumbnailUrl(asset) {
  return asset?.thumbnail_url
    || asset?.card_url
    || asset?.delivery_url
    || asset?.secure_url
    || "";
}

export async function uploadSignedMediaAsset({
  file,
  target = "media",
  resourceType = "image",
  displayName = "",
  altText = "",
  assetType = ""
}) {
  validateUploadFile(file, resourceType);
  const session = await getSession();
  const signature = await requestCloudinarySignature({ target, resourceType });
  const upload = await uploadToCloudinary(file, signature);
  const optimizedFields = getOptimizedUploadFields(upload, signature, resourceType);
  const originalExtension = getFileExtension(upload.original_filename || file.name);

  const mediaAsset = await createMediaAsset({
    cloudinary_public_id: upload.public_id,
    secure_url: upload.secure_url,
    resource_type: signature.resourceType,
    asset_type: assetType || target,
    asset_usage: target,
    folder: signature.folder,
    original_filename: upload.original_filename || file.name,
    display_name: displayName || upload.original_filename || file.name,
    alt_text: altText,
    format: upload.format,
    width: upload.width || null,
    height: upload.height || null,
    duration: upload.duration || null,
    bytes: upload.bytes || file.size,
    version: upload.version || null,
    uploaded_by: session?.user?.id || null,
    delivery_url: optimizedFields.delivery_url,
    webp_url: optimizedFields.webp_url,
    card_url: optimizedFields.card_url,
    thumbnail_url: optimizedFields.thumbnail_url,
    transformation_profile: optimizedFields.transformation_profile,
    optimization_status: optimizedFields.optimization_status,
    optimized_at: optimizedFields.optimized_at,
    metadata: {
      cloudinary_asset_id: upload.asset_id,
      etag: upload.etag,
      original_extension: originalExtension,
      eager_count: optimizedFields.eager_count,
      upload_source: "adm",
      target: signature.target || target
    }
  });

  return { upload, mediaAsset, signature };
}
