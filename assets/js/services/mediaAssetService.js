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

export async function findMediaAssetByCloudinaryPublicId(publicId) {
  if (!publicId) return null;
  const existing = await fetchTable("media_assets", {
    filters: {
      cloudinary_public_id: publicId
    }
  });
  if (existing.error) return null;
  return existing.data?.[0] || null;
}

export async function createMediaAsset(payload) {
  if (payload.cloudinary_public_id) {
    const existing = await findMediaAssetByCloudinaryPublicId(payload.cloudinary_public_id);
    if (existing) return existing;
  }
  return insertRecord("media_assets", payload, "Nao foi possivel registrar o asset de midia.");
}

export function updateMediaAsset(id, payload) {
  return updateRecord("media_assets", id, payload, "Nao foi possivel atualizar o asset de midia.");
}
