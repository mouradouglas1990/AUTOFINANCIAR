// ============================================
// AutoFinance Multibancos — bank-adapters.js
// ============================================
//
// PROPÓSITO
// Cada banco tem sua própria API (formatos, autenticação e regras diferentes).
// Este arquivo isola essa diferença: cada banco ganha um "adaptador" — uma função
// que recebe os dados do cliente/veículo no formato PADRÃO do AutoFinance, chama
// a API real daquele banco, e devolve a resposta TAMBÉM no formato padrão.
//
// Assim, o resto do sistema (simulador, histórico, relatórios) nunca precisa
// saber como cada banco específico funciona — só conhece o formato padrão.
//
// COMO LIGAR UM BANCO DE VERDADE
// 1. Quando você tiver credenciais reais de API de um banco (client_id, secret,
//    certificado, token, o que o banco exigir), preencha a config em
//    BANK_API_CONFIG abaixo com a URL real e as credenciais.
// 2. Implemente a função adapter daquele banco (veja o exemplo `adapterItau`
//    como modelo) fazendo o fetch() real para a API do banco.
// 3. Mude STATUS daquele banco de 'simulado' para 'integrado' no BANK_API_CONFIG.
// Nenhuma outra parte do sistema precisa ser alterada.
//
// SEGURANÇA IMPORTANTE
// Client secrets e tokens de API NUNCA devem ficar hardcoded neste arquivo
// JS (ele é público, qualquer um pode ler o código no navegador). Quando for
// integrar de verdade, essas chamadas precisam passar por um backend/função
// serverless que guarda o segredo (ex: Firebase Cloud Functions). Por enquanto,
// como ainda não há nenhuma API real conectada, isso não é um problema --
// mas é um passo obrigatório antes de colocar a primeira chave real aqui.

// ── CONFIGURAÇÃO POR BANCO ────────────────────
// status: 'simulado'  -> usa cálculo local (fórmula), como o sistema já fazia
//         'integrado' -> chama a API real do banco via adapter
const BANK_API_CONFIG = {
  bv:        { status: 'simulado', baseUrl: '', adapter: null },
  safra:     { status: 'simulado', baseUrl: '', adapter: null },
  santander: { status: 'simulado', baseUrl: '', adapter: null },
  itau:      { status: 'simulado', baseUrl: '', adapter: null },
  bradesco:  { status: 'simulado', baseUrl: '', adapter: null },
  carbank:   { status: 'simulado', baseUrl: '', adapter: null },
  pan:       { status: 'simulado', baseUrl: '', adapter: null },
  c6:        { status: 'simulado', baseUrl: '', adapter: null },
  gmac:      { status: 'simulado', baseUrl: '', adapter: null },
  bb:        { status: 'simulado', baseUrl: '', adapter: null },
  caixa:     { status: 'simulado', baseUrl: '', adapter: null },
  rodobens:  { status: 'simulado', baseUrl: '', adapter: null },
  porto:     { status: 'simulado', baseUrl: '', adapter: null },
  vw:        { status: 'simulado', baseUrl: '', adapter: null },
  toyota:    { status: 'simulado', baseUrl: '', adapter: null },
};

// ── FORMATO PADRÃO DE ENTRADA (o que todo adapter recebe) ─────
// {
//   valorVeiculo: number,
//   valorEntrada: number,
//   financiado:   number,
//   prazoMeses:   number,
//   tipoVeiculo:  'novo' | 'seminovo' | 'usado',
//   cliente: { nome, cpf, dataNascimento, renda, scoreCredito, ... } // quando disponível
// }

// ── FORMATO PADRÃO DE SAÍDA (o que todo adapter deve devolver) ─────
// {
//   bancoId:    string,
//   banco:      string,
//   status:     'Aprovado' | 'Pendente' | 'Reprovado' | 'Erro',
//   financiado: number,
//   entradaMin: number,
//   parcela:    number,
//   prazo:      number,
//   taxa:       number,   // % a.m.
//   cet:        number,   // % a.a.
//   totalPago:  number,
//   origem:     'simulado' | 'integrado',
//   erro:       string | null,
// }

// ── CÁLCULO LOCAL (fallback / modo simulado) ──────
// Mesma lógica que já existia em app.js, agora isolada aqui para reuso.
function calcularSimulado(banco, dados) {
  const { valorVeiculo, financiado, prazoMeses, tipoVeiculo } = dados;
  const fator = tipoVeiculo === 'usado' ? 0.15 : tipoVeiculo === 'novo' ? -0.05 : 0;
  const taxa = randomBetween(banco.taxaMin + fator, banco.taxaMax + fator);
  const parcela = calcParcela(financiado, taxa / 100, prazoMeses);
  const totalPago = parcela * prazoMeses;
  const cet = (taxa + banco.cetAdd) * 12;
  const entradaMin = valorVeiculo * 0.20;
  const aprovado = financiado > 0 && financiado <= valorVeiculo * 0.80;

  return {
    bancoId: banco.id,
    banco: banco.nome,
    status: aprovado ? 'Aprovado' : 'Pendente',
    financiado,
    entradaMin,
    parcela,
    prazo: prazoMeses,
    taxa,
    cet,
    totalPago,
    origem: 'simulado',
    erro: null,
  };
}

// ── ADAPTER DE EXEMPLO (MODELO PARA QUANDO HOUVER API REAL) ──────
// Esta função NÃO é chamada hoje (Itaú está como 'simulado' em BANK_API_CONFIG).
// Ela existe só como referência de como um adapter real deve ser estruturado.
// Quando você tiver a API oficial do Itaú, ajuste a URL/payload conforme a
// documentação real deles e mude o status para 'integrado'.
async function adapterItauExemplo(dados, config) {
  try {
    // ATENÇÃO: nunca coloque client_secret/token aqui diretamente.
    // Esta chamada deveria ir para o SEU backend (ex: Firebase Cloud Function),
    // que por sua vez chama a API do banco guardando o segredo em segurança.
    // Exemplo: const response = await fetch('https://SEU_BACKEND/api/itau/simular', {...})

    const response = await fetch(config.baseUrl + '/simulacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valorVeiculo: dados.valorVeiculo,
        valorFinanciado: dados.financiado,
        prazoMeses: dados.prazoMeses,
        // ... demais campos exigidos pela API real do banco
      }),
    });

    if (!response.ok) throw new Error(`API retornou status ${response.status}`);
    const json = await response.json();

    // Aqui você traduziria os campos da resposta REAL do banco para o
    // formato padrão do AutoFinance. Os nomes abaixo são apenas ilustrativos.
    return {
      bancoId: 'itau',
      banco: 'Itaú',
      status: json.aprovado ? 'Aprovado' : 'Reprovado',
      financiado: dados.financiado,
      entradaMin: dados.valorVeiculo * 0.20,
      parcela: json.valorParcela,
      prazo: dados.prazoMeses,
      taxa: json.taxaJurosMensal,
      cet: json.cetAnual,
      totalPago: json.valorParcela * dados.prazoMeses,
      origem: 'integrado',
      erro: null,
    };
  } catch (e) {
    return {
      bancoId: 'itau',
      banco: 'Itaú',
      status: 'Erro',
      financiado: dados.financiado,
      entradaMin: 0,
      parcela: 0,
      prazo: dados.prazoMeses,
      taxa: 0,
      cet: 0,
      totalPago: 0,
      origem: 'integrado',
      erro: e.message || 'Falha ao consultar o banco',
    };
  }
}

// ── ORQUESTRADOR ──────────────────────────────
// Chama todos os bancos selecionados EM PARALELO (Promise.allSettled),
// usando API real se status === 'integrado', ou cálculo local se 'simulado'.
// Um banco com erro/fora do ar não trava os demais.
async function simularEmTodosBancos(bancosSelecionados, dadosEntrada) {
  const chamadas = bancosSelecionados.map(async (banco) => {
    const config = BANK_API_CONFIG[banco.id] || { status: 'simulado' };

    if (config.status === 'integrado' && typeof config.adapter === 'function') {
      return config.adapter(dadosEntrada, config);
    }
    // Padrão: cálculo local (mantém o comportamento atual do sistema)
    return calcularSimulado(banco, dadosEntrada);
  });

  const resultadosSettled = await Promise.allSettled(chamadas);

  return resultadosSettled.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    // Se a Promise rejeitar de forma inesperada (bug no adapter, etc.)
    const banco = bancosSelecionados[i];
    return {
      bancoId: banco.id,
      banco: banco.nome,
      status: 'Erro',
      financiado: dadosEntrada.financiado,
      entradaMin: 0,
      parcela: 0,
      prazo: dadosEntrada.prazoMeses,
      taxa: 0,
      cet: 0,
      totalPago: 0,
      origem: 'erro',
      erro: 'Falha inesperada ao consultar este banco',
    };
  });
}

// Exporta para uso em app.js (carregado como <script> normal, sem módulos)
window.AF_BANK_ADAPTERS = {
  BANK_API_CONFIG,
  simularEmTodosBancos,
  calcularSimulado,
};
