// Configurações do ThingSpeak
const channelID = '2840207';
const readAPIKey = '5UWNQD21RD2A7QHG';
const writeAPIKey = '9NG6QLIN8UXLE2AH';

// Variáveis de controle
let lastCommandTime = 0;
const COMMAND_DELAY = 15000; // 15 segundos

// Elementos da interface
const elements = {
  temperature: document.getElementById('temperature'),
  level: document.getElementById('level'),
  statusBomba: document.getElementById('statusBomba'),
  statusAquecedor: document.getElementById('statusAquecedor'),
  modoAutomatico: document.getElementById('modoAutomatico'),
  modoAutomaticoStatus: document.getElementById('modoAutomaticoStatus'),
  bombaOn: document.getElementById('bombaOn'),
  bombaOff: document.getElementById('bombaOff'),
  resistenciaOn: document.getElementById('resistenciaOn'),
  resistenciaOff: document.getElementById('resistenciaOff'),
  pumpIcon: document.getElementById('pumpIcon'),
  heaterIcon: document.getElementById('heaterIcon'),
  tempoLiga: document.getElementById('tempoLiga'),
  tempoDesliga: document.getElementById('tempoDesliga'),
  temperaturaAlvo: document.getElementById('temperaturaAlvo')
};

// Função para alternar controles manuais
function toggleManualControls(enabled) {
  const buttons = [
    elements.bombaOn,
    elements.bombaOff,
    elements.resistenciaOn,
    elements.resistenciaOff
  ];
  
  buttons.forEach(btn => {
    if (btn) {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '1' : '0.5';
    }
  });
}

// Função para atualizar o estado visual do botão modo
function updateModeButtonState(isAuto) {
  const statusElement = elements.modoAutomaticoStatus;
  if (isAuto) {
    statusElement.textContent = 'Ligado';
    statusElement.classList.add('active');
  } else {
    statusElement.textContent = 'Desligado';
    statusElement.classList.remove('active');
  }
}

// Função para atualizar a interface
function updateUI(data) {
  console.log("Dados recebidos para atualização:", data);
  
  // Atualiza todos os campos
  if (data.field1 !== undefined && data.field1 !== null) {
    elements.temperature.textContent = parseFloat(data.field1).toFixed(1);
  }
  
  if (data.field2 !== undefined && data.field2 !== null) {
    elements.level.textContent = parseFloat(data.field2).toFixed(1);
  }
  
  if (data.field3 !== undefined && data.field3 !== null) {
    const bombaState = parseInt(data.field3);
    elements.statusBomba.textContent = bombaState ? 'Ligado' : 'Desligado';
    elements.statusBomba.className = bombaState ? 'sensor-value on' : 'sensor-value off';
    elements.pumpIcon.className = bombaState ? 'sensor-icon pump on' : 'sensor-icon pump off';
  }
  
  if (data.field4 !== undefined && data.field4 !== null) {
    const resistenciaState = parseInt(data.field4);
    elements.statusAquecedor.textContent = resistenciaState ? 'Ligado' : 'Desligado';
    elements.statusAquecedor.className = resistenciaState ? 'sensor-value on' : 'sensor-value off';
    elements.heaterIcon.className = resistenciaState ? 'sensor-icon heater on' : 'sensor-icon heater off';
  }
  
  // Modo Automático (field5) - Correção principal aqui
  if (data.field5 !== undefined && data.field5 !== null) {
    const modoAutoState = parseInt(data.field5);
    elements.modoAutomatico.checked = modoAutoState === 1;
    updateModeButtonState(modoAutoState);
    toggleManualControls(!modoAutoState);
  }
  
  if (data.field6 !== undefined && data.field6 !== null) {
    elements.temperaturaAlvo.value = data.field6;
  }
  
  if (data.field7 !== undefined && data.field7 !== null) {
    elements.tempoLiga.value = parseInt(data.field7) / 10;
  }
  
  if (data.field8 !== undefined && data.field8 !== null) {
    elements.tempoDesliga.value = parseInt(data.field8) / 10;
  }
}

// Função para buscar dados do ThingSpeak
async function fetchData() {
  try {
    const response = await fetch(`https://api.thingspeak.com/channels/${channelID}/feeds/last.json?api_key=${readAPIKey}`);
    
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    
    const data = await response.json();
    console.log("Dados completos da API:", data);
    
    if (!data || Object.keys(data).length === 0) {
      throw new Error("Dados vazios recebidos da API");
    }
    
    updateUI(data);
    return data;
    
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    return null;
  }
}

// Função para atualizar um campo no ThingSpeak
async function updateField(field, value) {
  const now = Date.now();
  if (now - lastCommandTime < COMMAND_DELAY) {
    const waitTime = Math.ceil((COMMAND_DELAY - (now - lastCommandTime))/1000);
    alert(`Aguarde ${waitTime} segundos antes de enviar outro comando.`);
    return false;
  }
  
  try {
    const url = `https://api.thingspeak.com/update?api_key=${writeAPIKey}&${field}=${value}`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    
    const result = await response.text();
    console.log(`Campo ${field} atualizado. Resposta:`, result);
    
    lastCommandTime = Date.now();
    await fetchData(); // Atualiza a interface após mudança
    return true;
    
  } catch (error) {
    console.error(`Erro ao atualizar ${field}:`, error);
    return false;
  }
}

// Função para alternar o modo automático - Correção principal aqui
async function toggleAutomaticMode() {
  const newState = elements.modoAutomatico.checked ? 1 : 0;
  const success = await updateField('field5', newState);
  
  if (!success) {
    // Reverte visualmente se falhou
    elements.modoAutomatico.checked = !elements.modoAutomatico.checked;
  }
}

// Configuração dos event listeners
function setupEventListeners() {
  // Controles manuais
  elements.bombaOn?.addEventListener('click', () => {
    if (elements.modoAutomatico.checked) {
      alert('Desative o modo automático primeiro');
      return;
    }
    sendCommand('bomba', 1);
  });

  elements.bombaOff?.addEventListener('click', () => {
    if (elements.modoAutomatico.checked) {
      alert('Desative o modo automático primeiro');
      return;
    }
    sendCommand('bomba', 0);
  });

  elements.resistenciaOn?.addEventListener('click', () => {
    if (elements.modoAutomatico.checked) {
      alert('Desative o modo automático primeiro');
      return;
    }
    sendCommand('aquecedor', 1);
  });

  elements.resistenciaOff?.addEventListener('click', () => {
    if (elements.modoAutomatico.checked) {
      alert('Desative o modo automático primeiro');
      return;
    }
    sendCommand('aquecedor', 0);
  });

  // Modo automático
  elements.modoAutomatico?.addEventListener('change', toggleAutomaticMode);

  // Configurações automáticas
  elements.tempoLiga?.addEventListener('change', updateSettings);
  elements.tempoDesliga?.addEventListener('change', updateSettings);
  elements.temperaturaAlvo?.addEventListener('change', updateSettings);
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  console.log("Página carregada. Iniciando configuração...");
  
  // Verificação dos elementos
  for (const [key, element] of Object.entries(elements)) {
    if (!element) console.error(`Elemento não encontrado: ${key}`);
  }
  
  setupEventListeners();
  
  // Carrega dados iniciais
  const initialData = await fetchData();
  if (initialData && initialData.field5 !== undefined) {
    const modoAutoState = parseInt(initialData.field5);
    elements.modoAutomatico.checked = modoAutoState === 1;
    updateModeButtonState(modoAutoState);
    toggleManualControls(!modoAutoState);
  }
  
  // Atualização periódica
  setInterval(fetchData, 5000);
  console.log("Configuração completa. Monitorando dados...");
});

// Funções auxiliares
async function sendCommand(type, value) {
  const field = type === 'bomba' ? 'field3' : 'field4';
  return await updateField(field, value);
}

async function updateSettings() {
  const tempoLiga = elements.tempoLiga.value * 10;
  const tempoDesliga = elements.tempoDesliga.value * 10;
  const temperaturaAlvo = elements.temperaturaAlvo.value;
  
  await updateField('field7', tempoLiga);
  await new Promise(resolve => setTimeout(resolve, 15000));
  await updateField('field8', tempoDesliga);
  await new Promise(resolve => setTimeout(resolve, 15000));
  await updateField('field6', temperaturaAlvo);
}