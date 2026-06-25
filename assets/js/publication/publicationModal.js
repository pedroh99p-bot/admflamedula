import { publicationState } from "./publicationState.js";
import { openMediaPicker } from "./mediaPicker.js";
import { showToast } from "../toast.js";
import {
  applySelectedPublicationAsset,
  clearSelectedPublicationAsset,
  getPublicationTarget,
  isPublicationUploadBusy,
  setPublicationUploadStatus,
  showPendingMediaRegistration,
  syncPublicationUploadControls
} from "./publicationMedia.js";
import {
  isMediaAssetRegistrationError,
  registerUploadedMediaAsset,
  uploadSignedMediaAsset
} from "../services/cloudinaryService.js";

export function ensurePublicationModal() {
  let modal = document.getElementById("editorialModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "editorialModal";
  modal.className = "editorial-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="editorial-modal-backdrop" id="btnEditorialModalCloseBackdrop"></div>
    <section class="editorial-modal-panel" role="dialog" aria-modal="true" aria-labelledby="editorialModalTitle">
      <header class="editorial-modal-header">
        <div>
          <p class="eyebrow" id="editorialModalKicker">Publicacao</p>
          <h2 id="editorialModalTitle">Novo registro</h2>
        </div>
        <button class="icon-button" type="button" id="btnEditorialModalClose" aria-label="Fechar editor">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </header>
      <form id="editorialModalForm" novalidate>
        <div class="editorial-modal-body" id="editorialModalBody"></div>
        <footer class="editorial-modal-footer">
          <button class="action-button ghost" type="button" id="btnEditorialModalCancel">Cancelar</button>
          <div class="footer-actions">
            <button class="action-button secondary" type="submit" id="btnSaveDraft">Salvar rascunho</button>
            <button class="action-button primary" type="submit" id="btnSavePublish">Salvar e publicar</button>
          </div>
        </footer>
      </form>
    </section>
  `;
  document.body.appendChild(modal);

  document.getElementById("btnEditorialModalClose").addEventListener("click", closePublicationModal);
  document.getElementById("btnEditorialModalCloseBackdrop").addEventListener("click", closePublicationModal);
  document.getElementById("btnEditorialModalCancel").addEventListener("click", closePublicationModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && publicationState.editorOpen) {
      closePublicationModal();
    }
  });

  return modal;
}

export function openPublicationModal({ title, kicker, bodyMarkup }) {
  ensurePublicationModal();
  const modal = document.getElementById("editorialModal");

  document.getElementById("editorialModalTitle").textContent = title;
  document.getElementById("editorialModalKicker").textContent = kicker;
  document.getElementById("editorialModalBody").innerHTML = bodyMarkup;

  import("./publicationRouter.js")
    .then((mod) => mod.bindFormSubmitEvent())
    .catch((error) => console.error("[PublicationModal:submit_bind]", { message: error?.message || "bind_failed" }));

  bindMediaControls();

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  publicationState.editorOpen = true;
  syncPublicationUploadControls();
}

export function closePublicationModal() {
  if (isPublicationUploadBusy() || publicationState.saving) {
    showToast("Aguarde a operacao terminar.", "error");
    return;
  }

  const modal = document.getElementById("editorialModal");
  if (modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    publicationState.editorOpen = false;
  }
}

function bindMediaControls() {
  const isViewer = publicationState.role === "viewer";
  const removeBtn = document.getElementById("btnRemoveMediaAsset");
  const pickerBtn = document.getElementById("btnOpenMediaPicker");
  const directInput = document.getElementById("formDirectFileInput");
  const retryButton = document.getElementById("btnRetryMediaRegistration");

  if (isViewer) {
    if (removeBtn) removeBtn.style.display = "none";
    if (pickerBtn) pickerBtn.style.display = "none";
    if (directInput?.parentNode) directInput.parentNode.style.display = "none";
    if (retryButton) retryButton.style.display = "none";
    syncPublicationUploadControls();
    return;
  }

  pickerBtn?.addEventListener("click", () => {
    if (isPublicationUploadBusy()) return;
    openMediaPicker(getPublicationTarget());
  });

  removeBtn?.addEventListener("click", () => {
    if (isPublicationUploadBusy()) return;
    clearSelectedPublicationAsset();
  });

  directInput?.addEventListener("change", handleDirectUpload);
  retryButton?.addEventListener("click", retryMediaRegistration);
  syncPublicationUploadControls();
}

async function handleDirectUpload(event) {
  const file = event.target.files?.[0];
  if (!file || isPublicationUploadBusy()) return;

  const formType = publicationState.activeType;
  const span = document.getElementById("formDirectUploadSpan");
  const target = getPublicationTarget(formType);

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
    showToast("Upload concluido com sucesso!");
  } catch (error) {
    console.error("[PublicationUpload]", {
      status: error?.name || "error",
      message: error?.message || "upload_failed"
    });

    if (isMediaAssetRegistrationError(error)) {
      showPendingMediaRegistration(error.retryContext, error.message);
      showToast(error.message, "error");
    } else {
      setPublicationUploadStatus("error", error.message || "Erro durante o upload.");
      showToast(error.message || "Erro durante o upload.", "error");
    }
  } finally {
    if (span) span.textContent = "Enviar imagem";
    syncPublicationUploadControls();
    event.target.value = "";
  }
}

async function retryMediaRegistration() {
  if (!publicationState.pendingMediaRegistration || isPublicationUploadBusy()) return;

  try {
    const mediaAsset = await registerUploadedMediaAsset({
      ...publicationState.pendingMediaRegistration,
      altText: document.getElementById("pub_image_alt")?.value || publicationState.pendingMediaRegistration.altText || "",
      onProgress: (status) => setPublicationUploadStatus(status)
    });

    applySelectedPublicationAsset(mediaAsset);
    showToast("Imagem registrada no painel.");
  } catch (error) {
    console.error("[PublicationUploadRetry]", {
      status: error?.name || error?.code || "error",
      message: error?.message || "media_asset_retry_failed"
    });
    setPublicationUploadStatus("error", error.message || "Falha ao registrar media_assets.");
    showToast(error.message || "Falha ao registrar media_assets.", "error");
  } finally {
    syncPublicationUploadControls();
  }
}
