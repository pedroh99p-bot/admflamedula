import { getSession } from "./authService.js";
import { createMediaAsset } from "./mediaAssetService.js";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

function getFunctionUrl() {
  const { SUPABASE_URL } = window.FLAMEDULA_CONFIG || {};
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL nao configurada para chamar Edge Function.");
  }
  return `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/generate-cloudinary-signature`;
}

export function validateUploadFile(file, resourceType) {
  if (!file) throw new Error("Selecione um arquivo.");

  if (resourceType === "image") {
    if (!IMAGE_TYPES.has(file.type)) throw new Error("Imagem deve ser JPG, PNG ou WebP.");
    if (file.size > MAX_IMAGE_BYTES) throw new Error("Imagem acima do limite de 8MB.");
  }

  if (resourceType === "video") {
    if (!VIDEO_TYPES.has(file.type)) throw new Error("Video deve ser MP4 ou WebM.");
    if (file.size > MAX_VIDEO_BYTES) throw new Error("Video acima do limite de 80MB.");
  }
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

  const mediaAsset = await createMediaAsset({
    cloudinary_public_id: upload.public_id,
    secure_url: upload.secure_url,
    resource_type: signature.resourceType,
    asset_type: assetType || target,
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
    metadata: {
      cloudinary_asset_id: upload.asset_id,
      signature_created_at: new Date().toISOString()
    }
  });

  return { upload, mediaAsset, signature };
}
