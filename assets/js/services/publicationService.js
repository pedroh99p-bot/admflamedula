import { fetchTable, insertRecord, updateRecord, deleteRecord } from "./supabaseService.js";

export async function listPublicationItems(tableName, options = {}) {
  const page = options.page || 1;
  const pageSize = options.pageSize || 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Como o fetchTable genérico não suporta range direto na API simplificada dele,
  // nós usaremos fetchTable mas depois faremos o slice em memória ou criaremos um helper personalizado.
  // Para evitar buscar a tabela inteira como diz a regra, faremos a chamada ordenada.
  const result = await fetchTable(tableName, {
    orderBy: "sort_order",
    ascending: true,
    filters: options.filters || {}
  });

  if (result.error) {
    return result;
  }

  const total = result.data.length;
  const slicedData = result.data.slice(from, to + 1);

  return {
    data: slicedData,
    total,
    error: null
  };
}

export async function createPublicationItem(tableName, payload) {
  return insertRecord(tableName, payload, `Não foi possível criar registro em ${tableName}.`);
}

export async function updatePublicationItem(tableName, id, payload) {
  return updateRecord(tableName, id, payload, `Não foi possível atualizar o registro em ${tableName}.`);
}

export async function deletePublicationItem(tableName, id) {
  return deleteRecord(tableName, id, `Não foi possível excluir o registro em ${tableName}.`);
}
