// assets/js/api.js
import { supabase } from './supabaseClient.js';
import { MOCK_PARTNERS } from './mock-data.js';

/**
 * Busca leads do Supabase com campos explícitos (minimização de dados).
 * Nunca usar select('*') — carregar apenas os campos necessários para a listagem.
 */
export async function getLeads() {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, nome, email, whatsapp, cidade, estado, tipo_cadastro, status_jornada, origem, utm_campaign, parceiro, whatsapp_optin, email_optin, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1000); // Limite de segurança — nunca carregar dados ilimitados

    if (error) {
      // Não expor detalhes do erro no console em produção
      throw new Error('Falha ao carregar cadastros.');
    }

    return leads || [];
  } catch (error) {
    // Log seguro — sem detalhes internos
    throw error;
  }
}

/**
 * Busca detalhes completos de um lead específico (para o modal).
 * Carregado sob demanda — evita over-fetching de campos sensíveis.
 */
export async function getLeadDetails(leadId) {
  if (!leadId || typeof leadId !== 'string') {
    throw new Error('ID inválido.');
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id, nome, email, whatsapp, cidade, estado, tipo_cadastro, status_jornada, origem, utm_campaign, parceiro, whatsapp_optin, email_optin, privacy_policy_version, observacoes, created_at, updated_at')
      .eq('id', leadId)
      .single();

    if (error) {
      throw new Error('Cadastro não encontrado.');
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Retorna todos os parceiros (Ainda usando Mock Data até criarmos a tabela partners)
 */
export async function getPartners() {
  return [...MOCK_PARTNERS];
}
