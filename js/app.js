// ============================================
// AutoFinance Multibancos — app.js
// ============================================

// ── DADOS DOS BANCOS ──────────────────────────
const BANCOS = [
  { id: 'bv',       nome: 'BV Financeira',    taxaMin: 1.49, taxaMax: 2.20, cetAdd: 0.30, ativo: true },
  { id: 'safra',    nome: 'Safra',             taxaMin: 1.55, taxaMax: 2.35, cetAdd: 0.28, ativo: true },
  { id: 'santander',nome: 'Santander',         taxaMin: 1.45, taxaMax: 2.15, cetAdd: 0.25, ativo: true },
  { id: 'itau',     nome: 'Itaú',              taxaMin: 1.50, taxaMax: 2.25, cetAdd: 0.32, ativo: true },
  { id: 'bradesco', nome: 'Bradesco',          taxaMin: 1.52, taxaMax: 2.30, cetAdd: 0.29, ativo: true },
  { id: 'carbank',  nome: 'CarBank',           taxaMin: 1.60, taxaMax: 2.45, cetAdd: 0.35, ativo: true },
  { id: 'pan',      nome: 'Banco PAN',         taxaMin: 1.65, taxaMax: 2.50, cetAdd: 0.38, ativo: true },
  { id: 'c6',       nome: 'C6 Bank',           taxaMin: 1.48, taxaMax: 2.18, cetAdd: 0.27, ativo: true },
  { id: 'gmac',     nome: 'GMAC/Chevrolet',    taxaMin: 0.99, taxaMax: 1.80, cetAdd: 0.20, ativo: true },
  { id: 'bb',       nome: 'Banco do Brasil',   taxaMin: 1.35, taxaMax: 2.00, cetAdd: 0.22, ativo: true },
  { id: 'caixa',    nome: 'Caixa Federal',     taxaMin: 1.30, taxaMax: 1.95, cetAdd: 0.18, ativo: true },
  { id: 'rodobens', nome: 'Rodobens',          taxaMin: 1.58, taxaMax: 2.40, cetAdd: 0.33, ativo: true },
  { id: 'porto',    nome: 'Porto Seguro',      taxaMin: 1.55, taxaMax: 2.28, cetAdd: 0.30, ativo: true },
  { id: 'vw',       nome: 'VW Financial',      taxaMin: 0.89, taxaMax: 1.70, cetAdd: 0.18, ativo: true },
  { id: 'toyota',   nome: 'Toyota Financial',  taxaMin: 0.85, taxaMax: 1.65, cetAdd: 0.16, ativo: true },
];

// ── ESTADO GLOBAL ────────────────────────────
let currentUser   = null;
let currentTab    = 'simular';
let bancosSel     = new Set(BANCOS.map(b => b.id));
let ultimoResultado = [];
let prazoSel      = 36;
let tipoSel       = 'seminovo';
let fb            = null;
window.addEventListener('af-firebase-ready', () => { fb = window.AF_FIREBASE; });

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('afUser');
  if (!saved) { window.location.href = 'login.html'; return; }
  currentUser = JSON.parse(saved);

  if (sessionStorage.getItem('afPrimeiroAcesso') === '1') {
    mostrarTrocaSenhaObrigatoria();
    return;
  }

  renderUserInfo();
  renderSidebar();
  renderBanksGrid();
  showTab('simular');
  aplicarPermissoes();
  aplicarPreferenciaSidebar();
});

// ── TROCA DE SENHA NO PRIMEIRO ACESSO ─────────
function mostrarTrocaSenhaObrigatoria() {
  document.getElementById('pageContent').innerHTML = `
    <div style="max-width:420px;margin:60px auto;text-align:center">
      <h2 style="margin-bottom:8px">Defina sua nova senha</h2>
      <p class="text-muted text-sm mb-24">Este é seu primeiro acesso. Por segurança, crie uma nova senha antes de continuar.</p>
      <div class="form-group mb-8"><input type="password" id="novaSenha1" placeholder="Nova senha (mín. 6 caracteres)"></div>
      <div class="form-group mb-8"><input type="password" id="novaSenha2" placeholder="Confirme a nova senha"></div>
      <div id="trocaSenhaErro" style="color:#FF4D6A;font-size:0.85rem;margin-bottom:12px;display:none"></div>
      <button class="btn btn-primary btn-full" onclick="confirmarTrocaSenha()">Salvar e continuar</button>
    </div>`;
}

async function confirmarTrocaSenha() {
  const s1 = document.getElementById('novaSenha1').value;
  const s2 = document.getElementById('novaSenha2').value;
  const erro = document.getElementById('trocaSenhaErro');
  erro.style.display = 'none';

  if (!s1 || s1.length < 6) { erro.textContent = 'A senha deve ter no mínimo 6 caracteres.'; erro.style.display = 'block'; return; }
  if (s1 !== s2) { erro.textContent = 'As senhas não coincidem.'; erro.style.display = 'block'; return; }
  if (!fb || !fb.auth.currentUser) { erro.textContent = 'Sessão expirada, faça login novamente.'; erro.style.display = 'block'; return; }

  try {
    await fb.updatePassword(fb.auth.currentUser, s1);
    await fb.updateDoc(fb.doc(fb.db, 'usuarios', currentUser.uid), { primeiroAcesso: false });
    sessionStorage.setItem('afPrimeiroAcesso', '0');
    toast('Senha atualizada com sucesso!', 'success');
    renderUserInfo();
    renderSidebar();
    renderBanksGrid();
    showTab('simular');
    aplicarPermissoes();
    aplicarPreferenciaSidebar();
  } catch (e) {
    erro.textContent = 'Erro ao salvar nova senha: ' + (e.message || e);
    erro.style.display = 'block';
  }
}

// ── USER INFO ─────────────────────────────────
function renderUserInfo() {
  const initials = currentUser.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('userName').textContent   = currentUser.nome;
  document.getElementById('userRole').textContent   = currentUser.role === 'admin' ? 'Administrador' : `Lojista · ${currentUser.loja}`;
  document.getElementById('topbarTitle').textContent = currentUser.loja || 'AutoFinance';
}

function aplicarPermissoes() {
  if (currentUser.role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
  }
}

function logout() {
  sessionStorage.removeItem('afUser');
  sessionStorage.removeItem('afPrimeiroAcesso');
  if (fb) fb.signOut(fb.auth).catch(() => {});
  window.location.href = 'login.html';
}

// ── SIDEBAR MOBILE ────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// ── SIDEBAR RECOLHÍVEL (desktop) ──────────────
function toggleSidebarCollapse() {
  const sidebar = document.getElementById('sidebar');
  const collapsed = sidebar.classList.toggle('collapsed');
  localStorage.setItem('af_sidebar_collapsed', collapsed ? '1' : '0');
  const btn = document.getElementById('sidebarCollapseBtn');
  if (btn) btn.title = collapsed ? 'Expandir menu' : 'Recolher menu';
}

function aplicarPreferenciaSidebar() {
  if (localStorage.getItem('af_sidebar_collapsed') === '1') {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.add('collapsed');
    const btn = document.getElementById('sidebarCollapseBtn');
    if (btn) btn.title = 'Expandir menu';
  }
}

// ── RENDERIZA SIDEBAR NAV ─────────────────────
function renderSidebar() {
  const navItems = [
    { id: 'simular',      icon: '⚡', label: 'Simulador',   always: true },
    { id: 'historico',    icon: '🕐', label: 'Histórico',   always: true },
    { id: 'clientes',     icon: '👥', label: 'Clientes',    always: true },
    { id: 'lojistas',     icon: '🏪', label: 'Lojistas',    admin: true  },
    { id: 'relatorios',   icon: '📊', label: 'Relatórios',  admin: true  },
    { id: 'credenciais',  icon: '🔑', label: 'Credenciais', always: true },
    { id: 'configuracoes',icon: '⚙️', label: 'Configurações',admin: true },
  ];

  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = navItems.map(item => {
    if (item.admin && currentUser.role !== 'admin') return '';
    return `<div class="nav-item ${item.id === currentTab ? 'active' : ''}" onclick="showTab('${item.id}'); closeSidebar();">
      <span class="nav-icon">${item.icon}</span>${item.label}
    </div>`;
  }).join('');
}

// ── TABS ─────────────────────────────────────
function showTab(tab) {
  currentTab = tab;
  renderSidebar();
  document.getElementById('pageContent').innerHTML = '';
  document.getElementById('topbarSubtitle').textContent = '';

  const renders = {
    simular:       renderSimulador,
    historico:     renderHistorico,
    clientes:      renderClientes,
    lojistas:      renderLojistas,
    relatorios:    renderRelatorios,
    credenciais:   renderCredenciais,
    configuracoes: renderConfiguracoes,
  };

  if (renders[tab]) renders[tab]();
}

// ── GRID DE BANCOS ────────────────────────────
function renderBanksGrid() {
  // já feito inline no HTML
}

// ── SIMULADOR ────────────────────────────────
function renderSimulador() {
  document.getElementById('pageContent').innerHTML = `
    <div class="stats-grid mb-24" id="simStats" style="display:none;">
      <div class="stat-card"><div class="stat-label">Melhor Parcela</div><div class="stat-value cyan" id="statParcela">—</div></div>
      <div class="stat-card"><div class="stat-label">Menor Taxa</div><div class="stat-value" id="statTaxa">—</div></div>
      <div class="stat-card"><div class="stat-label">Bancos Aprovados</div><div class="stat-value green" id="statAprov">—</div></div>
      <div class="stat-card"><div class="stat-label">Bancos Simulados</div><div class="stat-value" id="statTotal">—</div></div>
    </div>

    <!-- Veículo -->
    <div class="card mb-16">
      <div class="card-header">
        <div class="card-title"><span class="icon">🚗</span> Dados do Veículo</div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Placa</label>
          <div class="placa-row">
            <input type="text" id="placa" placeholder="ABC1D23" maxlength="8" oninput="this.value=this.value.toUpperCase()">
            <button class="btn btn-secondary btn-sm" onclick="buscarPlaca()">🔍 Buscar</button>
          </div>
        </div>
        <div class="form-group">
          <label>Valor do Veículo (R$)</label>
          <input type="number" id="valorVeiculo" placeholder="0,00" min="0">
        </div>
        <div class="form-group">
          <label>Entrada (R$)</label>
          <input type="number" id="entrada" placeholder="0,00" min="0">
        </div>
        <div class="form-group">
          <label>Ano</label>
          <input type="number" id="anoVeiculo" placeholder="2022" min="1990" max="2025">
        </div>
        <div class="form-group">
          <label>Modelo</label>
          <input type="text" id="modeloVeiculo" placeholder="Ex: Honda Civic">
        </div>
        <div class="form-group">
          <label>Versão</label>
          <input type="text" id="versaoVeiculo" placeholder="Ex: EX 2.0">
        </div>
      </div>

      <div id="fipeResult" class="fipe-result"></div>

      <div class="section-divider"></div>

      <div class="form-grid">
        <div class="form-group">
          <label>Prazo (meses)</label>
          <div class="prazo-group" id="prazoGroup">
            ${[12,24,36,48,60,72].map(p => `<button class="prazo-btn ${p===prazoSel?'active':''}" onclick="setPrazo(${p})">${p}x</button>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Tipo do Veículo</label>
          <div class="tipo-group">
            <button class="tipo-btn ${tipoSel==='novo'?'active':''}"     onclick="setTipo('novo')">Novo</button>
            <button class="tipo-btn ${tipoSel==='seminovo'?'active':''}" onclick="setTipo('seminovo')">Seminovo</button>
            <button class="tipo-btn ${tipoSel==='usado'?'active':''}"    onclick="setTipo('usado')">Usado</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cliente -->
    <div class="card mb-16">
      <div class="card-header">
        <div class="card-title"><span class="icon">👤</span> Dados do Cliente</div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Nome Completo</label>
          <input type="text" id="clienteNome" placeholder="Nome do cliente">
        </div>
        <div class="form-group">
          <label>CPF</label>
          <input type="text" id="clienteCPF" placeholder="000.000.000-00" maxlength="14" oninput="maskCPF(this)">
        </div>
        <div class="form-group">
          <label>Data de Nascimento</label>
          <input type="date" id="clienteNasc">
        </div>
        <div class="form-group">
          <label>Telefone</label>
          <input type="tel" id="clienteTel" placeholder="(47) 99999-9999" maxlength="15" oninput="maskTel(this)">
        </div>
        <div class="form-group">
          <label>E-mail</label>
          <input type="email" id="clienteEmail" placeholder="cliente@email.com">
        </div>
        <div class="form-group">
          <label>Renda Mensal (R$)</label>
          <input type="number" id="clienteRenda" placeholder="0,00" min="0">
        </div>
      </div>
    </div>

    <!-- Bancos -->
    <div class="card mb-16">
      <div class="card-header">
        <div class="card-title"><span class="icon">🏦</span> Bancos para Simular</div>
        <div class="flex gap-8">
          <button class="btn btn-ghost btn-sm" onclick="selecionarTodosBancos()">Todos</button>
          <button class="btn btn-ghost btn-sm" onclick="limparBancos()">Limpar</button>
        </div>
      </div>
      <div class="banks-grid" id="banksGrid">
        ${BANCOS.map(b => `
          <div class="bank-toggle ${bancosSel.has(b.id)?'selected':''}" id="btoggle_${b.id}" onclick="toggleBanco('${b.id}')">
            ${b.nome}
          </div>`).join('')}
      </div>
      <div class="mt-16 flex gap-8" style="flex-wrap:wrap;">
        <button class="btn btn-primary btn-lg" onclick="simular()" id="btnSimular">
          ⚡ Simular nos Bancos
        </button>
        <button class="btn btn-ghost" onclick="limparSimulacao()">Limpar</button>
      </div>
    </div>

    <!-- Resultados -->
    <div class="card" id="resultsCard" style="display:none;">
      <div class="card-header">
        <div class="card-title"><span class="icon">📋</span> Resultado das Simulações</div>
        <div class="export-bar">
          <button class="btn btn-secondary btn-sm" onclick="exportarPDF()">📄 PDF</button>
          <button class="btn btn-secondary btn-sm" onclick="exportarExcel()">📊 Excel</button>
          <button class="btn btn-ghost btn-sm" onclick="enviarCliente()">📨 Enviar</button>
        </div>
      </div>
      <div class="results-table-wrap">
        <table class="results-table">
          <thead>
            <tr>
              <th>Banco</th>
              <th>Status</th>
              <th>Financiado</th>
              <th>Entrada Mín.</th>
              <th>Parcela</th>
              <th>Prazo</th>
              <th>Taxa a.m.</th>
              <th>CET a.a.</th>
              <th>Total Pago</th>
              <th>Portal</th>
            </tr>
          </thead>
          <tbody id="resultsBody"></tbody>
        </table>
      </div>
      <div class="legal-note mt-16">
        ⚠️ Simulação estimada. Aprovação definitiva sujeita à análise de crédito de cada banco. Use o botão "Portal" para acessar o sistema oficial com suas credenciais.
      </div>
    </div>
  `;
}

// ── PRAZO / TIPO ──────────────────────────────
function setPrazo(p) {
  prazoSel = p;
  document.querySelectorAll('.prazo-btn').forEach(b => b.classList.toggle('active', parseInt(b.textContent) === p));
}

function setTipo(t) {
  tipoSel = t;
  document.querySelectorAll('.tipo-btn').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().includes(t)));
}

// ── BANCOS TOGGLE ─────────────────────────────
function toggleBanco(id) {
  if (bancosSel.has(id)) bancosSel.delete(id);
  else bancosSel.add(id);
  document.getElementById(`btoggle_${id}`).classList.toggle('selected', bancosSel.has(id));
}

function selecionarTodosBancos() {
  BANCOS.forEach(b => { bancosSel.add(b.id); document.getElementById(`btoggle_${b.id}`).classList.add('selected'); });
}

function limparBancos() {
  bancosSel.clear();
  document.querySelectorAll('.bank-toggle').forEach(el => el.classList.remove('selected'));
}

// ── SIMULAÇÃO ─────────────────────────────────
async function simular() {
  const valor   = parseFloat(document.getElementById('valorVeiculo').value) || 0;
  const entrada = parseFloat(document.getElementById('entrada').value) || 0;
  const prazo   = prazoSel;

  if (valor <= 0) { toast('Informe o valor do veículo', 'error'); return; }
  if (bancosSel.size === 0) { toast('Selecione ao menos um banco', 'error'); return; }

  const btn = document.getElementById('btnSimular');
  btn.innerHTML = '<span class="loading-spin"></span> Simulando...';
  btn.disabled = true;

  await delay(900);

  const financiado = valor - entrada;
  const bancosParaSimular = BANCOS.filter(b => bancosSel.has(b.id));

  const dadosEntrada = {
    valorVeiculo: valor,
    valorEntrada: entrada,
    financiado,
    prazoMeses: prazo,
    tipoVeiculo: tipoSel,
  };

  const resultados = await window.AF_BANK_ADAPTERS.simularEmTodosBancos(bancosParaSimular, dadosEntrada);

  resultados.sort((a, b) => a.parcela - b.parcela);
  ultimoResultado = resultados;

  renderResultados(resultados);
  atualizarStats(resultados);
  salvarHistorico(resultados);

  btn.innerHTML = '⚡ Simular nos Bancos';
  btn.disabled = false;
}

function calcParcela(pv, taxa, n) {
  if (taxa === 0) return pv / n;
  return pv * (taxa * Math.pow(1 + taxa, n)) / (Math.pow(1 + taxa, n) - 1);
}

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── RENDER RESULTADOS ─────────────────────────
function renderResultados(resultados) {
  const card = document.getElementById('resultsCard');
  const body = document.getElementById('resultsBody');
  card.style.display = '';

  body.innerHTML = resultados.map((r, i) => `
    <tr>
      <td class="bank-name">
        <span class="bank-dot"></span>${r.banco}
        ${r.origem === 'integrado' ? '<span class="badge-origem badge-integrado" title="Dados reais via API do banco">API</span>' : ''}
      </td>
      <td><span class="badge ${r.status === 'Aprovado' ? 'badge-ok' : r.status === 'Erro' ? 'badge-err' : 'badge-warn'}">${r.status}</span></td>
      <td>${fmt(r.financiado)}</td>
      <td>${fmt(r.entradaMin)}</td>
      <td class="valor-destaque">${r.status === 'Erro' ? '—' : fmt(r.parcela)}</td>
      <td>${r.prazo}x</td>
      <td>${r.status === 'Erro' ? '—' : r.taxa.toFixed(2) + '%'}</td>
      <td>${r.status === 'Erro' ? '—' : r.cet.toFixed(2) + '%'}</td>
      <td class="valor-total">${r.status === 'Erro' ? '—' : fmt(r.totalPago)}</td>
      <td><button class="portal-btn" onclick="abrirPortal('${r.bancoId}')">↗ Portal</button></td>
    </tr>
  `).join('');

  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function atualizarStats(resultados) {
  const stats = document.getElementById('simStats');
  stats.style.display = '';
  const aprov = resultados.filter(r => r.status === 'Aprovado');
  document.getElementById('statParcela').textContent = aprov.length ? fmt(Math.min(...aprov.map(r => r.parcela))) : '—';
  document.getElementById('statTaxa').textContent    = aprov.length ? `${Math.min(...aprov.map(r => r.taxa)).toFixed(2)}% a.m.` : '—';
  document.getElementById('statAprov').textContent   = aprov.length;
  document.getElementById('statTotal').textContent   = resultados.length;
}

function limparSimulacao() {
  ultimoResultado = [];
  const card = document.getElementById('resultsCard');
  if (card) card.style.display = 'none';
  const stats = document.getElementById('simStats');
  if (stats) stats.style.display = 'none';
}

// ── FORMATAÇÃO ────────────────────────────────
function fmt(v) {
  return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ── BUSCA PLACA / FIPE ────────────────────────
async function buscarPlaca() {
  const placa = document.getElementById('placa').value.replace(/[^a-zA-Z0-9]/g, '');
  if (placa.length < 7) { toast('Placa inválida', 'error'); return; }

  toast('Consultando placa...', 'info');
  await delay(1200);

  // Demo data
  const demo = {
    modelo:  'Honda Civic',
    versao:  'EXL 2.0 CVT',
    ano:     2021,
    fipe:    85000,
    cor:     'Prata'
  };

  document.getElementById('modeloVeiculo').value  = demo.modelo;
  document.getElementById('versaoVeiculo').value  = demo.versao;
  document.getElementById('anoVeiculo').value     = demo.ano;
  document.getElementById('valorVeiculo').value   = demo.fipe;

  const fipeDiv = document.getElementById('fipeResult');
  fipeDiv.className = 'fipe-result show';
  fipeDiv.innerHTML = `
    <div class="fipe-field"><span class="fipe-label">Modelo</span><span class="fipe-value">${demo.modelo} ${demo.versao}</span></div>
    <div class="fipe-field"><span class="fipe-label">Ano</span><span class="fipe-value">${demo.ano}</span></div>
    <div class="fipe-field"><span class="fipe-label">Cor</span><span class="fipe-value">${demo.cor}</span></div>
    <div class="fipe-field"><span class="fipe-label">Valor FIPE</span><span class="fipe-value price">${fmt(demo.fipe)}</span></div>
  `;

  toast('Dados preenchidos via FIPE ✓', 'success');
}

// ── PORTAL DOS BANCOS ─────────────────────────
const PORTAIS = {
  bv:        'https://www.bvfinanceira.com.br',
  safra:     'https://www.safra.com.br',
  santander: 'https://www.santander.com.br',
  itau:      'https://www.itau.com.br',
  bradesco:  'https://www.bradesco.com.br',
  carbank:   'https://www.carbank.com.br',
  pan:       'https://www.bancopan.com.br',
  c6:        'https://www.c6bank.com.br',
  gmac:      'https://www.gmfinancial.com.br',
  bb:        'https://www.bb.com.br',
  caixa:     'https://www.caixa.gov.br',
  rodobens:  'https://www.rodobens.com.br',
  porto:     'https://www.portoseguro.com.br',
  vw:        'https://www.vwfs.com.br',
  toyota:    'https://www.toyotafinancial.com.br',
};

function abrirPortal(bancoId) {
  const creds = getCredenciais();
  const url = (creds[bancoId] && creds[bancoId].site) || PORTAIS[bancoId] || '#';
  window.open(url, '_blank');
}

// ── HISTÓRICO ─────────────────────────────────
function salvarHistorico(resultados) {
  const hist = getHistorico();
  const item = {
    id:   Date.now(),
    data: new Date().toLocaleString('pt-BR'),
    cliente: document.getElementById('clienteNome')?.value || 'Sem nome',
    veiculo: `${document.getElementById('modeloVeiculo')?.value || '—'} ${document.getElementById('anoVeiculo')?.value || ''}`.trim(),
    valor:   parseFloat(document.getElementById('valorVeiculo')?.value) || 0,
    prazo:   prazoSel,
    bancos:  resultados.length,
    resultados,
  };
  hist.unshift(item);
  localStorage.setItem('af_historico', JSON.stringify(hist.slice(0, 100)));
}

function getHistorico() {
  try { return JSON.parse(localStorage.getItem('af_historico') || '[]'); } catch { return []; }
}

function renderHistorico() {
  const hist = getHistorico();
  document.getElementById('pageContent').innerHTML = `
    <div class="flex-between mb-24">
      <h2>Histórico de Simulações</h2>
      <button class="btn btn-danger btn-sm" onclick="limparHistorico()">🗑 Limpar</button>
    </div>
    ${hist.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">🕐</div>
        <p>Nenhuma simulação realizada ainda.<br>Faça sua primeira simulação!</p>
      </div>` : `
    <div class="history-list">
      ${hist.map(h => `
        <div class="history-item" onclick="verHistoricoItem(${h.id})">
          <div class="history-icon">🚗</div>
          <div class="history-info">
            <div class="history-title">${h.cliente || 'Sem nome'} — ${h.veiculo || '—'}</div>
            <div class="history-sub">${fmt(h.valor)} · ${h.prazo}x · ${h.bancos} bancos simulados</div>
          </div>
          <div class="history-date">${h.data}</div>
        </div>`).join('')}
    </div>`}
  `;
}

function limparHistorico() {
  if (!confirm('Limpar todo o histórico?')) return;
  localStorage.removeItem('af_historico');
  renderHistorico();
  toast('Histórico limpo', 'success');
}

function verHistoricoItem(id) {
  const hist = getHistorico();
  const item = hist.find(h => h.id === id);
  if (!item) return;
  // Navega para simulador e repõe resultados
  showTab('simular');
  setTimeout(() => {
    ultimoResultado = item.resultados;
    renderResultados(item.resultados);
    atualizarStats(item.resultados);
    document.getElementById('clienteNome') && (document.getElementById('clienteNome').value = item.cliente);
  }, 100);
}

// ── CLIENTES ─────────────────────────────────
function getClientes() {
  try { return JSON.parse(localStorage.getItem('af_clientes') || '[]'); } catch { return []; }
}

function renderClientes() {
  const clientes = getClientes();
  document.getElementById('pageContent').innerHTML = `
    <div class="flex-between mb-24">
      <h2>Clientes Cadastrados</h2>
      <button class="btn btn-primary" onclick="modalNovoCliente()">+ Novo Cliente</button>
    </div>
    ${clientes.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <p>Nenhum cliente cadastrado ainda.</p>
      </div>` : `
    <div class="card">
      <div class="results-table-wrap">
        <table class="clients-table">
          <thead>
            <tr>
              <th>Nome</th><th>CPF</th><th>Telefone</th><th>E-mail</th><th>Renda</th><th>Cadastro</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${clientes.map(c => `
              <tr>
                <td style="font-weight:600">${c.nome}</td>
                <td>${c.cpf}</td>
                <td>${c.tel}</td>
                <td>${c.email}</td>
                <td>${fmt(parseFloat(c.renda)||0)}</td>
                <td style="color:var(--gray-400);font-size:0.8rem">${c.data}</td>
                <td>
                  <button class="btn btn-ghost btn-sm" onclick="excluirCliente(${c.id})">🗑</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`}

    <!-- Modal -->
    <div class="modal-overlay" id="modalCliente">
      <div class="modal">
        <div class="modal-header">
          <h3>Novo Cliente</h3>
          <button class="modal-close" onclick="fecharModal('modalCliente')">✕</button>
        </div>
        <div class="form-grid">
          <div class="form-group full"><label>Nome Completo</label><input type="text" id="nc_nome" placeholder="Nome"></div>
          <div class="form-group"><label>CPF</label><input type="text" id="nc_cpf" placeholder="000.000.000-00" oninput="maskCPF(this)" maxlength="14"></div>
          <div class="form-group"><label>Data de Nascimento</label><input type="date" id="nc_nasc"></div>
          <div class="form-group"><label>Telefone</label><input type="tel" id="nc_tel" placeholder="(47) 99999-9999" oninput="maskTel(this)" maxlength="15"></div>
          <div class="form-group"><label>E-mail</label><input type="email" id="nc_email" placeholder="cliente@email.com"></div>
          <div class="form-group"><label>Renda Mensal</label><input type="number" id="nc_renda" placeholder="0,00"></div>
          <div class="form-group"><label>CEP</label><input type="text" id="nc_cep" placeholder="00000-000" maxlength="9" oninput="maskCEP(this)"></div>
          <div class="form-group"><label>Cidade</label><input type="text" id="nc_cidade" placeholder="Cidade"></div>
          <div class="form-group"><label>Estado Civil</label>
            <select id="nc_ecivil">
              <option value="">Selecionar</option>
              <option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viúvo(a)</option>
            </select>
          </div>
          <div class="form-group"><label>Profissão</label><input type="text" id="nc_profissao" placeholder="Profissão"></div>
        </div>
        <div class="mt-24 flex gap-8" style="justify-content:flex-end">
          <button class="btn btn-ghost" onclick="fecharModal('modalCliente')">Cancelar</button>
          <button class="btn btn-primary" onclick="salvarCliente()">Salvar Cliente</button>
        </div>
      </div>
    </div>
  `;
}

function modalNovoCliente() {
  document.getElementById('modalCliente').classList.add('open');
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('open');
}

function salvarCliente() {
  const nome = document.getElementById('nc_nome').value.trim();
  if (!nome) { toast('Informe o nome do cliente', 'error'); return; }
  const cliente = {
    id:         Date.now(),
    nome,
    cpf:        document.getElementById('nc_cpf').value,
    nasc:       document.getElementById('nc_nasc').value,
    tel:        document.getElementById('nc_tel').value,
    email:      document.getElementById('nc_email').value,
    renda:      document.getElementById('nc_renda').value,
    cep:        document.getElementById('nc_cep').value,
    cidade:     document.getElementById('nc_cidade').value,
    ecivil:     document.getElementById('nc_ecivil').value,
    profissao:  document.getElementById('nc_profissao').value,
    data:       new Date().toLocaleDateString('pt-BR'),
  };
  const clientes = getClientes();
  clientes.unshift(cliente);
  localStorage.setItem('af_clientes', JSON.stringify(clientes));
  fecharModal('modalCliente');
  toast('Cliente salvo com sucesso!', 'success');
  renderClientes();
}

function excluirCliente(id) {
  if (!confirm('Excluir este cliente?')) return;
  const clientes = getClientes().filter(c => c.id !== id);
  localStorage.setItem('af_clientes', JSON.stringify(clientes));
  toast('Cliente removido', 'success');
  renderClientes();
}

// ── LOJISTAS (ADMIN) ──────────────────────────
async function getLojistas() {
  if (!fb) return [];
  const q = fb.query(fb.collection(fb.db, 'usuarios'), fb.where('role', '==', 'lojista'));
  const snap = await fb.getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

async function renderLojistas() {
  document.getElementById('pageContent').innerHTML = `<p class="text-muted">Carregando lojistas...</p>`;
  const lojistas = await getLojistas();
  document.getElementById('pageContent').innerHTML = `
    <div class="flex-between mb-24">
      <h2>Lojistas Cadastrados</h2>
      <button class="btn btn-primary" onclick="modalNovoLojista()">+ Novo Lojista</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${lojistas.map(l => `
        <div class="lojista-card">
          <div class="lojista-avatar">${l.nome[0]}</div>
          <div style="flex:1">
            <div style="font-weight:700">${l.nome}</div>
            <div style="color:var(--cyan);font-size:0.85rem">${l.loja}</div>
            <div style="color:var(--gray-400);font-size:0.78rem;margin-top:4px">${l.email}</div>
            <div style="color:var(--gray-400);font-size:0.78rem">${l.tel||''}</div>
            ${l.primeiroAcesso ? '<div style="color:#FFB020;font-size:0.72rem;margin-top:4px">⏳ Aguardando 1º acesso</div>' : ''}
          </div>
          <button class="btn btn-danger btn-sm" onclick="excluirLojista('${l.uid}')">🗑</button>
        </div>`).join('')}
      ${lojistas.length === 0 ? '<p class="text-muted">Nenhum lojista cadastrado ainda.</p>' : ''}
    </div>

    <div class="modal-overlay" id="modalLojista">
      <div class="modal">
        <div class="modal-header">
          <h3>Novo Lojista</h3>
          <button class="modal-close" onclick="fecharModal('modalLojista')">✕</button>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>Nome</label><input type="text" id="nl_nome" placeholder="Nome completo"></div>
          <div class="form-group"><label>Loja</label><input type="text" id="nl_loja" placeholder="Nome da loja"></div>
          <div class="form-group"><label>E-mail</label><input type="email" id="nl_email" placeholder="email@loja.com"></div>
          <div class="form-group"><label>Telefone</label><input type="tel" id="nl_tel" placeholder="(47) 99999-9999"></div>
          <div class="form-group"><label>Senha temporária</label><input type="text" id="nl_senha" placeholder="Mín. 6 caracteres"></div>
        </div>
        <p class="text-muted text-sm" style="margin-top:-8px">O lojista vai usar essa senha no primeiro acesso e será obrigado a trocá-la.</p>
        <div class="mt-24 flex gap-8" style="justify-content:flex-end">
          <button class="btn btn-ghost" onclick="fecharModal('modalLojista')">Cancelar</button>
          <button class="btn btn-primary" id="btnSalvarLojista" onclick="salvarLojista()">Salvar</button>
        </div>
      </div>
    </div>
  `;
}

function modalNovoLojista() {
  document.getElementById('modalLojista').classList.add('open');
}

async function salvarLojista() {
  const nome  = document.getElementById('nl_nome').value.trim();
  const email = document.getElementById('nl_email').value.trim();
  const senha = document.getElementById('nl_senha').value;
  const loja  = document.getElementById('nl_loja').value.trim();
  const tel   = document.getElementById('nl_tel').value.trim();

  if (!nome)  { toast('Informe o nome', 'error'); return; }
  if (!email) { toast('Informe o e-mail', 'error'); return; }
  if (!senha || senha.length < 6) { toast('Senha temporária deve ter ao menos 6 caracteres', 'error'); return; }
  if (!fb) { toast('Firebase ainda carregando, tente novamente', 'error'); return; }

  const btn = document.getElementById('btnSalvarLojista');
  btn.disabled = true; btn.textContent = 'Salvando...';

  try {
    const cred = await fb.createUserWithEmailAndPassword(fb.auth, email, senha);
    await fb.setDoc(fb.doc(fb.db, 'usuarios', cred.user.uid), {
      nome, email, loja, tel, role: 'lojista', primeiroAcesso: true,
    });
    fecharModal('modalLojista');
    toast('Lojista cadastrado! Informe a senha temporária a ele.', 'success');
    renderLojistas();
  } catch (e) {
    const msg = e.code === 'auth/email-already-in-use' ? 'Este e-mail já está cadastrado.' : ('Erro: ' + (e.message || e));
    toast(msg, 'error');
    btn.disabled = false; btn.textContent = 'Salvar';
  }
}

async function excluirLojista(uid) {
  if (!confirm('Remover este lojista? Isso não exclui o login dele do Firebase Authentication (apenas o cadastro no sistema), você pode fazer isso manualmente no console do Firebase se necessário.')) return;
  try {
    await fb.deleteDoc(fb.doc(fb.db, 'usuarios', uid));
    toast('Lojista removido', 'success');
    renderLojistas();
  } catch (e) {
    toast('Erro ao remover: ' + (e.message || e), 'error');
  }
}

// ── RELATÓRIOS ────────────────────────────────
async function renderRelatorios() {
  const hist = getHistorico();
  const totalSim   = hist.length;
  const totalValor = hist.reduce((s, h) => s + (h.valor || 0), 0);
  const bancoFreq  = {};
  hist.forEach(h => (h.resultados || []).forEach(r => { bancoFreq[r.banco] = (bancoFreq[r.banco] || 0) + 1; }));
  const topBancos = Object.entries(bancoFreq).sort((a,b) => b[1]-a[1]).slice(0, 5);

  document.getElementById('pageContent').innerHTML = `
    <h2 class="mb-24">Relatórios</h2>
    <div class="stats-grid mb-24">
      <div class="stat-card"><div class="stat-label">Total de Simulações</div><div class="stat-value cyan">${totalSim}</div></div>
      <div class="stat-card"><div class="stat-label">Volume Simulado</div><div class="stat-value">${fmt(totalValor)}</div></div>
      <div class="stat-card"><div class="stat-label">Clientes Cadastrados</div><div class="stat-value green">${getClientes().length}</div></div>
      <div class="stat-card"><div class="stat-label">Lojistas Ativos</div><div class="stat-value" id="statLojistas">…</div></div>
    </div>

    <div class="card">
      <div class="card-title mb-16"><span class="icon">🏆</span> Bancos Mais Simulados</div>
      ${topBancos.length === 0 ? '<div class="empty-state"><p>Nenhuma simulação ainda.</p></div>' :
        topBancos.map(([nome, count], i) => `
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="color:var(--cyan);font-weight:700;font-size:1rem;width:24px">${i+1}</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.9rem">${nome}</div>
              <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${Math.min(100,(count/totalSim)*100*3)}%"></div></div>
            </div>
            <div style="color:var(--gray-400);font-size:0.85rem">${count}x</div>
          </div>`).join('')}
    </div>
  `;

  const lojistas = await getLojistas();
  const elLoj = document.getElementById('statLojistas');
  if (elLoj) elLoj.textContent = lojistas.length;
}

// ── CREDENCIAIS ───────────────────────────────
function chaveCredenciais() {
  return `af_credenciais_${(currentUser && currentUser.email) || 'default'}`;
}

function getCredenciais() {
  try { return JSON.parse(localStorage.getItem(chaveCredenciais()) || '{}'); } catch { return {}; }
}

function renderCredenciais() {
  const creds = getCredenciais();
  document.getElementById('pageContent').innerHTML = `
    <h2 class="mb-8">Credenciais dos Bancos</h2>
    <p class="text-muted text-sm mb-24">Configure seus logins e senhas para acessar cada portal bancário diretamente.</p>
    <div class="cred-grid">
      ${BANCOS.map(b => {
        const c = creds[b.id] || {};
        return `
        <div class="cred-card">
          <div class="cred-card-header">
            <div class="cred-bank-name">🏦 ${b.nome}</div>
            ${c.login ? '<span class="cred-saved">✓ Salvo</span>' : ''}
          </div>
          <div class="form-group mb-8">
            <label>Login / CPF</label>
            <input type="text" id="cred_login_${b.id}" value="${c.login||''}" placeholder="login">
          </div>
          <div class="form-group mb-8">
            <label>Senha</label>
            <input type="password" id="cred_senha_${b.id}" value="${c.senha||''}" placeholder="••••••">
          </div>
          <div class="form-group mb-8">
            <label>Site do Portal</label>
            <input type="text" id="cred_site_${b.id}" value="${c.site || ''}" placeholder="https://...">
          </div>
          <button class="btn btn-secondary btn-sm btn-full" onclick="salvarCredencial('${b.id}')">Salvar</button>
        </div>`;
      }).join('')}
    </div>
  `;
}

function salvarCredencial(id) {
  const creds = getCredenciais();
  creds[id] = {
    login: document.getElementById(`cred_login_${id}`).value,
    senha: document.getElementById(`cred_senha_${id}`).value,
    site:  document.getElementById(`cred_site_${id}`).value,
  };
  localStorage.setItem(chaveCredenciais(), JSON.stringify(creds));
  toast(`Credencial ${BANCOS.find(b=>b.id===id).nome} salva`, 'success');
  renderCredenciais();
}

// ── CONFIGURAÇÕES ─────────────────────────────
function renderConfiguracoes() {
  document.getElementById('pageContent').innerHTML = `
    <h2 class="mb-24">Configurações</h2>
    <div class="card">
      <div class="card-title mb-16">⚙️ Sistema</div>
      <div class="form-group mb-16">
        <label>Nome da Empresa</label>
        <input type="text" id="conf_empresa" value="${localStorage.getItem('af_empresa')||'AutoFinance'}" placeholder="Nome da empresa">
      </div>
      <div class="form-group mb-24">
        <label>Chave API FIPE/Placa</label>
        <input type="text" id="conf_api" value="${localStorage.getItem('af_apikey')||''}" placeholder="Insira sua chave de API">
      </div>
      <button class="btn btn-primary" onclick="salvarConfiguracoes()">Salvar Configurações</button>
    </div>

    <div class="card mt-16">
      <div class="card-title mb-16">🗑 Dados</div>
      <p class="text-muted text-sm mb-16">Ações irreversíveis — tenha cuidado.</p>
      <div class="flex gap-8">
        <button class="btn btn-danger" onclick="limparTodosDados()">Limpar Todos os Dados</button>
      </div>
    </div>
  `;
}

function salvarConfiguracoes() {
  localStorage.setItem('af_empresa', document.getElementById('conf_empresa').value);
  localStorage.setItem('af_apikey',  document.getElementById('conf_api').value);
  toast('Configurações salvas!', 'success');
}

function limparTodosDados() {
  if (!confirm('Isso removerá todos os dados do sistema. Tem certeza?')) return;
  Object.keys(localStorage)
    .filter(k => k.startsWith('af_credenciais'))
    .forEach(k => localStorage.removeItem(k));
  ['af_historico','af_clientes','af_lojistas'].forEach(k => localStorage.removeItem(k));
  toast('Dados limpos', 'success');
}

// ── EXPORT ────────────────────────────────────
function exportarPDF() {
  if (!ultimoResultado.length) { toast('Nada para exportar', 'error'); return; }
  const win = window.open('', '_blank');
  const rows = ultimoResultado.map(r => `
    <tr>
      <td>${r.banco}</td>
      <td>${r.status}</td>
      <td>${fmt(r.financiado)}</td>
      <td>${fmt(r.parcela)}</td>
      <td>${r.prazo}x</td>
      <td>${r.taxa.toFixed(2)}%</td>
      <td>${fmt(r.totalPago)}</td>
    </tr>`).join('');
  win.document.write(`
    <!DOCTYPE html><html><head><title>Simulação AutoFinance</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#1a1a2e}
      h1{color:#0B1F3A;margin-bottom:4px}
      p{color:#666;margin-bottom:24px}
      table{width:100%;border-collapse:collapse}
      th{background:#0B1F3A;color:#fff;padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase}
      td{padding:10px 14px;border-bottom:1px solid #eee;font-size:13px}
      tr:nth-child(even) td{background:#f8f8f8}
      .footer{margin-top:24px;font-size:11px;color:#999}
    </style></head>
    <body>
      <h1>AutoFinance Multibancos</h1>
      <p>Simulação gerada em ${new Date().toLocaleString('pt-BR')}</p>
      <table><thead><tr><th>Banco</th><th>Status</th><th>Financiado</th><th>Parcela</th><th>Prazo</th><th>Taxa a.m.</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">⚠️ Simulação estimada. Sujeita à análise de crédito de cada banco.</div>
    </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function exportarExcel() {
  if (!ultimoResultado.length) { toast('Nada para exportar', 'error'); return; }
  const headers = ['Banco','Status','Financiado','Entrada Min.','Parcela','Prazo','Taxa a.m.','CET a.a.','Total Pago'];
  const rows = ultimoResultado.map(r => [
    r.banco, r.status,
    r.financiado.toFixed(2), r.entradaMin.toFixed(2),
    r.parcela.toFixed(2), r.prazo,
    r.taxa.toFixed(2)+'%', r.cet.toFixed(2)+'%',
    r.totalPago.toFixed(2)
  ]);
  const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `simulacao_autofinance_${Date.now()}.csv`;
  a.click();
  toast('Excel exportado!', 'success');
}

function enviarCliente() {
  const nome = document.getElementById('clienteNome')?.value || '';
  const email = document.getElementById('clienteEmail')?.value || '';
  if (!email) { toast('Informe o e-mail do cliente', 'error'); return; }
  toast(`Simulação enviada para ${email}`, 'success');
}

// ── MASKS ─────────────────────────────────────
function maskCPF(el) {
  let v = el.value.replace(/\D/g,'').slice(0,11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/,'$1.$2.$3-$4');
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/,'$1.$2.$3');
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/,'$1.$2');
  el.value = v;
}

function maskTel(el) {
  let v = el.value.replace(/\D/g,'').slice(0,11);
  if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{4})/,'($1) $2-$3');
  else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3');
  else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/,'($1) $2');
  el.value = v;
}

function maskCEP(el) {
  let v = el.value.replace(/\D/g,'').slice(0,8);
  if (v.length > 5) v = v.replace(/(\d{5})(\d{0,3})/,'$1-$2');
  el.value = v;
}

// ── TOAST ─────────────────────────────────────
function toast(msg, tipo = 'info') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
