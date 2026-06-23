import {
  createContent,
  deleteContent,
  listContent,
  publishContent,
  unpublishContent,
  updateContent
} from "../services/contentService.js";
import { uploadSignedMediaAsset } from "../services/cloudinaryService.js";
import { closeMediaPicker, getMediaAssetById, normalizePickedAsset, openMediaPicker } from "./mediaPicker.js";
import { getContentConfig } from "./contentRegistry.js";
import {
  canEditSiteSettings,
  canMutateContent,
  contentState,
  resetEditorState
} from "./contentState.js";
import { renderContentShell } from "./contentList.js";
import { closeContentModal, openContentModal, refreshContentModal } from "./contentModal.js";
import { parseJsonValue, validateContentPayload } from "./contentValidation.js";
import { escapeHtml, getDescription, getPreferredImageUrl, getTitle } from "./contentUtils.js";

let rootNode = null;
let getRole = () => "viewer";
let bound = false;

export function initContentModule({ root, getAdminRole }) {
  rootNode = root;
  getRole = getAdminRole || getRole;
  contentState.role = getRole();
  if (!bound) {
    document.addEventListener("click", handleContentClick);
    document.addEventListener("change", handleContentChange);
    document.addEventListener("input", handleContentInput);
    document.addEventListener("submit", handleContentSubmit);
    document.addEventListener("keydown", handleContentKeydown);
    bound = true;
  }
  render();
}

export async function activateContentModule() {
  contentState.role = getRole();
  render();
  if (!contentState.initialized) {
    await loadItems();
  }
}

export function renderContentModule() {
  render();
}

async function loadItems() {
  const config = getContentConfig(contentState.activeType);
  contentState.loading = true;
  contentState.error = "";
  render();

  const result = await listContent(config.table, {}, {
    orderBy: config.supportsSortOrder ? "sort_order" : "key",
    ascending: true
  });
  contentState.loading = false;
  contentState.initialized = true;
  if (result.error) {
    contentState.items = [];
    contentState.error = result.error.message;
  } else {
    contentState.items = result.data || [];
  }
  render();
}

function render() {
  if (!rootNode) return;
  contentState.role = getRole();
  renderContentShell(rootNode);
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function handleContentClick(event) {
  const button = event.target.closest("[data-content-action]");
  if (!button) return;

  const action = button.dataset.contentAction;
  if (!isContentAction(action)) return;
  event.preventDefault();

  if (action === "create-content") return openCreate(button);
  if (action === "edit") return openEdit(button.dataset.id, button);
  if (action === "preview") return previewItem(button.dataset.id);
  if (action === "publish") return setPublished(button.dataset.id, true);
  if (action === "unpublish") return setPublished(button.dataset.id, false);
  if (action === "delete") return deleteItem(button.dataset.id, button.dataset.title);
  if (action === "reload") return loadItems();
  if (action === "close-editor") return closeEditor();
  if (action === "open-media-picker") return openPicker();
  if (action === "close-media-picker") return closeMediaPicker();
  if (action === "reload-media-picker") return openPicker();
  if (action === "select-media") return selectMedia(button.dataset.mediaId);
  if (action === "remove-media") return removeMedia();
}

async function handleContentChange(event) {
  const typeFilter = event.target.closest("[data-content-filter='type']");
  if (typeFilter) {
    contentState.activeType = typeFilter.value;
    contentState.initialized = false;
    resetEditorState();
    await loadItems();
    return;
  }

  const statusFilter = event.target.closest("[data-content-filter='status']");
  if (statusFilter) {
    contentState.filters.status = statusFilter.value;
    render();
    return;
  }

  const sortFilter = event.target.closest("[data-content-filter='sort']");
  if (sortFilter) {
    contentState.filters.sort = sortFilter.value;
    render();
    return;
  }

  const editorType = event.target.closest("[data-content-editor-type]");
  if (editorType) {
    const safeData = collectEditorData();
    contentState.activeType = editorType.value;
    contentState.formData = preserveCommonFields(safeData);
    contentState.selectedAsset = null;
    refreshContentModal();
    return;
  }

  const uploadInput = event.target.closest("[data-content-upload]");
  if (uploadInput?.files?.[0]) {
    await uploadImage(uploadInput.files[0]);
  }
}

function handleContentInput(event) {
  const query = event.target.closest("[data-content-filter='query']");
  if (!query) return;
  contentState.filters.query = query.value;
  render();
}

async function handleContentSubmit(event) {
  if (event.target.id !== "contentEditorForm") return;
  event.preventDefault();
  if (contentState.saving) return;

  const submitter = event.submitter;
  const publish = submitter?.dataset.contentSubmit === "publish";
  await saveEditor({ publish });
}

function handleContentKeydown(event) {
  if (event.key === "Escape" && contentState.editorOpen) {
    closeEditor();
  }
}

function openCreate(button) {
  if (!canMutateCurrentType()) return showToastMessage("Seu perfil nao permite criar conteudo.", "error");
  resetEditorState();
  contentState.returnFocus = button;
  contentState.editorOpen = true;
  contentState.editorMode = "create";
  contentState.formData = defaultFormData();
  openContentModal({
    title: "Novo conteudo",
    kicker: getContentConfig(contentState.activeType).label
  });
}

function openEdit(id, button) {
  if (!canMutateCurrentType()) return showToastMessage("Seu perfil nao permite editar conteudo.", "error");
  const item = contentState.items.find((entry) => String(entry.id) === String(id));
  if (!item) return showToastMessage("Registro nao encontrado.", "error");
  contentState.returnFocus = button;
  contentState.editorOpen = true;
  contentState.editorMode = "edit";
  contentState.editingId = String(id);
  contentState.formData = { ...item };
  contentState.selectedAsset = item.image_asset_id ? {
    id: item.image_asset_id,
    image_url: item.image_url,
    card_url: item.card_url,
    webp_url: item.webp_url,
    delivery_url: item.delivery_url,
    secure_url: item.secure_url,
    alt_text: item.image_alt
  } : null;
  openContentModal({
    title: `Editar ${getTitle(item, getContentConfig(contentState.activeType))}`,
    kicker: getContentConfig(contentState.activeType).label
  });
}

async function saveEditor({ publish }) {
  const config = getContentConfig(contentState.activeType);
  if (!canMutateCurrentType()) return showToastMessage("Sem permissao para salvar.", "error");

  let payload;
  try {
    payload = buildPayload({ publish });
  } catch (error) {
    return showToastMessage(error.message || "Revise os campos do formulario.", "error");
  }

  const errors = validateContentPayload(contentState.activeType, payload);
  if (Object.keys(errors).length) {
    refreshContentModal(errors);
    focusFirstError();
    return;
  }

  contentState.saving = true;
  refreshContentModal();
  try {
    if (contentState.editorMode === "edit") {
      await updateContent(config.table, contentState.editingId, payload);
      showToastMessage("Conteudo atualizado.");
    } else {
      await createContent(config.table, payload);
      showToastMessage("Conteudo criado.");
    }
    closeEditor();
    await loadItems();
  } catch (error) {
    console.error("[ContentModule] saveEditor", error);
    showToastMessage(error.message || "Nao foi possivel salvar conteudo.", "error");
    contentState.saving = false;
    refreshContentModal();
  }
}

function buildPayload({ publish }) {
  const config = getContentConfig(contentState.activeType);
  const data = collectEditorData();
  const payload = {};

  config.fields.forEach((field) => {
    let value = data[field.name];
    if (field.type === "json") value = parseJsonValue(value);
    if (field.type === "number") value = value === "" ? null : Number(value);
    payload[field.name] = value === "" ? null : value;
  });

  if (config.supportsSortOrder) payload.sort_order = Number(data.sort_order || 0);
  if (config.supportsPublished) payload.published = publish || data.published === "on";
  if (config.supportsFeatured) payload.featured = data.featured === "on";

  if (config.supportsImage) {
    const asset = contentState.selectedAsset;
    if (asset) {
      payload.image_asset_id = asset.id;
      payload.image_url = getPreferredImageUrl(asset);
      if ("image_alt" in payload && !payload.image_alt) payload.image_alt = asset.alt_text || null;
      if (contentState.activeType === "media_items") payload.thumbnail_url = asset.thumbnail_url || asset.card_url || asset.delivery_url || asset.secure_url || null;
      payload.cloudinary_public_id = asset.cloudinary_public_id || null;
    } else if (data.__remove_image === "true") {
      payload.image_asset_id = null;
      payload.image_url = null;
      payload.cloudinary_public_id = null;
      if (contentState.activeType === "media_items") payload.thumbnail_url = null;
    }
  }

  return payload;
}

function collectEditorData() {
  const form = document.getElementById("contentEditorForm");
  if (!form) return {};
  return Object.fromEntries(new FormData(form).entries());
}

async function uploadImage(file) {
  const config = getContentConfig(contentState.activeType);
  if (!config.supportsImage) return;
  const data = collectEditorData();
  contentState.formData = { ...contentState.formData, ...data };
  contentState.saving = true;
  refreshContentModal();
  try {
    const result = await uploadSignedMediaAsset({
      file,
      target: config.cloudinaryTarget,
      resourceType: "image",
      displayName: data[config.titleField] || file.name,
      altText: data.image_alt || "",
      assetType: contentState.activeType
    });
    contentState.selectedAsset = result.mediaAsset;
    showToastMessage("Imagem enviada.");
  } catch (error) {
    console.error("[ContentModule] uploadImage", error);
    showToastMessage(error.message || "Upload nao concluido.", "error");
  } finally {
    contentState.saving = false;
    refreshContentModal();
  }
}

async function openPicker() {
  const config = getContentConfig(contentState.activeType);
  if (!config.supportsImage) return;
  await openMediaPicker(config.cloudinaryTarget);
}

function selectMedia(id) {
  const asset = normalizePickedAsset(getMediaAssetById(id));
  if (!asset) return;
  contentState.selectedAsset = asset;
  closeMediaPicker();
  refreshContentModal();
}

function removeMedia() {
  contentState.selectedAsset = null;
  contentState.formData = {
    ...collectEditorData(),
    __remove_image: "true",
    image_asset_id: null,
    image_url: null
  };
  refreshContentModal();
}

async function setPublished(id, value) {
  const config = getContentConfig(contentState.activeType);
  if (!canMutateCurrentType()) return;
  try {
    if (value) await publishContent(config.table, id);
    else await unpublishContent(config.table, id);
    showToastMessage(value ? "Conteudo publicado." : "Conteudo despublicado.");
    await loadItems();
  } catch (error) {
    showToastMessage(error.message || "Nao foi possivel alterar publicacao.", "error");
  }
}

async function deleteItem(id, title) {
  const config = getContentConfig(contentState.activeType);
  if (!config.supportsDelete || !confirm(`Excluir ${title || "conteudo selecionado"}?`)) return;
  try {
    await deleteContent(config.table, id);
    showToastMessage("Conteudo excluido.");
    await loadItems();
  } catch (error) {
    showToastMessage(error.message || "Nao foi possivel excluir conteudo.", "error");
  }
}

function previewItem(id) {
  const item = contentState.items.find((entry) => String(entry.id) === String(id));
  if (!item) return;
  const config = getContentConfig(contentState.activeType);
  alert(`${getTitle(item, config)}\n\n${getDescription(item, config) || "Sem descricao."}`);
}

function closeEditor() {
  closeContentModal();
  resetEditorState();
}

function defaultFormData() {
  const config = getContentConfig(contentState.activeType);
  return {
    published: false,
    featured: false,
    sort_order: config.supportsSortOrder ? nextSortOrder() : undefined,
    value_json: contentState.activeType === "site_settings" ? {} : undefined
  };
}

function nextSortOrder() {
  return contentState.items.reduce((max, item) => Math.max(max, Number(item.sort_order || 0)), 0) + 1;
}

function preserveCommonFields(data) {
  return {
    title: data.title || data.name || data.question || data.label || "",
    sort_order: data.sort_order || nextSortOrder(),
    published: data.published === "on"
  };
}

function canMutateCurrentType() {
  if (contentState.activeType === "site_settings") return canEditSiteSettings();
  return canMutateContent();
}

function focusFirstError() {
  document.querySelector("[aria-invalid='true']")?.focus();
}

function showToastMessage(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.getElementById("toast-container")?.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => toast.remove(), 4200);
}

function isContentAction(action) {
  return [
    "create-content",
    "edit",
    "preview",
    "publish",
    "unpublish",
    "delete",
    "reload",
    "close-editor",
    "open-media-picker",
    "close-media-picker",
    "reload-media-picker",
    "select-media",
    "remove-media"
  ].includes(action);
}
