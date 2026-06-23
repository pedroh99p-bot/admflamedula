export function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export function getPreferredImageUrl(item = {}) {
  return item.card_url
    || item.webp_url
    || item.preferred_delivery_url
    || item.delivery_url
    || item.secure_url
    || item.image_url
    || item.thumbnail_url
    || "";
}

export function getTitle(item, config) {
  return item?.[config.titleField] || item?.title || item?.name || item?.key || "Sem titulo";
}

export function getDescription(item, config) {
  return item?.[config.descriptionField] || item?.summary || item?.description || "";
}
