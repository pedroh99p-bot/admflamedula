import { deleteRecord, fetchOne, fetchTable, insertRecord, updateRecord } from "./supabaseService.js";

function listContent(tableName, filters = {}) {
  return fetchTable(tableName, { filters, orderBy: "sort_order", ascending: true });
}

function createContent(tableName, payload) {
  return insertRecord(tableName, payload, `Nao foi possivel criar registro em ${tableName}.`);
}

function updateContent(tableName, id, payload) {
  return updateRecord(tableName, id, payload, `Nao foi possivel atualizar registro em ${tableName}.`);
}

function deleteContent(tableName, id) {
  return deleteRecord(tableName, id, `Nao foi possivel excluir registro em ${tableName}.`);
}

export const listHeroNews = (filters) => listContent("hero_news", filters);
export const getHeroNews = (id) => fetchOne("hero_news", id);
export const createHeroNews = (payload) => createContent("hero_news", payload);
export const updateHeroNews = (id, payload) => updateContent("hero_news", id, payload);
export const deleteHeroNews = (id) => deleteContent("hero_news", id);

export const listActions = (filters) => listContent("actions", filters);
export const getAction = (id) => fetchOne("actions", id);
export const createAction = (payload) => createContent("actions", payload);
export const updateAction = (id, payload) => updateContent("actions", id, payload);
export const deleteAction = (id) => deleteContent("actions", id);

export const listMediaItems = (filters) => listContent("media_items", filters);
export const getMediaItem = (id) => fetchOne("media_items", id);
export const createMediaItem = (payload) => createContent("media_items", payload);
export const updateMediaItem = (id, payload) => updateContent("media_items", id, payload);
export const deleteMediaItem = (id) => deleteContent("media_items", id);

export const listTestimonials = (filters) => listContent("testimonials", filters);
export const createTestimonial = (payload) => createContent("testimonials", payload);
export const updateTestimonial = (id, payload) => updateContent("testimonials", id, payload);
export const deleteTestimonial = (id) => deleteContent("testimonials", id);

export const listTeamMembers = (filters) => listContent("team_members", filters);
export const createTeamMember = (payload) => createContent("team_members", payload);
export const updateTeamMember = (id, payload) => updateContent("team_members", id, payload);
export const deleteTeamMember = (id) => deleteContent("team_members", id);

export const listFaqItems = (filters) => listContent("faq_items", filters);
export const createFaqItem = (payload) => createContent("faq_items", payload);
export const updateFaqItem = (id, payload) => updateContent("faq_items", id, payload);
export const deleteFaqItem = (id) => deleteContent("faq_items", id);

export const listTransparencyMetrics = (filters) => listContent("transparency_metrics", filters);
export const createTransparencyMetric = (payload) => createContent("transparency_metrics", payload);
export const updateTransparencyMetric = (id, payload) => updateContent("transparency_metrics", id, payload);
export const deleteTransparencyMetric = (id) => deleteContent("transparency_metrics", id);

export const listSiteSettings = (filters) => fetchTable("site_settings", { filters, orderBy: "key", ascending: true });
export const createSiteSetting = (payload) => createContent("site_settings", payload);
export const updateSiteSetting = (id, payload) => updateContent("site_settings", id, payload);
export const deleteSiteSetting = (id) => deleteContent("site_settings", id);
