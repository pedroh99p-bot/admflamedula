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
