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

export async function createMediaAsset(payload) {
  if (payload.cloudinary_public_id) {
    const existing = await fetchTable("media_assets", {
      filters: {
        cloudinary_public_id: payload.cloudinary_public_id,
        active: true
      }
    });
    if (!existing.error && existing.data?.length) {
      return existing.data[0];
    }
  }
  return insertRecord("media_assets", payload, "Nao foi possivel registrar o asset de midia.");
}

export function updateMediaAsset(id, payload) {
  return updateRecord("media_assets", id, payload, "Nao foi possivel atualizar o asset de midia.");
}
