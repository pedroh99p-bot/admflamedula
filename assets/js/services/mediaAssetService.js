import { fetchTable, insertRecord, updateRecord } from "./supabaseService.js";

export function listMediaAssets(filters = {}) {
  return fetchTable("media_assets", { filters });
}

export function listMediaAssetLibrary({ assetUsage = "" } = {}) {
  const filters = { active: true };
  if (assetUsage) filters.asset_usage = assetUsage;
  return fetchTable("v_media_assets_library", {
    filters,
    orderBy: "created_at",
    ascending: false
  });
}

export function createMediaAsset(payload) {
  return insertRecord("media_assets", payload, "Nao foi possivel registrar o asset de midia.");
}

export function updateMediaAsset(id, payload) {
  return updateRecord("media_assets", id, payload, "Nao foi possivel atualizar o asset de midia.");
}
