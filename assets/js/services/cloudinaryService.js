import { getSession } from "./authService.js";
import { createMediaAsset } from "./mediaAssetService.js";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const ALLOWED_TARGETS = new Set(["hero", "actions", "media", "team", "testimonials", "branding"]);
const IMAGE_TYPES = {
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "image/png": new Set(["png"]),
  "image/webp": new Set(["webp"])
};
const VIDEO_TYPES = {
  "video/mp4": new Set(["mp4"]),
  "video/webm": new Set(["webm"])
};

export class MediaAssetRegistrationError extends Error {
  constructor(message, retryContext, cause) {
    super(message);
    this.name = "MediaAssetRegistrationError";
    this.retryContext = retryContext;
    this.cause = cause;
  }
}

export function isMediaAssetRegistrationError(error) {
  return error?.name === "MediaAssetRegistrationError";
}

function notifyProgress(callback, status) {
  if (typeof callback === "function") callback(status);
}

function validateUploadTarget(target) {
  if (!ALLOWED_TARGETS.has(target)) {
    throw new Error("Destino de upload invalido.");
  }
}

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

export async function requestCloudinarySignature({ target, resourceType, onProgress } = {}) {
  validateUploadTarget(target);
  notifyProgress(onProgress, "signing");
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
    body: JSON.stringify({ target, resourceType })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[Cloudinary:signing]", {
      status: response.status,
      message: body.error || "signature_failed"
    });
    if (response.status === 401) throw new Error("Sessao expirada ao gerar assinatura.");
    if (response.status === 403) throw new Error("Sem permissao para enviar midias.");
    throw new Error(body.error || "Falha ao gerar assinatura Cloudinary.");
  }

  if (body.target && body.target !== target) {
    throw new Error("Assinatura retornou destino diferente do solicitado.");
  }
  if (body.resourceType !== resourceType) {
    throw new Error("Assinatura retornou tipo de recurso diferente do solicitado.");
  }
  validateUploadTarget(body.target || target);
  if (!body.cloudName || !body.apiKey || !body.timestamp || !body.signature || !body.folder) {
    throw new Error("Assinatura Cloudinary incompleta.");
  }

  return body;
}

export async function uploadToCloudinary(file, signaturePayload, onProgress) {
  notifyProgress(onProgress, "uploading");
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
    console.error("[Cloudinary:uploading]", {
      status: response.status,
      message: body.error?.message || "upload_failed"
    });
    throw new Error(body.error?.message || "Erro Cloudinary durante upload.");
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

export async function registerUploadedMediaAsset({
  upload,
  target = "media",
  resourceType = "image",
  folder = "",
  fileName = "",
  fileSize = 0,
  displayName = "",
  altText = "",
  assetType = "",
  uploadedBy = null,
  onProgress
}) {
  validateUploadTarget(target);
  notifyProgress(onProgress, "saving_asset");
  if (!upload?.public_id || !upload?.secure_url) {
    throw new Error("Resposta Cloudinary sem identificador de midia.");
  }

  const optimizedFields = getOptimizedUploadFields(upload, { resourceType }, resourceType);
  const originalExtension = getFileExtension(upload.original_filename || fileName);

  const payload = {
    cloudinary_public_id: upload.public_id,
    secure_url: upload.secure_url,
    resource_type: resourceType,
    asset_type: assetType || target,
    asset_usage: target,
    folder,
    original_filename: upload.original_filename || fileName,
    display_name: displayName || upload.original_filename || fileName,
    alt_text: altText,
    format: upload.format,
    width: upload.width || null,
    height: upload.height || null,
    duration: upload.duration || null,
    bytes: upload.bytes || fileSize,
    version: upload.version || null,
    uploaded_by: uploadedBy,
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
      target
    }
  };

  const mediaAsset = await createMediaAsset(payload);
  if (!mediaAsset?.id) {
    throw new Error("media_assets nao retornou id do asset.");
  }
  return mediaAsset;
}

export async function uploadSignedMediaAsset({
  file,
  target = "media",
  resourceType = "image",
  displayName = "",
  altText = "",
  assetType = "",
  onProgress
}) {
  notifyProgress(onProgress, "validating");
  validateUploadTarget(target);
  validateUploadFile(file, resourceType);
  const session = await getSession();
  const signature = await requestCloudinarySignature({ target, resourceType, onProgress });
  const upload = await uploadToCloudinary(file, signature, onProgress);
  const registrationContext = {
    upload,
    target: signature.target || target,
    resourceType: signature.resourceType || resourceType,
    folder: signature.folder,
    fileName: file.name,
    fileSize: file.size,
    displayName,
    altText,
    assetType,
    uploadedBy: session?.user?.id || null
  };

  let mediaAsset;
  try {
    mediaAsset = await registerUploadedMediaAsset({
      ...registrationContext,
      onProgress
    });
  } catch (error) {
    console.error("[Cloudinary:saving_asset]", {
      status: error?.status || error?.code || "failed",
      message: error?.message || "media_asset_registration_failed"
    });
    throw new MediaAssetRegistrationError(
      "A imagem foi enviada, mas nao foi registrada no painel.",
      registrationContext,
      error
    );
  }

  notifyProgress(onProgress, "ready");
  return { upload, mediaAsset, signature };
}
