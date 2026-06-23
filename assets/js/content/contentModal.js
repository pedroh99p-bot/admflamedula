import { contentState } from "./contentState.js";
import { buildEditorForm } from "./contentFormFactory.js";
import { getContentConfig } from "./contentRegistry.js";
import { escapeHtml } from "./contentUtils.js";

export function ensureContentModal() {
  let modal = document.getElementById("contentEditorModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "contentEditorModal";
  modal.className = "content-editor-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="content-editor-backdrop" data-content-action="close-editor"></div>
    <section class="content-editor-panel" role="dialog" aria-modal="true" aria-labelledby="contentEditorTitle">
      <header class="content-editor-header">
        <div>
          <p class="eyebrow" id="contentEditorKicker">Conteudo</p>
          <h2 id="contentEditorTitle">Novo conteudo</h2>
        </div>
        <button class="icon-button" type="button" data-content-action="close-editor" aria-label="Fechar editor">
          <i data-lucide="x"></i>
        </button>
      </header>
      <form id="contentEditorForm" class="content-editor-form" novalidate>
        <div class="content-editor-body" id="contentEditorBody"></div>
        <footer class="content-editor-footer" id="contentEditorFooter"></footer>
      </form>
    </section>
  `;
  document.body.appendChild(modal);
  return modal;
}

export function openContentModal({ title, kicker, errors = {} }) {
  const modal = ensureContentModal();
  const titleNode = modal.querySelector("#contentEditorTitle");
  const kickerNode = modal.querySelector("#contentEditorKicker");
  const bodyNode = modal.querySelector("#contentEditorBody");
  const footerNode = modal.querySelector("#contentEditorFooter");

  titleNode.textContent = title;
  kickerNode.textContent = kicker;
  bodyNode.innerHTML = buildEditorForm(errors);
  footerNode.innerHTML = buildFooter();

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  contentState.editorOpen = true;
  createIcons();

  requestAnimationFrame(() => {
    modal.querySelector("input, select, textarea, button:not([disabled])")?.focus();
  });
}

export function refreshContentModal(errors = {}) {
  if (!contentState.editorOpen) return;
  const modal = ensureContentModal();
  modal.querySelector("#contentEditorBody").innerHTML = buildEditorForm(errors);
  modal.querySelector("#contentEditorFooter").innerHTML = buildFooter();
  createIcons();
}

export function closeContentModal() {
  const modal = ensureContentModal();
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  contentState.editorOpen = false;

  if (contentState.returnFocus?.isConnected) {
    requestAnimationFrame(() => contentState.returnFocus.focus());
  }
}

function buildFooter() {
  const isEdit = contentState.editorMode === "edit";
  const config = getContentConfig(contentState.activeType);
  return `
    <button class="action-button ghost" type="button" data-content-action="close-editor">Cancelar</button>
    <div class="content-editor-footer-actions">
      <button class="action-button secondary" type="submit" data-content-submit="draft" ${contentState.saving ? "disabled" : ""}>
        ${escapeHtml(isEdit ? "Atualizar" : config.supportsPublished ? "Salvar rascunho" : "Salvar")}
      </button>
      ${config.supportsPublished ? `
        <button class="action-button primary" type="submit" data-content-submit="publish" ${contentState.saving ? "disabled" : ""}>
          ${escapeHtml(contentState.saving ? "Salvando..." : "Salvar e publicar")}
        </button>
      ` : ""}
    </div>
  `;
}

function createIcons() {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}
