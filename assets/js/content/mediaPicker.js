import { listMediaAssetLibrary } from "../services/mediaAssetService.js";
import { contentState } from "./contentState.js";
import { escapeHtml, getPreferredImageUrl } from "./contentUtils.js";

let mediaItems = [];
let mediaLoading = false;
let mediaError = "";

export async function openMediaPicker(assetUsage) {
  ensureMediaPicker();
  const modal = document.getElementById("contentMediaPicker");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  await loadMedia(assetUsage);
}

export function closeMediaPicker() {
  const modal = document.getElementById("contentMediaPicker");
  modal?.classList.remove("is-open");
  modal?.setAttribute("aria-hidden", "true");
}

export function getMediaAssetById(id) {
  return mediaItems.find((item) => String(item.id) === String(id));
}

async function loadMedia(assetUsage) {
  mediaLoading = true;
  mediaError = "";
  renderMediaPicker(assetUsage);
  const result = await listMediaAssetLibrary({ assetUsage });
  mediaLoading = false;
  if (result.error) {
    mediaError = result.error.message;
    mediaItems = [];
  } else {
    mediaItems = result.data || [];
  }
  renderMediaPicker(assetUsage);
}

function ensureMediaPicker() {
  if (document.getElementById("contentMediaPicker")) return;
  const modal = document.createElement("div");
  modal.id = "contentMediaPicker";
  modal.className = "content-media-picker";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="content-media-picker-backdrop" data-content-action="close-media-picker"></div>
    <section class="content-media-picker-panel" role="dialog" aria-modal="true" aria-labelledby="contentMediaPickerTitle">
      <header class="content-editor-header">
        <div>
          <p class="eyebrow">Biblioteca</p>
          <h2 id="contentMediaPickerTitle">Escolher imagem</h2>
        </div>
        <button class="icon-button" type="button" data-content-action="close-media-picker" aria-label="Fechar biblioteca">
          <i data-lucide="x"></i>
        </button>
      </header>
      <div class="content-media-picker-body" id="contentMediaPickerBody"></div>
    </section>
  `;
  document.body.appendChild(modal);
}

function renderMediaPicker(assetUsage) {
  const body = document.getElementById("contentMediaPickerBody");
  if (!body) return;

  if (mediaLoading) {
    body.innerHTML = `<div class="content-empty-state">Carregando biblioteca...</div>`;
    return;
  }

  if (mediaError) {
    body.innerHTML = `
      <div class="content-empty-state">
        ${escapeHtml(mediaError)}
        <button class="action-button secondary" type="button" data-content-action="reload-media-picker" data-asset-usage="${escapeHtml(assetUsage || "")}">Tentar novamente</button>
      </div>
    `;
    return;
  }

  body.innerHTML = mediaItems.length
    ? `<div class="content-media-grid">${mediaItems.map(renderMediaItem).join("")}</div>`
    : `<div class="content-empty-state">Nenhuma imagem encontrada para este tipo.</div>`;

  if (typeof lucide !== "undefined") lucide.createIcons();
}

function renderMediaItem(item) {
  const url = item.thumbnail_url || item.card_url || item.delivery_url || item.secure_url || "";
  return `
    <button class="content-media-option" type="button" data-content-action="select-media" data-media-id="${escapeHtml(item.id)}">
      ${url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(item.alt_text || item.display_name || "")}">` : ""}
      <strong>${escapeHtml(item.display_name || item.original_filename || item.cloudinary_public_id)}</strong>
      <span>${escapeHtml(item.folder || "")}</span>
      <small>${escapeHtml(item.optimization_status || "")}</small>
    </button>
  `;
}

export function normalizePickedAsset(item) {
  if (!item) return null;
  return {
    ...item,
    preview_url: getPreferredImageUrl(item)
  };
}
