import { publicationState } from "./publicationState.js";
import { openMediaPicker } from "./mediaPicker.js";

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
          <p class="eyebrow" id="editorialModalKicker">Publicação</p>
          <h2 id="editorialModalTitle">Novo Registro</h2>
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
            <button class="action-button secondary" type="submit" id="btnSaveDraft">Salvar Rascunho</button>
            <button class="action-button primary" type="submit" id="btnSavePublish">Salvar e Publicar</button>
          </div>
        </footer>
      </form>
    </section>
  `;
  document.body.appendChild(modal);

  // Eventos de fechar
  document.getElementById("btnEditorialModalClose").addEventListener("click", closePublicationModal);
  document.getElementById("btnEditorialModalCloseBackdrop").addEventListener("click", closePublicationModal);
  document.getElementById("btnEditorialModalCancel").addEventListener("click", closePublicationModal);

  // Esc para fechar
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && publicationState.editorOpen) {
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

  // Gerenciar estado dos botões de ação com base na permissão do usuário
  const isViewer = publicationState.role === "viewer";
  document.getElementById("btnSaveDraft").disabled = isViewer;
  document.getElementById("btnSavePublish").disabled = isViewer;

  const removeBtn = document.getElementById("btnRemoveMediaAsset");
  const pickerBtn = document.getElementById("btnOpenMediaPicker");
  
  if (removeBtn && pickerBtn) {
    if (isViewer) {
      removeBtn.style.display = "none";
      pickerBtn.style.display = "none";
    } else {
      pickerBtn.addEventListener("click", () => {
        const formType = publicationState.activeType;
        const target = formType === "hero_news" ? "hero" : formType === "actions" ? "actions" : "media";
        openMediaPicker(target);
      });
      removeBtn.addEventListener("click", () => {
        publicationState.selectedAsset = null;
        document.getElementById("formMediaPreviewImg").src = "";
        document.getElementById("formMediaPreviewBox").style.display = "none";
        document.getElementById("formNoMediaBox").style.display = "flex";
        document.getElementById("formMediaDetails").innerHTML = "";
      });
    }
  }

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  publicationState.editorOpen = true;
}

export function closePublicationModal() {
  const modal = document.getElementById("editorialModal");
  if (modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    publicationState.editorOpen = false;
  }
}
