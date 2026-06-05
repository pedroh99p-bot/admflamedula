// assets/js/supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ATENÇÃO: Substitua pelas suas credenciais do projeto no Supabase.
// Você encontra essas chaves no Dashboard do Supabase em: Settings > API
const supabaseUrl = 'https://mabujqfyxylfkrtxsbti.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYnVqcWZ5eHlsZmtydHhzYnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MDc4NjMsImV4cCI6MjA5NDM4Mzg2M30.GOs5yf9piMSiX95-3LfuGoE5bhycUBX6DP8tXKNOZQw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
