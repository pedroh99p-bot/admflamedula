import { listMediaAssetLibrary } from "../services/mediaAssetService.js";
import { uploadSignedMediaAsset } from "../services/cloudinaryService.js";
import { publicationState } from "./publicationState.js";
import { showToast } from "../toast.js";

let libraryItems = [];
let libraryLoading = false;
let libraryPage = 1;
const libraryPageSize = 24;
let libraryHasMore = false;
let searchTimeout = null;
let currentSearch = "";

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
          <h2 id="mediaPickerTitle">Selecionar Imagem</h2>
        </div>
        <button class="icon-button" type="button" id="btnMediaPickerClose" aria-label="Fechar biblioteca">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </header>
      
      <div class="media-picker-toolbar">
        <input type="search" id="mediaPickerSearch" placeholder="Buscar por nome da imagem..." class="search-input">
        <label class="upload-btn">
          <input type="file" id="mediaPickerFileInput" accept="image/jpeg,image/png,image/webp" style="display:none;">
          <span>Fazer Upload</span>
        </label>
      </div>

      <div class="editorial-media-picker-body" id="mediaPickerGridBody"></div>

      <footer class="media-picker-pagination" id="mediaPickerPagination"></footer>
    </section>
  `;
  document.body.appendChild(modal);

  // Eventos de fechar
  document.getElementById("btnMediaPickerClose").addEventListener("click", closeMediaPicker);
  document.getElementById("btnMediaPickerCloseBackdrop").addEventListener("click", closeMediaPicker);
  document.getElementById("mediaPickerFileInput").addEventListener("change", handleDirectUpload);
  document.getElementById("mediaPickerSearch").addEventListener("input", handleSearchInput);
}

export async function openMediaPicker(targetUsage) {
  if (publicationState.role === "viewer") {
    showToast("Leitura apenas. Seu perfil não permite enviar ou selecionar mídias.", "error");
    return;
  }
  ensureMediaPicker();
  const picker = document.getElementById("editorialMediaPicker");
  picker.classList.add("is-open");
  picker.setAttribute("aria-hidden", "false");

  libraryPage = 1;
  currentSearch = "";
  document.getElementById("mediaPickerSearch").value = "";
  await loadLibraryItems(targetUsage);
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
    // Filtragem cliente de busca
    let data = result.data || [];
    if (currentSearch.trim()) {
      const q = currentSearch.toLowerCase();
      data = data.filter(item =>
        String(item.display_name || item.original_filename || "").toLowerCase().includes(q)
      );
    }
    
    // Paginação
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
    grid.innerHTML = `<div class="media-picker-empty">Nenhuma imagem encontrada. Faça um upload acima ou limpe a busca.</div>`;
    return;
  }

  grid.innerHTML = `
    <div class="media-picker-grid">
      ${libraryItems.map(item => {
        const url = item.thumbnail_url || item.card_url || item.delivery_url || item.secure_url || "";
        return `
          <button class="media-picker-card" type="button" data-media-id="${item.id}">
            <div class="media-picker-img-wrapper">
              <img src="${url}" alt="${item.alt_text || item.display_name || ''}" loading="lazy" decoding="async">
            </div>
            <span class="media-picker-card-title">${item.display_name || item.original_filename || 'Imagem'}</span>
            <span class="media-picker-card-meta">${item.format?.toUpperCase()} • ${(item.bytes / 1024 / 1024).toFixed(2)}MB</span>
          </button>
        `;
      }).join("")}
    </div>
  `;

  // Listener para selecionar
  grid.querySelectorAll(".media-picker-card").forEach(card => {
    card.addEventListener("click", () => {
      const mediaId = card.dataset.mediaId;
      const asset = libraryItems.find(item => String(item.id) === String(mediaId));
      if (asset) {
        selectPickedAsset(asset);
      }
    });
  });
}

function selectPickedAsset(asset) {
  publicationState.selectedAsset = asset;
  
  // Atualizar preview no formulário
  const previewImg = document.getElementById("formMediaPreviewImg");
  const previewBox = document.getElementById("formMediaPreviewBox");
  const noMediaBox = document.getElementById("formNoMediaBox");
  const detailsNode = document.getElementById("formMediaDetails");

  if (previewImg && previewBox && noMediaBox) {
    previewImg.src = asset.card_url || asset.webp_url || asset.delivery_url || asset.secure_url || "";
    previewBox.style.display = "flex";
    noMediaBox.style.display = "none";
  }

  if (detailsNode) {
    detailsNode.innerHTML = `
      <strong>${asset.display_name || asset.original_filename}</strong>
      <span>${asset.folder || ""}</span>
      <span>${asset.width}x${asset.height}px</span>
    `;
  }

  closeMediaPicker();
}

function renderPagination(targetUsage) {
  const footer = document.getElementById("mediaPickerPagination");
  if (!footer) return;

  footer.innerHTML = `
    <button class="action-button secondary" id="btnMediaPickerPrev" ${libraryPage === 1 ? 'disabled' : ''}>Anterior</button>
    <span>Página ${libraryPage}</span>
    <button class="action-button secondary" id="btnMediaPickerNext" ${!libraryHasMore ? 'disabled' : ''}>Próxima</button>
  `;

  document.getElementById("btnMediaPickerPrev").addEventListener("click", async () => {
    if (libraryPage > 1) {
      libraryPage--;
      await loadLibraryItems(targetUsage);
    }
  });

  document.getElementById("btnMediaPickerNext").addEventListener("click", async () => {
    if (libraryHasMore) {
      libraryPage++;
      await loadLibraryItems(targetUsage);
    }
  });
}

function handleSearchInput(e) {
  clearTimeout(searchTimeout);
  currentSearch = e.target.value;
  searchTimeout = setTimeout(async () => {
    libraryPage = 1;
    const formType = publicationState.activeType;
    const target = formType === "hero_news" ? "hero" : formType === "actions" ? "actions" : "media";
    await loadLibraryItems(target);
  }, 400);
}

async function handleDirectUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const formType = publicationState.activeType;
  const target = formType === "hero_news" ? "hero" : formType === "actions" ? "actions" : "media";

  const btn = e.target.closest(".upload-btn");
  const span = btn?.querySelector("span");
  if (span) span.textContent = "Enviando...";

  try {
    const result = await uploadSignedMediaAsset({
      file,
      target,
      resourceType: "image",
      displayName: file.name,
      altText: "",
      assetType: formType
    });

    showToast("Upload concluído com sucesso!");
    selectPickedAsset(result.mediaAsset);
  } catch (err) {
    console.error(err);
    showToast(err.message || "Erro durante o upload.", "error");
  } finally {
    if (span) span.textContent = "Fazer Upload";
    e.target.value = "";
  }
}
