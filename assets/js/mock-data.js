export const MOCK_PARTNERS = [
  { id: "p1", nome: "Torcida Jovem Fla", tipo: "torcida", cidade: "Rio de Janeiro", estado: "RJ" },
  { id: "p2", nome: "Atlética Medicina UFRJ", tipo: "faculdade", cidade: "Rio de Janeiro", estado: "RJ" },
  { id: "p3", nome: "Empresa XPTO", tipo: "empresa", cidade: "São Paulo", estado: "SP" },
  { id: "p4", nome: "Ong Vida Nova", tipo: "ong", cidade: "Belo Horizonte", estado: "MG" }
];

export const MOCK_LEADS = [];
const nomes = ["Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena", "Igor", "Juliana", "Lucas", "Mariana", "Nicolas", "Olivia", "Pedro", "Quintino", "Rafael", "Sofia", "Tiago", "Ursula"];
const sobrenomes = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes"];
const cidades = [
  { c: "Rio de Janeiro", e: "RJ" }, { c: "São Paulo", e: "SP" }, { c: "Belo Horizonte", e: "MG" }, 
  { c: "Niterói", e: "RJ" }, { c: "Campinas", e: "SP" }, { c: "Curitiba", e: "PR" }, { c: "Brasília", e: "DF" }
];
const tipos = ["ja_sou_doador", "nao_sou_doador_ainda", "quero_ajudar_divulgar", "instituicao_ou_parceiro"];
const status = ["novo", "boas_vindas_enviada", "em_educacao", "interessado", "orientado", "cadastrado_no_redome", "quer_ajudar", "sem_resposta", "descadastrado", "invalido"];
const origens = ["instagram", "facebook", "whatsapp", "site", "indicacao"];
const campanhas = ["fla_medula_lancamento", "post_organico", "stories_influenciador", "campanha_fla_tv", "nenhuma"];

// Gerar 50 leads fictícios
for (let i = 1; i <= 50; i++) {
  const nome = nomes[Math.floor(Math.random() * nomes.length)];
  const sobrenome = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
  const cidadeObj = cidades[Math.floor(Math.random() * cidades.length)];
  
  // Distribuir datas nos últimos 60 dias
  const diasAtras = Math.floor(Math.random() * 60);
  const dataCriacao = new Date();
  dataCriacao.setDate(dataCriacao.getDate() - diasAtras);
  
  // Atualização pode ser igual a criação ou mais recente
  const dataAtualizacao = new Date(dataCriacao);
  if (Math.random() > 0.5) {
    dataAtualizacao.setDate(dataAtualizacao.getDate() + Math.floor(Math.random() * 5));
    if (dataAtualizacao > new Date()) dataAtualizacao.setTime(new Date().getTime());
  }

  const optinWpp = Math.random() > 0.2; // 80% tem optin

  MOCK_LEADS.push({
    id: `lead_${String(i).padStart(3, '0')}`,
    nome: `${nome} ${sobrenome}`,
    email: `${nome.toLowerCase()}.${sobrenome.toLowerCase()}@exemplo.com`,
    whatsapp: `(${cidadeObj.e === 'RJ' ? '21' : '11'}) 9${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
    cidade: cidadeObj.c,
    estado: cidadeObj.e,
    tipo_cadastro: tipos[Math.floor(Math.random() * tipos.length)],
    status_jornada: status[Math.floor(Math.random() * status.length)],
    origem: origens[Math.floor(Math.random() * origens.length)],
    utm_source: origens[Math.floor(Math.random() * origens.length)],
    utm_medium: "social",
    utm_campaign: campanhas[Math.floor(Math.random() * campanhas.length)],
    parceiro: Math.random() > 0.7 ? MOCK_PARTNERS[Math.floor(Math.random() * MOCK_PARTNERS.length)].nome : null,
    whatsapp_optin: optinWpp,
    email_optin: Math.random() > 0.3,
    privacy_policy_version: "v1.0",
    created_at: dataCriacao.toISOString(),
    updated_at: dataAtualizacao.toISOString(),
    observacoes: `Lead captado na campanha. ${optinWpp ? 'Aceitou contato via WhatsApp.' : 'Recusou contato.'}`
  });
}
