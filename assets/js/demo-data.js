const now = Date.now();
const day = 24 * 60 * 60 * 1000;

function dateDaysAgo(days) {
  return new Date(now - (days * day)).toISOString();
}

const plannedDonors = [
  ["FIC Joao A+ RJ", "Rio de Janeiro", "RJ", "Tijuca", "A+", true, true, false, true, true, "whatsapp"],
  ["FIC Carla O+ RJ", "Rio de Janeiro", "RJ", "Centro", "O+", true, true, false, true, true, "whatsapp"],
  ["FIC Marcos O- RJ", "Niteroi", "RJ", "Icarai", "O-", true, true, true, true, true, "whatsapp"],
  ["FIC Renata Medula RJ", "Niteroi", "RJ", "Santa Rosa", "A+", false, false, true, true, true, "whatsapp"],
  ["FIC Lucas A- SP", "Sao Paulo", "SP", "Pinheiros", "A-", true, true, false, true, false, "whatsapp"],
  ["FIC Bianca O+ SP", "Sao Paulo", "SP", "Mooca", "O+", true, true, false, true, true, "whatsapp"],
  ["FIC Paulo B+ MG", "Belo Horizonte", "MG", "Savassi", "B+", true, true, false, true, false, "whatsapp"],
  ["FIC Fernanda AB+ BA", "Salvador", "BA", "Barra", "AB+", true, true, true, true, true, "whatsapp"],
  ["FIC Doador OptOut", "Rio de Janeiro", "RJ", "Botafogo", "O-", true, true, true, true, true, "whatsapp"]
];

const cities = [
  ["Rio de Janeiro", "RJ", "Tijuca"],
  ["Niteroi", "RJ", "Icarai"],
  ["Sao Paulo", "SP", "Pinheiros"],
  ["Campinas", "SP", "Cambui"],
  ["Belo Horizonte", "MG", "Savassi"],
  ["Salvador", "BA", "Barra"],
  ["Recife", "PE", "Boa Viagem"]
];

const bloodTypes = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
const channels = ["whatsapp", "email", "telefone"];
const availability = ["manha", "tarde", "noite", "fins_de_semana"];

export const demoDonors = [
  ...plannedDonors.map((item, index) => ({
    id: `fic-donor-${String(index + 1).padStart(3, "0")}`,
    nome: item[0],
    email: `fic.doador.${index + 1}@demo.flamedula.org`,
    telefone: `21988${String(100000 + index).slice(-6)}`,
    cidade: item[1],
    estado: item[2],
    bairro: item[3],
    tipo_sanguineo: item[4],
    ja_doador_sangue: item[5],
    quer_doar_sangue: item[6],
    quer_doar_medula: item[7],
    consentimento_contato: item[8],
    quer_receber_campanhas: item[9],
    canal_preferido: item[10],
    contato_whatsapp_realizado: index % 3 === 0,
    opt_out: item[0] === "FIC Doador OptOut",
    disponibilidade: availability[index % availability.length],
    status: index % 4 === 0 ? "em_contato" : "apto",
    origem: "fic_demo_frontend",
    observacoes: "Registro FIC de demonstracao. Nao salvar no Supabase.",
    ultima_notificacao_em: index % 5 === 0 ? dateDaysAgo(3) : null,
    total_notificacoes: index % 4,
    created_at: dateDaysAgo(index + 1),
    __isDemo: true
  })),
  ...Array.from({ length: 31 }, (_, offset) => {
    const index = offset + plannedDonors.length;
    const city = cities[index % cities.length];
    const bloodType = bloodTypes[index % bloodTypes.length];
    return {
      id: `fic-donor-${String(index + 1).padStart(3, "0")}`,
      nome: `FIC Doador Teste ${String(offset + 1).padStart(2, "0")}`,
      email: `fic.doador.teste.${offset + 1}@demo.flamedula.org`,
      telefone: `11977${String(200000 + offset).slice(-6)}`,
      cidade: city[0],
      estado: city[1],
      bairro: city[2],
      tipo_sanguineo: bloodType,
      ja_doador_sangue: index % 2 === 0,
      quer_doar_sangue: index % 3 !== 0,
      quer_doar_medula: index % 4 === 0 || city[1] === "BA",
      consentimento_contato: index % 7 !== 0,
      quer_receber_campanhas: index % 5 !== 0,
      canal_preferido: channels[index % channels.length],
      contato_whatsapp_realizado: index % 4 === 0,
      opt_out: index % 17 === 0,
      disponibilidade: availability[index % availability.length],
      status: index % 6 === 0 ? "novo" : index % 5 === 0 ? "em_contato" : "apto",
      origem: "fic_demo_frontend",
      observacoes: "Registro FIC de demonstracao. Nao salvar no Supabase.",
      ultima_notificacao_em: index % 9 === 0 ? dateDaysAgo(2) : index % 8 === 0 ? dateDaysAgo(12) : null,
      total_notificacoes: index % 5,
      created_at: dateDaysAgo(index + 1),
      __isDemo: true
    };
  })
];

export const demoPatients = [
  {
    id: "fic-patient-001",
    nome_paciente: "FIC Paciente Ana A+ RJ",
    idade: 34,
    diagnostico: "Anemia severa FIC",
    tipo_sanguineo: "A+",
    tipo_necessidade: "sangue",
    urgencia: "alta",
    necessita_medula: false,
    hospital: "Hospital Municipal FIC RJ",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    nome_medico: "Dra FIC Helena",
    crm_medico: "CRM-FIC-1001",
    telefone_responsavel: "21988880001",
    autorizacao_divulgacao: true,
    usar_nome_paciente: true,
    mensagem_publica: "Paciente FIC precisa de mobilizacao de doadores A+ no Rio de Janeiro.",
    contato_whatsapp_realizado: false,
    status: "urgente",
    origem: "fic_demo_frontend",
    observacoes: "Cenario FIC para mobilizacao A+ RJ.",
    created_at: dateDaysAgo(1),
    __isDemo: true
  },
  {
    id: "fic-patient-002",
    nome_paciente: "FIC Paciente Bruno O+ SP",
    idade: 42,
    diagnostico: "Procedimento cirurgico FIC",
    tipo_sanguineo: "O+",
    tipo_necessidade: "sangue",
    urgencia: "media",
    necessita_medula: false,
    hospital: "Hospital FIC Sao Paulo",
    cidade: "Sao Paulo",
    estado: "SP",
    nome_medico: "Dr FIC Andre",
    crm_medico: "CRM-FIC-1002",
    telefone_responsavel: "11988880002",
    autorizacao_divulgacao: true,
    usar_nome_paciente: false,
    mensagem_publica: "Caso FIC precisa de doadores O+ ou O- em Sao Paulo.",
    contato_whatsapp_realizado: false,
    status: "em_analise",
    origem: "fic_demo_frontend",
    observacoes: "Cenario FIC para mobilizacao O+ SP.",
    created_at: dateDaysAgo(2),
    __isDemo: true
  },
  {
    id: "fic-patient-003",
    nome_paciente: "FIC Paciente Clara Medula RJ",
    idade: 19,
    diagnostico: "Busca por medula FIC",
    tipo_sanguineo: "O-",
    tipo_necessidade: "medula",
    urgencia: "alta",
    necessita_medula: true,
    hospital: "Hospital Universitario FIC Niteroi",
    cidade: "Niteroi",
    estado: "RJ",
    nome_medico: "Dra FIC Laura",
    crm_medico: "CRM-FIC-1003",
    telefone_responsavel: "21988880003",
    autorizacao_divulgacao: false,
    usar_nome_paciente: false,
    mensagem_publica: "",
    contato_whatsapp_realizado: false,
    status: "urgente",
    origem: "fic_demo_frontend",
    observacoes: "Cenario FIC para priorizar doadores de medula.",
    created_at: dateDaysAgo(3),
    __isDemo: true
  },
  {
    id: "fic-patient-004",
    nome_paciente: "FIC Paciente Diego Plaquetas MG",
    idade: 51,
    diagnostico: "Plaquetas FIC",
    tipo_sanguineo: "B+",
    tipo_necessidade: "plaquetas",
    urgencia: "media",
    necessita_medula: false,
    hospital: "Hospital FIC Belo Horizonte",
    cidade: "Belo Horizonte",
    estado: "MG",
    nome_medico: "Dr FIC Mauro",
    crm_medico: "CRM-FIC-1004",
    telefone_responsavel: "31988880004",
    autorizacao_divulgacao: true,
    usar_nome_paciente: true,
    mensagem_publica: "Paciente FIC precisa de plaquetas em Belo Horizonte.",
    contato_whatsapp_realizado: true,
    status: "acompanhamento",
    origem: "fic_demo_frontend",
    observacoes: "Cenario FIC para plaquetas MG.",
    created_at: dateDaysAgo(4),
    __isDemo: true
  },
  {
    id: "fic-patient-005",
    nome_paciente: "FIC Paciente Elisa Campanha Medula BA",
    idade: 27,
    diagnostico: "Campanha de cadastro FIC",
    tipo_sanguineo: "AB+",
    tipo_necessidade: "campanha_cadastro_medula",
    urgencia: "baixa",
    necessita_medula: true,
    hospital: "Hospital FIC Salvador",
    cidade: "Salvador",
    estado: "BA",
    nome_medico: "Dra FIC Nadia",
    crm_medico: "CRM-FIC-1005",
    telefone_responsavel: "71988880005",
    autorizacao_divulgacao: true,
    usar_nome_paciente: true,
    mensagem_publica: "Campanha FIC para cadastro de medula em Salvador.",
    contato_whatsapp_realizado: false,
    status: "em_analise",
    origem: "fic_demo_frontend",
    observacoes: "Cenario FIC para campanha de medula BA.",
    created_at: dateDaysAgo(5),
    __isDemo: true
  },
  ...["Recife", "Campinas", "Rio de Janeiro", "Sao Paulo", "Belo Horizonte"].map((cidade, index) => {
    const city = cities.find((item) => item[0] === cidade) || cities[index];
    return {
      id: `fic-patient-${String(index + 6).padStart(3, "0")}`,
      nome_paciente: `FIC Paciente Extra ${index + 1}`,
      idade: 22 + index * 6,
      diagnostico: "Cenario extra FIC",
      tipo_sanguineo: bloodTypes[(index + 3) % bloodTypes.length],
      tipo_necessidade: index % 2 === 0 ? "sangue" : "medula",
      urgencia: index % 3 === 0 ? "alta" : index % 3 === 1 ? "media" : "baixa",
      necessita_medula: index % 2 === 1,
      hospital: `Hospital FIC ${city[0]}`,
      cidade: city[0],
      estado: city[1],
      nome_medico: "Equipe Medica FIC",
      crm_medico: `CRM-FIC-20${index}`,
      telefone_responsavel: `8198888000${index}`,
      autorizacao_divulgacao: index % 2 === 0,
      usar_nome_paciente: index % 2 === 0,
      mensagem_publica: "Mensagem publica FIC para campanha de teste.",
      contato_whatsapp_realizado: index % 2 === 0,
      status: index % 2 === 0 ? "em_analise" : "acompanhamento",
      origem: "fic_demo_frontend",
      observacoes: "Paciente FIC extra para volume de graficos.",
      created_at: dateDaysAgo(index + 6),
      __isDemo: true
    };
  })
];

const donationSeeds = [
  ["FIC Ana Recorrente", 50, "pix_recorrente", "intencao_recorrente"],
  ["FIC Bruno Camisa", 300, "cartao_recorrente", "redirecionado_plataforma"],
  ["FIC Carla Ouro", 500, "plataforma_doacao", "confirmado_demo"],
  ["FIC Diego Pix", 25, "pix_unico", "pendente"],
  ["FIC Embaixadora", 700, "plataforma_doacao", "confirmado_demo"],
  ["FIC Helena Pix", 120, "pix_unico", "confirmado"],
  ["FIC Igor Plataforma", 80, "plataforma_doacao", "redirecionado_plataforma"],
  ["FIC Julia Cartao", 180, "cartao_unico", "confirmado"],
  ["FIC Karen Recorrente", 60, "pix_recorrente", "intencao_recorrente"],
  ["FIC Leo Pendente", 35, "pix_unico", "pendente"],
  ["FIC Manu Apoio", 220, "cartao_recorrente", "redirecionado_plataforma"],
  ["FIC Nando Ouro", 450, "plataforma_doacao", "confirmado_demo"],
  ["FIC Olivia Bronze", 55, "pix_unico", "confirmado"],
  ["FIC Paula Prata", 150, "pix_recorrente", "intencao_recorrente"],
  ["FIC Renato Plataforma", 95, "plataforma_doacao", "redirecionado_plataforma"]
];

export const demoDonations = donationSeeds.map((item, index) => ({
  id: `fic-donation-${String(index + 1).padStart(3, "0")}`,
  nome: item[0],
  email: `fic.apoio.${index + 1}@demo.flamedula.org`,
  telefone: `21966${String(300000 + index).slice(-6)}`,
  valor: item[1],
  metodo_pagamento: item[2],
  status_pagamento: item[3],
  payment_id: `FIC-PAY-${String(index + 1).padStart(3, "0")}`,
  origem: "fic_demo_frontend",
  created_at: dateDaysAgo(index + 1),
  __isDemo: true
}));
