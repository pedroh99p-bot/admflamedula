import { checkCmsAccess } from "./publicationPermissions.js";
import { publicationState, resetPublicationEditorState } from "./publicationState.js";
import { openPublicationModal, closePublicationModal } from "./publicationModal.js";
import {
  listPublicationItems,
  createPublicationItem,
  updatePublicationItem,
  deletePublicationItem
} from "../services/publicationService.js";
import { showToast } from "../toast.js";

let initialized = false;

export async function initPublicationRouter(tabId) {
  const check = await checkCmsAccess();
  if (!check.active) {
    showToast("Acesso ao CMS negado.", "error");
    window.location.hash = "overview";
    return;
  }

  publicationState.role = check.role;
  publicationState.activeType = getContentTypeFromTab(tabId);
  publicationState.page = 1;

  if (!initialized) {
    bindEvents();
    initialized = true;
  }

  await loadItems();
}

function getContentTypeFromTab(tabId) {
  if (tabId === "hero") return "hero_news";
  if (tabId === "actions") return "actions";
  return "media_items";
}

function getTableFromType(type) {
  if (type === "hero_news") return "hero_news";
  if (type === "actions") return "actions";
  return "media_items";
}

async function loadItems() {
  publicationState.loading = true;
  renderShell();

  const table = getTableFromType(publicationState.activeType);
  const result = await listPublicationItems(table, {
    page: publicationState.page,
    pageSize: publicationState.pageSize
  });

  publicationState.loading = false;

  if (result.error) {
    publicationState.error = result.error.message;
    publicationState.items = [];
    publicationState.totalItems = 0;
  } else {
    publicationState.items = result.data || [];
    publicationState.totalItems = result.total || 0;
    publicationState.error = "";
  }

  renderShell();
}

function renderShell() {
  const containerId = publicationState.activeType === "hero_news"
    ? "tab-hero"
    : publicationState.activeType === "actions"
      ? "tab-actions"
      : "tab-media";

  const container = document.getElementById(containerId);
  if (!container) return;

  const isViewer = publicationState.role === "viewer";
  const typeLabel = publicationState.activeType === "hero_news" ? "Hero" : publicationState.activeType === "actions" ? "Ação" : "Mídia";

  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>Gestão de ${typeLabel}</h2>
        <p>${publicationState.totalItems} registros cadastrados</p>
      </div>
      ${!isViewer ? `
        <button class="action-button primary" type="button" id="btnNewPublication">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          <span>Novo ${typeLabel}</span>
        </button>
      ` : ""}
    </div>

    <article class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Imagem</th>
              <th>Título</th>
              <th>Ordem</th>
              <th>Status</th>
              <th>Última Atualização</th>
              <th style="width: 150px; text-align: right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${renderRows()}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls()}
    </article>
  `;

  // Bind local events on generated controls
  const newBtn = container.querySelector("#btnNewPublication");
  if (newBtn) newBtn.addEventListener("click", () => openCreateForm());

  container.querySelectorAll(".btn-edit-pub").forEach(btn => {
    btn.addEventListener("click", () => openEditForm(btn.dataset.id));
  });

  container.querySelectorAll(".btn-delete-pub").forEach(btn => {
    btn.addEventListener("click", () => handleDeleteItem(btn.dataset.id));
  });

  container.querySelectorAll(".btn-toggle-pub").forEach(btn => {
    btn.addEventListener("click", () => handleTogglePublish(btn.dataset.id, btn.dataset.published === "true"));
  });

  bindPaginationEvents(container);
}

function renderRows() {
  if (publicationState.loading) {
    return `<tr><td colspan="6" style="text-align: center; padding: 32px 0;">Carregando registros...</td></tr>`;
  }

  if (publicationState.error) {
    return `<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 32px 0;">${publicationState.error}</td></tr>`;
  }

  if (!publicationState.items.length) {
    return `<tr><td colspan="6" style="text-align: center; padding: 32px 0;">Nenhum registro encontrado.</td></tr>`;
  }

  return publicationState.items.map(item => {
    const isPublished = item.published === true;
    const dateStr = item.updated_at ? new Date(item.updated_at).toLocaleString("pt-BR") : "-";
    const imgUrl = item.image_url || "";

    return `
      <tr>
        <td>
          <div class="table-thumb">
            ${imgUrl ? `<img src="${imgUrl}" alt="${item.image_alt || item.title || ''}" loading="lazy">` : `<div class="thumb-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>`}
          </div>
        </td>
        <td><strong>${escapeHtml(item.title || "-")}</strong></td>
        <td>${item.sort_order ?? 0}</td>
        <td>
          <span class="badge ${isPublished ? 'positive' : 'warning'}">
            ${isPublished ? 'Publicado' : 'Rascunho'}
          </span>
        </td>
        <td>${dateStr}</td>
        <td style="text-align: right;">
          <div class="row-actions" style="justify-content: flex-end;">
            ${publicationState.role !== "viewer" ? `
              <button class="icon-button btn-toggle-pub" data-id="${item.id}" data-published="${isPublished}" title="${isPublished ? 'Despublicar' : 'Publicar'}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-power"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>
              </button>
              <button class="icon-button btn-edit-pub" data-id="${item.id}" title="Editar">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
            ` : ""}
            ${publicationState.role === "owner" ? `
              <button class="icon-button soft-danger btn-delete-pub" data-id="${item.id}" title="Excluir">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </button>
            ` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderPaginationControls() {
  const totalPages = Math.ceil(publicationState.totalItems / publicationState.pageSize);
  if (totalPages <= 1) return "";

  return `
    <div class="pagination-controls" style="display:flex; justify-content:space-between; align-items:center; padding:16px;">
      <span>Mostrando registros ${(publicationState.page - 1) * publicationState.pageSize + 1} a ${Math.min(publicationState.page * publicationState.pageSize, publicationState.totalItems)} de ${publicationState.totalItems}</span>
      <div style="display:flex; gap:8px;">
        <button class="action-button secondary" id="btnPubPrev" ${publicationState.page === 1 ? 'disabled' : ''}>Anterior</button>
        <button class="action-button secondary" id="btnPubNext" ${publicationState.page >= totalPages ? 'disabled' : ''}>Próximo</button>
      </div>
    </div>
  `;
}

function bindPaginationEvents(container) {
  const prevBtn = container.querySelector("#btnPubPrev");
  const nextBtn = container.querySelector("#btnPubNext");

  if (prevBtn) {
    prevBtn.addEventListener("click", async () => {
      publicationState.page--;
      await loadItems();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", async () => {
      publicationState.page++;
      await loadItems();
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function openCreateForm() {
  resetPublicationEditorState();
  publicationState.editorMode = "create";
  
  const typeLabel = publicationState.activeType === "hero_news" ? "Hero" : publicationState.activeType === "actions" ? "Ação" : "Mídia";
  const bodyMarkup = buildFormFieldsMarkup({});

  openPublicationModal({
    title: `Criar ${typeLabel}`,
    kicker: "Publicação",
    bodyMarkup
  });
}

function openEditForm(id) {
  const item = publicationState.items.find(i => String(i.id) === String(id));
  if (!item) return;

  resetPublicationEditorState();
  publicationState.editorMode = "edit";
  publicationState.editingId = id;
  publicationState.formData = { ...item };
  publicationState.selectedAsset = item.image_asset_id ? { id: item.image_asset_id, card_url: item.image_url } : null;

  const typeLabel = publicationState.activeType === "hero_news" ? "Hero" : publicationState.activeType === "actions" ? "Ação" : "Mídia";
  const bodyMarkup = buildFormFieldsMarkup(item);

  openPublicationModal({
    title: `Editar ${typeLabel}`,
    kicker: "Publicação",
    bodyMarkup
  });
}

function buildFormFieldsMarkup(item) {
  const isHero = publicationState.activeType === "hero_news";
  const isAction = publicationState.activeType === "actions";
  const isMedia = publicationState.activeType === "media_items";

  let specificFields = "";
  if (isHero) {
    specificFields = `
      <div class="form-field-group">
        <label for="pub_title">Título *</label>
        <input type="text" id="pub_title" name="title" value="${escapeHtml(item.title || '')}" required>
      </div>
      <div class="form-field-group">
        <label for="pub_subtitle">Subtítulo</label>
        <textarea id="pub_subtitle" name="subtitle" rows="3">${escapeHtml(item.subtitle || '')}</textarea>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_category">Categoria</label>
          <input type="text" id="pub_category" name="category" value="${escapeHtml(item.category || '')}">
        </div>
        <div class="form-field-group">
          <label for="pub_sort_order">Ordem</label>
          <input type="number" id="pub_sort_order" name="sort_order" value="${item.sort_order ?? 0}">
        </div>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_cta_label">Texto do Botão (CTA)</label>
          <input type="text" id="pub_cta_label" name="cta_label" value="${escapeHtml(item.cta_label || '')}">
        </div>
        <div class="form-field-group">
          <label for="pub_cta_url">Link do Botão (CTA)</label>
          <input type="url" id="pub_cta_url" name="cta_url" value="${escapeHtml(item.cta_url || '')}">
        </div>
      </div>
    `;
  } else if (isAction) {
    specificFields = `
      <div class="form-field-group">
        <label for="pub_title">Título *</label>
        <input type="text" id="pub_title" name="title" value="${escapeHtml(item.title || '')}" required>
      </div>
      <div class="form-field-group">
        <label for="pub_summary">Resumo</label>
        <textarea id="pub_summary" name="summary" rows="3">${escapeHtml(item.summary || '')}</textarea>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_action_date">Data do Evento/Ação</label>
          <input type="date" id="pub_action_date" name="action_date" value="${item.action_date || ''}">
        </div>
        <div class="form-field-group">
          <label for="pub_location">Localização</label>
          <input type="text" id="pub_location" name="location" value="${escapeHtml(item.location || '')}">
        </div>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_action_status">Status da Ação</label>
          <input type="text" id="pub_action_status" name="action_status" value="${escapeHtml(item.action_status || '')}">
        </div>
        <div class="form-field-group">
          <label for="pub_sort_order">Ordem</label>
          <input type="number" id="pub_sort_order" name="sort_order" value="${item.sort_order ?? 0}">
        </div>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_cta_label">Texto do Botão (CTA)</label>
          <input type="text" id="pub_cta_label" name="cta_label" value="${escapeHtml(item.cta_label || '')}">
        </div>
        <div class="form-field-group">
          <label for="pub_cta_url">Link do Botão (CTA)</label>
          <input type="url" id="pub_cta_url" name="cta_url" value="${escapeHtml(item.cta_url || '')}">
        </div>
      </div>
    `;
  } else if (isMedia) {
    specificFields = `
      <div class="form-field-group">
        <label for="pub_title">Título *</label>
        <input type="text" id="pub_title" name="title" value="${escapeHtml(item.title || '')}" required>
      </div>
      <div class="form-field-group">
        <label for="pub_description">Descrição</label>
        <textarea id="pub_description" name="description" rows="3">${escapeHtml(item.description || '')}</textarea>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_type">Tipo (ex: vídeo, card, banner)</label>
          <input type="text" id="pub_type" name="type" value="${escapeHtml(item.type || '')}">
        </div>
        <div class="form-field-group">
          <label for="pub_category">Categoria</label>
          <input type="text" id="pub_category" name="category" value="${escapeHtml(item.category || '')}">
        </div>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_url">URL Externa (Opcional)</label>
          <input type="url" id="pub_url" name="url" value="${escapeHtml(item.url || '')}">
        </div>
        <div class="form-field-group">
          <label for="pub_sort_order">Ordem</label>
          <input type="number" id="pub_sort_order" name="sort_order" value="${item.sort_order ?? 0}">
        </div>
      </div>
    `;
  }

  const hasMedia = Boolean(publicationState.selectedAsset || item.image_url);
  const mediaUrl = publicationState.selectedAsset?.card_url || item.image_url || "";

  return `
    <div class="form-grid">
      <div class="form-columns-main">
        ${specificFields}
      </div>
      
      <div class="form-columns-sidebar">
        <div class="media-box-widget">
          <span class="widget-label">Imagem Associada</span>
          
          <div class="media-preview-box" id="formMediaPreviewBox" style="${hasMedia ? 'display:flex;' : 'display:none;'}">
            <img src="${mediaUrl}" alt="Visualização" id="formMediaPreviewImg">
            <div class="media-preview-details" id="formMediaDetails"></div>
          </div>
          
          <div class="media-no-preview" id="formNoMediaBox" style="${!hasMedia ? 'display:flex;' : 'display:none;'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-up"><path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10"/><circle cx="9" cy="9" r="2"/><path d="m14 13.5 1.79 1.79a2 2 0 0 0 2.82 0L21 13"/><path d="M16 19h6"/><path d="M19 16v6"/></svg>
            <p>Nenhuma imagem selecionada</p>
          </div>

          <div class="media-widget-actions">
            <button type="button" class="action-button secondary compact-btn" id="btnOpenMediaPicker">Escolher da Biblioteca</button>
            <button type="button" class="action-button ghost danger-text compact-btn" id="btnRemoveMediaAsset">Remover</button>
          </div>
        </div>

        <div class="form-field-group" style="margin-top: 16px;">
          <label for="pub_image_alt">Texto Alternativo (Acessibilidade)</label>
          <input type="text" id="pub_image_alt" name="image_alt" value="${escapeHtml(item.image_alt || '')}" placeholder="Descreva a imagem para leitores de tela...">
        </div>
      </div>
    </div>
  `;
}

function bindEvents() {
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "editorialModalForm") return;
    e.target.preventDefault();

    const submitter = e.submitter;
    const isPublish = submitter?.id === "btnSavePublish";

    await handleSaveForm(isPublish);
  });
}

async function handleSaveForm(isPublish) {
  const form = document.getElementById("editorialModalForm");
  if (!form) return;

  const titleInput = form.querySelector("[name='title']");
  if (!titleInput || !titleInput.value.trim()) {
    showToast("O título é obrigatório.", "error");
    titleInput?.focus();
    return;
  }

  const formData = new FormData(form);
  const payload = {
    title: titleInput.value.trim(),
    image_alt: form.querySelector("[name='image_alt']")?.value || null,
    sort_order: Number(form.querySelector("[name='sort_order']")?.value || 0),
    published: isPublish
  };

  const activeType = publicationState.activeType;
  if (activeType === "hero_news") {
    payload.subtitle = form.querySelector("[name='subtitle']")?.value || null;
    payload.category = form.querySelector("[name='category']")?.value || null;
    payload.cta_label = form.querySelector("[name='cta_label']")?.value || null;
    payload.cta_url = form.querySelector("[name='cta_url']")?.value || null;
  } else if (activeType === "actions") {
    payload.summary = form.querySelector("[name='summary']")?.value || null;
    payload.action_date = form.querySelector("[name='action_date']")?.value || null;
    payload.location = form.querySelector("[name='location']")?.value || null;
    payload.action_status = form.querySelector("[name='action_status']")?.value || null;
    payload.cta_label = form.querySelector("[name='cta_label']")?.value || null;
    payload.cta_url = form.querySelector("[name='cta_url']")?.value || null;
  } else if (activeType === "media_items") {
    payload.description = form.querySelector("[name='description']")?.value || null;
    payload.type = form.querySelector("[name='type']")?.value || null;
    payload.category = form.querySelector("[name='category']")?.value || null;
    payload.url = form.querySelector("[name='url']")?.value || null;
  }

  // Associar imagem do Cloudinary
  if (publicationState.selectedAsset) {
    payload.image_asset_id = publicationState.selectedAsset.id;
    payload.image_url = publicationState.selectedAsset.secure_url || publicationState.selectedAsset.delivery_url || "";
  } else {
    // Se removeu a imagem
    const previewBox = document.getElementById("formMediaPreviewBox");
    if (previewBox && previewBox.style.display === "none") {
      payload.image_asset_id = null;
      payload.image_url = null;
    }
  }

  const table = getTableFromType(activeType);
  publicationState.saving = true;

  try {
    if (publicationState.editorMode === "edit") {
      await updatePublicationItem(table, publicationState.editingId, payload);
      showToast("Registro atualizado com sucesso!");
    } else {
      await createPublicationItem(table, payload);
      showToast("Registro criado com sucesso!");
    }

    closePublicationModal();
    await loadItems();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Erro ao salvar o registro.", "error");
  } finally {
    publicationState.saving = false;
  }
}

async function handleDeleteItem(id) {
  if (publicationState.role !== "owner") {
    showToast("Permissão negada. Apenas administradores 'owner' podem excluir conteúdos.", "error");
    return;
  }

  if (!confirm("Tem certeza que deseja excluir permanentemente este registro? As mídias associadas não serão apagadas do Cloudinary.")) {
    return;
  }

  const table = getTableFromType(publicationState.activeType);
  try {
    await deletePublicationItem(table, id);
    showToast("Registro excluído com sucesso!");
    await loadItems();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Erro ao excluir o registro.", "error");
  }
}

async function handleTogglePublish(id, currentlyPublished) {
  const table = getTableFromType(publicationState.activeType);
  const newStatus = !currentlyPublished;

  try {
    await updatePublicationItem(table, id, { published: newStatus });
    showToast(newStatus ? "Registro publicado com sucesso!" : "Registro revertido para rascunho!");
    await loadItems();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Erro ao alterar status de publicação.", "error");
  }
}
