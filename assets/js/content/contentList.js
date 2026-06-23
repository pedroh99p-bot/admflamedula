import { CONTENT_TYPES, getContentConfig } from "./contentRegistry.js";
import { canDeleteContent, canMutateContent, contentState } from "./contentState.js";
import { escapeHtml, formatDateTime, getDescription, getPreferredImageUrl, getTitle } from "./contentUtils.js";

export function renderContentShell(root) {
  const config = getContentConfig(contentState.activeType);
  root.innerHTML = `
    <div class="content-module">
      <div class="content-module-header">
        <div>
          <h2>Conteudo do site</h2>
          <p>Gestao de textos, midias e blocos publicados na futura landing.</p>
        </div>
        ${canMutateContent() ? `
          <button class="action-button primary" type="button" data-content-action="create-content">
            <i data-lucide="plus"></i>
            <span>Novo conteudo</span>
          </button>
        ` : ""}
      </div>

      <div class="content-toolbar">
        <label>
          <span>Tipo</span>
          <select data-content-filter="type">
            ${CONTENT_TYPES.map((type) => `<option value="${escapeHtml(type)}" ${type === contentState.activeType ? "selected" : ""}>${escapeHtml(getContentConfig(type).label)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select data-content-filter="status">
            <option value="">Todos</option>
            <option value="published" ${contentState.filters.status === "published" ? "selected" : ""}>Publicados</option>
            <option value="draft" ${contentState.filters.status === "draft" ? "selected" : ""}>Rascunhos</option>
          </select>
        </label>
        <label>
          <span>Busca</span>
          <input type="search" data-content-filter="query" value="${escapeHtml(contentState.filters.query)}" placeholder="Buscar conteudo">
        </label>
        <label>
          <span>Ordem</span>
          <select data-content-filter="sort">
            <option value="sort_order" ${contentState.filters.sort === "sort_order" ? "selected" : ""}>Ordem manual</option>
            <option value="updated_at" ${contentState.filters.sort === "updated_at" ? "selected" : ""}>Atualizados</option>
            <option value="created_at" ${contentState.filters.sort === "created_at" ? "selected" : ""}>Criados</option>
          </select>
        </label>
      </div>

      <div class="content-status-row">
        <span class="badge info">${escapeHtml(config.label)}</span>
        <span>${escapeHtml(String(getVisibleItems().length))} registro(s)</span>
      </div>

      <div class="content-module-body">
        ${renderBody()}
      </div>
    </div>
  `;
}

function renderBody() {
  if (contentState.loading) {
    return `<div class="content-skeleton"><span></span><span></span><span></span></div>`;
  }

  if (contentState.error) {
    return `
      <div class="content-empty-state">
        <strong>Nao foi possivel carregar conteudo.</strong>
        <p>${escapeHtml(contentState.error)}</p>
        <button class="action-button secondary" type="button" data-content-action="reload">Tentar novamente</button>
      </div>
    `;
  }

  const items = getVisibleItems();
  if (!items.length) {
    return `
      <div class="content-empty-state">
        <strong>Nenhum conteudo encontrado.</strong>
        <p>Crie o primeiro registro ou ajuste os filtros atuais.</p>
        ${canMutateContent() ? `<button class="action-button primary" type="button" data-content-action="create-content">Criar primeiro conteudo</button>` : ""}
      </div>
    `;
  }

  return `<div class="content-card-grid">${items.map(renderCard).join("")}</div>`;
}

function renderCard(item) {
  const config = getContentConfig(contentState.activeType);
  const imageUrl = getPreferredImageUrl(item);
  const published = item.published === true;
  const title = getTitle(item, config);
  const description = getDescription(item, config);

  return `
    <article class="content-admin-card">
      <div class="content-admin-thumb">
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.image_alt || title)}">` : `<i data-lucide="${escapeHtml(config.icon)}"></i>`}
      </div>
      <div class="content-admin-main">
        <div class="content-admin-title">
          <strong>${escapeHtml(title)}</strong>
          <span class="badge ${published ? "positive" : "warning"}">${published ? "Publicado" : "Rascunho"}</span>
        </div>
        <p>${escapeHtml(description || config.label)}</p>
        <div class="content-admin-meta">
          <span>${escapeHtml(config.label)}</span>
          ${config.supportsSortOrder ? `<span>Ordem ${escapeHtml(item.sort_order ?? "-")}</span>` : ""}
          <span>Atualizado ${escapeHtml(formatDateTime(item.updated_at || item.created_at))}</span>
        </div>
      </div>
      <div class="content-admin-actions">
        <button class="action-button ghost" type="button" data-content-action="preview" data-id="${escapeHtml(item.id)}">Preview</button>
        ${canMutateContent() ? `<button class="action-button secondary" type="button" data-content-action="edit" data-id="${escapeHtml(item.id)}">Editar</button>` : ""}
        ${canMutateContent() && config.supportsPublished ? `<button class="action-button ghost" type="button" data-content-action="${published ? "unpublish" : "publish"}" data-id="${escapeHtml(item.id)}">${published ? "Despublicar" : "Publicar"}</button>` : ""}
        ${canDeleteContent() && config.supportsDelete ? `<button class="action-button ghost danger-text" type="button" data-content-action="delete" data-id="${escapeHtml(item.id)}" data-title="${escapeHtml(title)}">Excluir</button>` : ""}
      </div>
    </article>
  `;
}

export function getVisibleItems() {
  const query = contentState.filters.query.trim().toLowerCase();
  const status = contentState.filters.status;
  const sort = contentState.filters.sort;
  const config = getContentConfig(contentState.activeType);

  return contentState.items
    .filter((item) => {
      if (status === "published" && item.published !== true) return false;
      if (status === "draft" && item.published === true) return false;
      if (!query) return true;
      return [getTitle(item, config), getDescription(item, config), item.category, item.key]
        .some((value) => String(value || "").toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (sort === "updated_at" || sort === "created_at") return new Date(b[sort] || 0) - new Date(a[sort] || 0);
      return Number(a.sort_order || 0) - Number(b.sort_order || 0);
    });
}
