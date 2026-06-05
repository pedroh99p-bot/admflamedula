const cities = [
  { cidade: "Rio de Janeiro", estado: "RJ", ddd: "21" },
  { cidade: "Niterói", estado: "RJ", ddd: "21" },
  { cidade: "São Paulo", estado: "SP", ddd: "11" },
  { cidade: "Campinas", estado: "SP", ddd: "19" },
  { cidade: "Belo Horizonte", estado: "MG", ddd: "31" },
  { cidade: "Juiz de Fora", estado: "MG", ddd: "32" },
  { cidade: "Curitiba", estado: "PR", ddd: "41" },
  { cidade: "Porto Alegre", estado: "RS", ddd: "51" },
  { cidade: "Brasília", estado: "DF", ddd: "61" },
  { cidade: "Salvador", estado: "BA", ddd: "71" },
  { cidade: "Recife", estado: "PE", ddd: "81" },
  { cidade: "Fortaleza", estado: "CE", ddd: "85" }
];

const donorNames = [
  "Ana Clara Martins", "Bruno Henrique Lima", "Carolina Peixoto", "Daniel Souza", "Eduarda Nascimento",
  "Felipe Azevedo", "Gabriela Costa", "Hugo Fernandes", "Isabela Rocha", "João Pedro Alves",
  "Larissa Menezes", "Marcos Vinícius Prado", "Natália Ribeiro", "Otávio Farias", "Paula Moreira",
  "Rafael Teixeira", "Sabrina Castro", "Thiago Barbosa", "Vitória Lopes", "Wesley Andrade",
  "Amanda Tavares", "Bernardo Corrêa", "Camila Duarte", "Diego Ramos", "Eloá Cardoso",
  "Fernando Moraes", "Giovana Batista", "Henrique Sales", "Ingrid Cavalcanti", "Júlia Pires",
  "Leonardo Matos", "Marina Guimarães", "Nicolas Viana", "Olívia Reis", "Pedro Henrique Dias",
  "Queila Monteiro", "Renata Queiroz", "Samuel Braga", "Tainá Campos", "Uriel Macedo",
  "Vanessa Assis", "William Nogueira", "Yasmin Freitas", "Zeca Amaral", "Bianca Neves",
  "Caio Siqueira", "Débora Figueiredo", "Enzo Melo"
];

const patientNames = [
  "Miguel Santos", "Helena Araújo", "Arthur Gomes", "Laura Oliveira", "Davi Ferreira", "Manuela Barros",
  "Lucas Almeida", "Sophia Martins", "Heitor Ribeiro", "Alice Carvalho", "Benício Costa", "Luísa Rocha",
  "Theo Barbosa", "Valentina Lima", "Cecília Duarte", "Gabriel Moreira"
];

const diagnoses = [
  "Leucemia mieloide aguda", "Linfoma de Hodgkin", "Anemia aplástica severa", "Talassemia maior",
  "Leucemia linfoblástica aguda", "Síndrome mielodisplásica"
];

const hospitals = [
  "Hospital Universitário Clementino Fraga Filho", "INCA - Instituto Nacional de Câncer",
  "Hospital das Clínicas da USP", "Hospital Felício Rocho", "Hospital Pequeno Príncipe",
  "Hospital Santa Casa de Porto Alegre", "Hospital de Base do DF", "Hospital São Rafael"
];

const doctors = [
  "Dra. Camila Rezende", "Dr. Marcelo Torres", "Dra. Renata Albuquerque", "Dr. André Vianna",
  "Dra. Luciana Paiva", "Dr. Roberto Falcão", "Dra. Helena Mariz", "Dr. Gustavo Lacerda"
];

const bloodTypes = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"];
const donorStatuses = ["novo", "em_contato", "apto", "aguardando_documentos", "encaminhado_redome", "inativo"];
const patientStatuses = ["em_analise", "urgente", "acompanhamento", "compatibilidade_encontrada"];
const paymentStatuses = ["pago", "pendente", "pago", "pago", "pendente", "cancelado"];
const paymentMethods = ["Pix", "Cartão de crédito", "Boleto", "Transferência"];

function daysAgo(days, hour = 10) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function slug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "");
}

function phoneFor(city, index) {
  const suffix = String(2300 + index * 137).slice(-4);
  const prefix = String(9100 + index * 61).slice(-4);
  return `(${city.ddd}) 9${prefix}-${suffix}`;
}

export const donor_leads = donorNames.map((nome, index) => {
  const city = cities[index % cities.length];
  const status = donorStatuses[index % donorStatuses.length];
  return {
    id: `donor_${String(index + 1).padStart(3, "0")}`,
    nome,
    email: `${slug(nome)}@exemplo.org`,
    telefone: phoneFor(city, index + 1),
    cidade: city.cidade,
    estado: city.estado,
    idade: 18 + (index % 41),
    peso: 52 + (index % 39),
    tipo_sanguineo: bloodTypes[index % bloodTypes.length],
    ja_doador_sangue: index % 3 !== 0,
    quer_doar_sangue: index % 4 !== 1,
    quer_doar_medula: index % 5 !== 2,
    contato_whatsapp_realizado: index % 3 === 0 || index % 4 === 0,
    status,
    created_at: daysAgo((index * 2) % 84, 9 + (index % 8))
  };
});

export const patients = patientNames.map((nome_paciente, index) => {
  const city = cities[(index * 2 + 3) % cities.length];
  const doctor = doctors[index % doctors.length];
  return {
    id: `patient_${String(index + 1).padStart(3, "0")}`,
    nome_paciente,
    idade: 4 + (index * 3) % 58,
    diagnostico: diagnoses[index % diagnoses.length],
    tipo_sanguineo: bloodTypes[(index + 2) % bloodTypes.length],
    necessita_medula: index % 4 !== 0,
    hospital: hospitals[index % hospitals.length],
    cidade: city.cidade,
    estado: city.estado,
    contato_whatsapp_realizado: index % 2 === 0 || index % 5 === 0,
    nome_medico: doctor,
    crm_medico: `${city.estado}-${String(42000 + index * 379)}`,
    telefone_responsavel: phoneFor(city, index + 71),
    status: patientStatuses[index % patientStatuses.length],
    created_at: daysAgo((index * 5) % 96, 8 + (index % 7))
  };
});

const donationNames = [
  "Ana Clara Martins", "Fla Nação Solidária", "Bruno Henrique Lima", "Marina Guimarães", "Torcida Rubro-Negra",
  "Sabrina Castro", "Hospital Parceiro Vida", "Leonardo Matos", "Paula Moreira", "Renata Queiroz",
  "João Pedro Alves", "Giovana Batista", "Campanha Família Fla", "Fernando Moraes", "Camila Duarte",
  "Niterói pela Medula", "Thiago Barbosa", "Vitória Lopes", "Amanda Tavares", "Rafael Teixeira",
  "Larissa Menezes", "Pedro Henrique Dias"
];

const donationValues = [
  50, 250, 75, 120, 500, 35, 900, 80, 150, 60, 100, 45, 700, 130, 95, 340, 55, 180, 40, 220, 70, 110
];

export const monetary_donations = donationNames.map((nome, index) => {
  const city = cities[(index + 5) % cities.length];
  return {
    id: `donation_${String(index + 1).padStart(3, "0")}`,
    nome,
    email: `${slug(nome)}@doacoes.org`,
    telefone: phoneFor(city, index + 121),
    valor: donationValues[index],
    metodo_pagamento: paymentMethods[index % paymentMethods.length],
    status_pagamento: paymentStatuses[index % paymentStatuses.length],
    created_at: daysAgo((index * 3) % 90, 11 + (index % 6))
  };
});

export const MOCK_DONOR_LEADS = donor_leads;
export const MOCK_PATIENTS = patients;
export const MOCK_MONETARY_DONATIONS = monetary_donations;
