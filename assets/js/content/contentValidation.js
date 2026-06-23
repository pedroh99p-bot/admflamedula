import { getContentConfig } from "./contentRegistry.js";

export function validateContentPayload(type, payload) {
  const config = getContentConfig(type);
  const errors = {};

  config.fields.forEach((field) => {
    const value = payload[field.name];
    if (field.required && (value === null || value === undefined || String(value).trim() === "")) {
      errors[field.name] = `${field.label} e obrigatorio.`;
    }

    if (field.type === "url" && value && !isValidUrl(value)) {
      errors[field.name] = "Informe uma URL valida.";
    }
  });

  if (config.supportsSortOrder && payload.sort_order !== undefined && !Number.isFinite(Number(payload.sort_order))) {
    errors.sort_order = "Ordem precisa ser numerica.";
  }

  return errors;
}

export function parseJsonValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "#"].includes(url.protocol) || value.startsWith("#");
  } catch {
    return String(value).startsWith("#");
  }
}
