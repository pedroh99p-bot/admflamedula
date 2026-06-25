import { listMediaAssetLibrary } from "../services/mediaAssetService.js";
import { uploadSignedMediaAsset, isMediaAssetRegistrationError } from "../services/cloudinaryService.js";
import { showToast } from "../toast.js";
import {
  applySelectedPublicationAsset,
  getAssetThumbnailUrl,
  getPublicationTarget,
  isPublicationUploadBusy,
  setPublicationUploadStatus,
  showPendingMediaRegistration,
  syncPublicationUploadControls
} from "./publicationMedia.js";
import { publicationState } from "./publicationState.js";

let libraryItems = [];
let libraryLoading = false;
let libraryPage = 1;
const libraryPageSize = 24;
let libraryHasMore = false;
let searchTimeout = null;
let currentSearch = "";
let currentTargetUsage = "media";

export function ensureMediaPicker() {
  if (document.getElementById("editorialMediaPicker")) return;

  const modal = document.createElement("div");
  modal.id = "editorialMediaPicker";
  modal.className = "editorial-media-picker";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="editorial-media-picker-backdrop" id="btnMediaPickerCloseBackdrop"></div>
    <section class="editorial-media-picker-panel" role="dialog" aria-modal="true" aria-labelledby="mediaPickerTitle">
      <header class="editorial-media-picker-header">
        <div>
          <p class="eyebrow">Biblioteca Cloudinary</p>
          <h2 id="mediaPickerTitle">Selecionar imagem</h2>
        </div>
        <button class="icon-button" type="button" id="btnMediaPickerClose" aria-label="Fechar biblioteca">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </header>

      <div class="media-picker-toolbar">
        <input type="search" id="mediaPickerSearch" placeholder="Buscar por nome da imagem..." class="search-input">
        <label class="upload-btn" id="mediaPickerLegacyUploadLabel" hidden>
          <input type="file" id="mediaPickerFileInput" accept="image/jpeg,image/png,image/webp" style="display:none;">
          <span>Fazer upload</span>
        </label>
      </div>

      <div class="editorial-media-picker-body" id="mediaPickerGridBody"></div>
      <footer class="media-picker-pagination" id="mediaPickerPagination"></footer>
    </section>
  `;
  document.body.appendChild(modal);

  document.getElementById("btnMediaPickerClose").addEventListener("click", closeMediaPicker);
  document.getElementById("btnMediaPickerCloseBackdrop").addEventListener("click", closeMediaPicker);
  document.getElementById("mediaPickerFileInput").addEventListener("change", handleDirectUpload);
  document.getElementById("mediaPickerSearch").addEventListener("input", handleSearchInput);
  syncLegacyUploadVisibility();
}

export async function openMediaPicker(targetUsage) {
  if (publicationState.role === "viewer") {
    showToast("Leitura apenas. Seu perfil nao permite enviar ou selecionar midias.", "error");
    return;
  }
  if (isPublicationUploadBusy()) return;

  ensureMediaPicker();
  currentTargetUsage = targetUsage || getPublicationTarget();
  const picker = document.getElementById("editorialMediaPicker");
  picker.classList.add("is-open");
  picker.setAttribute("aria-hidden", "false");

  libraryPage = 1;
  currentSearch = "";
  document.getElementById("mediaPickerSearch").value = "";
  syncLegacyUploadVisibility();
  await loadLibraryItems(currentTargetUsage);
}

function syncLegacyUploadVisibility() {
  const legacyUploadLabel = document.getElementById("mediaPickerLegacyUploadLabel");
  if (legacyUploadLabel) {
    legacyUploadLabel.hidden = window.FLAMEDULA_CONFIG?.ENABLE_LEGACY_DIRECT_UPLOAD !== true;
  }
}

export function closeMediaPicker() {
  const picker = document.getElementById("editorialMediaPicker");
  if (picker) {
    picker.classList.remove("is-open");
    picker.setAttribute("aria-hidden", "true");
  }
}

async function loadLibraryItems(targetUsage) {
  libraryLoading = true;
  renderGrid();

  const result = await listMediaAssetLibrary({ assetUsage: targetUsage });
  libraryLoading = false;

  if (result.error) {
    showToast(result.error.message, "error");
    libraryItems = [];
  } else {
    let data = result.data || [];
    if (currentSearch.trim()) {
      const query = currentSearch.toLowerCase();
      data = data.filter((item) =>
        String(item.display_name || item.original_filename || "").toLowerCase().includes(query)
      );
    }

    const start = (libraryPage - 1) * libraryPageSize;
    libraryItems = data.slice(start, start + libraryPageSize);
    libraryHasMore = data.length > start + libraryPageSize;
  }

  renderGrid();
  renderPagination(targetUsage);
}

function renderGrid() {
  const grid = document.getElementById("mediaPickerGridBody");
  if (!grid) return;

  if (libraryLoading) {
    grid.innerHTML = `<div class="media-picker-loading">Carregando imagens...</div>`;
    return;
  }

  if (!libraryItems.length) {
    grid.innerHTML = `<div class="media-picker-empty">Nenhuma imagem encontrada. Faca um upload acima ou limpe a busca.</div>`;
    return;
  }

  grid.innerHTML = `
    <div class="media-picker-grid">
      ${libraryItems.map(renderMediaCard).join("")}
    </div>
  `;

  grid.querySelectorAll(".media-picker-card").forEach((card) => {
    card.addEventListener("click", () => {
      const mediaId = card.dataset.mediaId;
      const asset = libraryItems.find((item) => String(item.id) === String(mediaId));
      if (asset) {
        applySelectedPublicationAsset(asset);
        closeMediaPicker();
      }
    });
  });
}

function renderMediaCard(item) {
  const url = getAssetThumbnailUrl(item);
  return `
    <button class="media-picker-card" type="button" data-media-id="${escapeHtml(item.id)}">
      <div class="media-picker-img-wrapper">
        ${url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(item.alt_text || item.display_name || "")}" loading="lazy" decoding="async">` : ""}
      </div>
      <span class="media-picker-card-title">${escapeHtml(item.display_name || item.original_filename || "Imagem")}</span>
      <span class="media-picker-card-meta">${escapeHtml(formatMediaMeta(item))}</span>
    </button>
  `;
}

function renderPagination(targetUsage) {
  const footer = document.getElementById("mediaPickerPagination");
  if (!footer) return;

  footer.innerHTML = `
    <button class="action-button secondary" id="btnMediaPickerPrev" ${libraryPage === 1 ? "disabled" : ""}>Anterior</button>
    <span>Pagina ${libraryPage}</span>
    <button class="action-button secondary" id="btnMediaPickerNext" ${!libraryHasMore ? "disabled" : ""}>Proxima</button>
  `;

  document.getElementById("btnMediaPickerPrev").addEventListener("click", async () => {
    if (libraryPage > 1) {
      libraryPage -= 1;
      await loadLibraryItems(targetUsage);
    }
  });

  document.getElementById("btnMediaPickerNext").addEventListener("click", async () => {
    if (libraryHasMore) {
      libraryPage += 1;
      await loadLibraryItems(targetUsage);
    }
  });
}

function handleSearchInput(event) {
  clearTimeout(searchTimeout);
  currentSearch = event.target.value;
  searchTimeout = setTimeout(async () => {
    libraryPage = 1;
    await loadLibraryItems(currentTargetUsage);
  }, 400);
}

async function handleDirectUpload(event) {
  const file = event.target.files?.[0];
  if (!file || isPublicationUploadBusy()) return;

  const formType = publicationState.activeType;
  const target = getPublicationTarget(formType);
  const span = event.target.closest(".upload-btn")?.querySelector("span");
  if (span) span.textContent = "Enviando...";

  try {
    const result = await uploadSignedMediaAsset({
      file,
      target,
      resourceType: "image",
      displayName: file.name,
      altText: document.getElementById("pub_image_alt")?.value || "",
      assetType: formType,
      onProgress: (status) => setPublicationUploadStatus(status)
    });

    applySelectedPublicationAsset(result.mediaAsset);
    closeMediaPicker();
    showToast("Upload concluido com sucesso!");
  } catch (error) {
    console.error("[PublicationMediaPickerUpload]", {
      status: error?.name || "error",
      message: error?.message || "upload_failed"
    });
    if (isMediaAssetRegistrationError(error)) {
      showPendingMediaRegistration(error.retryContext, error.message);
      closeMediaPicker();
      showToast(error.message, "error");
    } else {
      setPublicationUploadStatus("error", error.message || "Erro durante o upload.");
      showToast(error.message || "Erro durante o upload.", "error");
    }
  } finally {
    if (span) span.textContent = "Fazer upload";
    syncPublicationUploadControls();
    event.target.value = "";
  }
}

function formatMediaMeta(item) {
  const format = item.format ? String(item.format).toUpperCase() : "";
  const size = Number(item.bytes || 0);
  const sizeText = size ? `${(size / 1024 / 1024).toFixed(2)}MB` : "";
  return [format, sizeText].filter(Boolean).join(" | ");
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}
