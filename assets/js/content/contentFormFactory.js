import { CONTENT_TYPES, getContentConfig } from "./contentRegistry.js";
import { contentState } from "./contentState.js";
import { escapeHtml, getPreferredImageUrl } from "./contentUtils.js";

export function buildEditorForm(errors = {}) {
  const config = getContentConfig(contentState.activeType);
  const data = contentState.formData || {};
  const asset = contentState.selectedAsset;
  const imageUrl = getPreferredImageUrl(asset) || data.image_url || data.thumbnail_url || "";

  return `
    <div class="content-editor-grid">
      <label class="content-field">
        <span>Tipo de conteudo</span>
        <select name="__type" data-content-editor-type>
          ${CONTENT_TYPES.map((type) => {
            const item = getContentConfig(type);
            return `<option value="${escapeHtml(type)}" ${type === contentState.activeType ? "selected" : ""}>${escapeHtml(item.label)}</option>`;
          }).join("")}
        </select>
      </label>

      ${config.fields.map((field) => renderField(field, data[field.name], errors[field.name])).join("")}

      ${config.supportsSortOrder ? renderField({ name: "sort_order", label: "Ordem", type: "number" }, data.sort_order ?? 0, errors.sort_order) : ""}
      ${config.supportsPublished ? renderBoolean("published", "Publicado", data.published === true) : ""}
      ${config.supportsFeatured ? renderBoolean("featured", "Destaque", data.featured === true) : ""}

      ${config.supportsImage ? renderMediaField(imageUrl, asset, data) : ""}
    </div>
  `;
}

function renderField(field, value, error) {
  const id = `content-field-${field.name}`;
  const describedBy = error ? `${id}-error` : "";
  const common = `id="${id}" name="${escapeHtml(field.name)}" ${field.required ? "required" : ""} ${error ? "aria-invalid=\"true\"" : ""} ${describedBy ? `aria-describedby="${describedBy}"` : ""}`;
  const label = `
    <span>${escapeHtml(field.label)}${field.required ? " *" : ""}</span>
  `;

  let control = "";
  if (field.type === "textarea" || field.type === "json") {
    control = `<textarea ${common} rows="${field.type === "json" ? 8 : 4}">${escapeHtml(field.type === "json" ? JSON.stringify(value || {}, null, 2) : (value ?? ""))}</textarea>`;
  } else {
    control = `<input ${common} type="${field.type || "text"}" value="${escapeHtml(value ?? "")}">`;
  }

  return `
    <label class="content-field ${field.type === "textarea" || field.type === "json" ? "span-2" : ""}">
      ${label}
      ${control}
      ${error ? `<small id="${id}-error" class="content-field-error">${escapeHtml(error)}</small>` : ""}
      ${field.help ? `<small>${escapeHtml(field.help)}</small>` : ""}
    </label>
  `;
}

function renderBoolean(name, label, checked) {
  return `
    <label class="content-check">
      <input type="checkbox" name="${escapeHtml(name)}" ${checked ? "checked" : ""}>
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function renderMediaField(imageUrl, asset, data) {
  return `
    <section class="content-media-box span-2">
      <div class="content-media-preview">
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(data.image_alt || asset?.alt_text || "Preview")}">` : `<div class="content-media-empty">Sem imagem selecionada</div>`}
        <div>
          <strong>${escapeHtml(asset?.display_name || asset?.original_filename || "Imagem do conteudo")}</strong>
          <span>${escapeHtml(asset?.folder || "")}</span>
          <span>${escapeHtml(asset?.optimization_status || "")}</span>
        </div>
      </div>
      <div class="content-media-actions">
        <label class="content-upload-button">
          <input type="file" accept="image/jpeg,image/png,image/webp" data-content-upload>
          <span>Enviar imagem</span>
        </label>
        <button type="button" class="action-button secondary" data-content-action="open-media-picker">Escolher da biblioteca</button>
        <button type="button" class="action-button ghost" data-content-action="remove-media">Remover imagem</button>
      </div>
    </section>
  `;
}
