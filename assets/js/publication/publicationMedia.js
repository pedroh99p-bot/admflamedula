import { publicationState } from "./publicationState.js";

const TYPE_TO_TARGET = {
  hero_news: "hero",
  actions: "actions",
  media_items: "media"
};

const BUSY_UPLOAD_STATES = new Set([
  "validating",
  "signing",
  "opening_widget",
  "uploading",
  "processing",
  "registering",
  "saving_asset"
]);

const UPLOAD_MESSAGES = {
  idle: "",
  validating: "Validando imagem...",
  signing: "Gerando assinatura segura...",
  opening_widget: "Abrindo seletor de imagens...",
  uploading: "Enviando imagem...",
  processing: "Processando imagem...",
  registering: "Registrando no painel...",
  saving_asset: "Registrando no painel...",
  ready: "Imagem pronta para publicar.",
  partial_error: "Imagem enviada, mas ainda nao registrada.",
  error: "Nao foi possivel enviar a imagem."
};

const SAVE_MESSAGES = {
  idle: "",
  validating: "Validando campos...",
  saving: "Salvando no Supabase...",
  saved: "Alteracoes salvas.",
  error: "Nao foi possivel salvar. Seus dados continuam aqui."
};

export function getPublicationTarget(type = publicationState.activeType) {
  const target = TYPE_TO_TARGET[type];
  if (!target) throw new Error("Destino de upload invalido.");
  return target;
}

export function getPreferredAssetUrl(asset = {}) {
  asset = asset || {};
  return asset.card_url
    || asset.webp_url
    || asset.preferred_delivery_url
    || asset.delivery_url
    || asset.secure_url
    || asset.image_url
    || asset.thumbnail_url
    || "";
}

export function getAssetThumbnailUrl(asset = {}) {
  asset = asset || {};
  return asset.thumbnail_url
    || asset.card_url
    || asset.webp_url
    || asset.delivery_url
    || asset.secure_url
    || asset.image_url
    || "";
}

export function isPublicationUploadBusy() {
  return BUSY_UPLOAD_STATES.has(publicationState.uploadStatus);
}

export function setPublicationUploadStatus(status, message = "") {
  publicationState.uploadStatus = status;
  publicationState.uploadMessage = message || UPLOAD_MESSAGES[status] || "";
  publicationState.uploadError = status === "error" || status === "partial_error"
    ? publicationState.uploadMessage
    : "";
  syncPublicationUploadControls();
}

export function setPublicationSaveStatus(status, message = "") {
  publicationState.saveStatus = status;
  publicationState.saveMessage = message || SAVE_MESSAGES[status] || "";
  if (status === "saved") publicationState.lastSavedAt = new Date();
  syncPublicationUploadControls();
}

export function syncPublicationUploadControls() {
  const busy = isPublicationUploadBusy();
  const isViewer = publicationState.role === "viewer";
  const draftButton = document.getElementById("btnSaveDraft");
  const publishButton = document.getElementById("btnSavePublish");
  const fileInput = document.getElementById("formDirectFileInput");
  const widgetButton = document.getElementById("btnOpenCloudinaryWidget");
  const widgetButtonLabel = document.getElementById("btnOpenCloudinaryWidgetLabel");
  const pickerButton = document.getElementById("btnOpenMediaPicker");
  const removeButton = document.getElementById("btnRemoveMediaAsset");
  const retryButton = document.getElementById("btnRetryMediaRegistration");
  const legacyLabel = document.getElementById("legacyDirectUploadLabel");
  const blockedByPendingRegistration = Boolean(publicationState.pendingMediaRegistration);

  if (draftButton) draftButton.disabled = isViewer || busy || blockedByPendingRegistration || publicationState.saving;
  if (publishButton) publishButton.disabled = isViewer || busy || blockedByPendingRegistration || publicationState.saving;
  if (fileInput) fileInput.disabled = isViewer || busy;
  if (widgetButton) widgetButton.disabled = isViewer || busy;
  if (pickerButton) pickerButton.disabled = isViewer || busy;
  if (removeButton) removeButton.disabled = isViewer || busy;
  if (legacyLabel) {
    legacyLabel.hidden = window.FLAMEDULA_CONFIG?.ENABLE_LEGACY_DIRECT_UPLOAD !== true;
  }
  if (widgetButtonLabel) {
    widgetButtonLabel.textContent = publicationState.selectedAsset ? "Trocar imagem" : "Selecionar imagem";
  }
  if (retryButton) {
    retryButton.disabled = isViewer || busy || !publicationState.pendingMediaRegistration;
    retryButton.hidden = !publicationState.pendingMediaRegistration;
  }
  syncPublicationUploadFeedback();
  syncPublicationSaveFeedback();
}

export function clearSelectedPublicationAsset() {
  publicationState.selectedAsset = null;
  publicationState.pendingMediaRegistration = null;
  setPublicationUploadStatus("idle");

  const previewImg = document.getElementById("formMediaPreviewImg");
  const previewBox = document.getElementById("formMediaPreviewBox");
  const noMediaBox = document.getElementById("formNoMediaBox");
  const detailsNode = document.getElementById("formMediaDetails");

  if (previewImg) previewImg.src = "";
  if (previewBox) previewBox.style.display = "none";
  if (noMediaBox) noMediaBox.style.display = "flex";
  if (detailsNode) detailsNode.innerHTML = "";
}

export function applySelectedPublicationAsset(asset) {
  if (!asset?.id) {
    throw new Error("Asset de midia sem identificador.");
  }

  publicationState.selectedAsset = asset;
  publicationState.pendingMediaRegistration = null;
  updatePublicationPreview(asset);
  setPublicationUploadStatus("ready");
}

export function updatePublicationPreview(asset) {
  const previewImg = document.getElementById("formMediaPreviewImg");
  const previewBox = document.getElementById("formMediaPreviewBox");
  const noMediaBox = document.getElementById("formNoMediaBox");
  const detailsNode = document.getElementById("formMediaDetails");
  const url = getPreferredAssetUrl(asset);

  if (previewImg && previewBox && noMediaBox) {
    previewImg.src = url;
    previewBox.style.display = url ? "flex" : "none";
    noMediaBox.style.display = url ? "none" : "flex";
  }

  if (detailsNode) {
    detailsNode.innerHTML = `
      <strong>${escapeHtml(asset.display_name || asset.original_filename || asset.cloudinary_public_id || "Imagem")}</strong>
      <span>${escapeHtml(asset.folder || "")}</span>
      <span>${escapeHtml(formatAssetMeta(asset))}</span>
    `;
  }
}

export function showPendingMediaRegistration(context, message) {
  publicationState.pendingMediaRegistration = context || null;
  publicationState.selectedAsset = null;
  setPublicationUploadStatus("partial_error", message);

  const detailsNode = document.getElementById("formMediaDetails");
  const previewBox = document.getElementById("formMediaPreviewBox");
  const noMediaBox = document.getElementById("formNoMediaBox");
  const previewImg = document.getElementById("formMediaPreviewImg");
  const url = context?.upload?.secure_url || "";

  if (previewImg && previewBox && noMediaBox && url) {
    previewImg.src = url;
    previewBox.style.display = "flex";
    noMediaBox.style.display = "none";
  }

  if (detailsNode) {
    detailsNode.innerHTML = `
      <strong>Imagem enviada ao Cloudinary</strong>
      <span>${escapeHtml(context?.upload?.public_id || "")}</span>
      <span class="media-error-text">${escapeHtml(message)}</span>
    `;
  }

  syncPublicationUploadControls();
}

export function applyAssetToPayload(payload, asset, activeType) {
  if (!asset) return payload;
  payload.image_asset_id = asset.id;
  payload.image_url = getPreferredAssetUrl(asset) || null;
  payload.cloudinary_public_id = asset.cloudinary_public_id || null;
  if (activeType === "media_items") {
    payload.thumbnail_url = getAssetThumbnailUrl(asset) || null;
  }
  return payload;
}

export function syncPublicationUploadFeedback() {
  const feedback = document.getElementById("publicationUploadFeedback");
  if (!feedback) return;

  const status = publicationState.uploadStatus || "idle";
  const message = publicationState.uploadMessage || UPLOAD_MESSAGES[status] || "";
  feedback.className = `publication-inline-status upload-status-${status}`;
  feedback.hidden = !message;
  feedback.innerHTML = message
    ? `${renderStatusIcon(status)}<span>${escapeHtml(message)}</span>`
    : "";
}

export function syncPublicationSaveFeedback() {
  const feedback = document.getElementById("publicationSaveFeedback");
  if (!feedback) return;

  const status = publicationState.saveStatus || "idle";
  let message = publicationState.saveMessage || SAVE_MESSAGES[status] || "";
  if (status === "saved" && publicationState.lastSavedAt) {
    const time = publicationState.lastSavedAt.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
    message = `${message} as ${time}`;
  }

  feedback.className = `publication-inline-status save-status-${status}`;
  feedback.hidden = !message;
  feedback.innerHTML = message
    ? `${renderStatusIcon(status)}<span>${escapeHtml(message)}</span>`
    : "";
}

export function normalizeYouTubeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    let id = "";

    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
      else if (url.pathname.startsWith("/shorts/")) id = url.pathname.split("/").filter(Boolean)[1] || "";
      else if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/").filter(Boolean)[1] || "";
    }

    if (!id) return null;
    return {
      id,
      canonicalUrl: `https://www.youtube.com/watch?v=${id}`
    };
  } catch {
    return null;
  }
}

export function normalizeMediaItemPayload(payload) {
  const youtube = normalizeYouTubeUrl(payload.url);
  if (!youtube) return payload;
  return {
    ...payload,
    type: "youtube",
    url: youtube.canonicalUrl,
    youtube_id: youtube.id
  };
}

function formatAssetMeta(asset) {
  asset = asset || {};
  const size = asset.width && asset.height ? `${asset.width}x${asset.height}px` : "";
  const status = asset.optimization_status || "";
  return [size, status].filter(Boolean).join(" | ");
}

function renderStatusIcon(status) {
  if (status === "ready" || status === "saved") {
    return `<span class="status-dot success" aria-hidden="true"></span>`;
  }
  if (status === "error" || status === "partial_error") {
    return `<span class="status-dot error" aria-hidden="true"></span>`;
  }
  if (BUSY_UPLOAD_STATES.has(status) || status === "saving" || status === "processing" || status === "registering") {
    return `<span class="status-spinner" aria-hidden="true"></span>`;
  }
  return `<span class="status-dot neutral" aria-hidden="true"></span>`;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}
