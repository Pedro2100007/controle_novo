// Constantes para acessar o canal e a chave de leitura do ThingSpeak
const canalId = "2840207";
const chaveLeitura = "5UWNQD21RD2A7QHG";

// Variável para armazenar a instância do gráfico
let meuGrafico = null;

// Função para formatar data e hora
function formatarDataHora(timestamp) {
    const data = new Date(timestamp);
    // Formato: DD/MM/AAAA HH:MM
    return `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth()+1).toString().padStart(2, '0')}/${data.getFullYear()} ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
}

// Função para carregar os dados com base nas datas selecionadas
function carregarDados() {
    // Obtém as datas de início e fim dos campos de entrada
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;
    const escalaTempo = document.getElementById('escalaTempo').value;

    // Verifica se ambas as datas foram selecionadas
    if (!dataInicio || !dataFim) {
        alert("Por favor, selecione ambas as datas.");
        return;
    }

    // Formata as datas no formato esperado pela API
    const inicioFormatado = new Date(dataInicio).toISOString().split('T')[0];
    const fimFormatado = new Date(dataFim).toISOString().split('T')[0];

    // Constrói a URL da API
    const url = `https://api.thingspeak.com/channels/${canalId}/fields/1.json?api_key=${chaveLeitura}&start=${inicioFormatado}&end=${fimFormatado}`;

    // Faz a requisição à API do ThingSpeak
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Erro na requisição');
            return response.json();
        })
        .then(data => {
            // Verifica se há dados disponíveis
            if (!data.feeds || data.feeds.length === 0) {
                throw new Error('Nenhum dado encontrado para o período selecionado');
            }

            // Processa os dados brutos
            const dadosBrutos = data.feeds.map(feed => ({
                timestamp: feed.created_at,
                valor: parseFloat(feed.field1)
            })).filter(item => !isNaN(item.valor)); // Filtra valores numéricos válidos

            // Agrupa os dados por intervalo de tempo se necessário
            let dadosProcessados = [];
            if (escalaTempo !== "15") {
                const intervalo = parseInt(escalaTempo);
                const minutosPorPonto = 15;
                const pontosPorIntervalo = Math.max(1, Math.floor(intervalo/minutosPorPonto));
                
                for (let i = 0; i < dadosBrutos.length; i += pontosPorIntervalo) {
                    const grupo = dadosBrutos.slice(i, i + pontosPorIntervalo);
                    if (grupo.length > 0) {
                        const soma = grupo.reduce((acc, item) => acc + item.valor, 0);
                        dadosProcessados.push({
                            timestamp: grupo[0].timestamp, // Mantém o primeiro timestamp
                            valor: soma / grupo.length // Calcula a média
                        });
                    }
                }
            } else {
                dadosProcessados = [...dadosBrutos];
            }

            // Extrai arrays separados para o gráfico
            const timestamps = dadosProcessados.map(item => item.timestamp);
            const valores = dadosProcessados.map(item => item.valor);

            // Cálculo das estatísticas
            if (valores.length === 0) {
                throw new Error('Dados insuficientes para cálculo');
            }

            // Encontra índices dos valores máximo e mínimo
            let maxIndex = 0;
            let minIndex = 0;
            let soma = 0;

            for (let i = 0; i < valores.length; i++) {
                soma += valores[i];
                if (valores[i] > valores[maxIndex]) maxIndex = i;
                if (valores[i] < valores[minIndex]) minIndex = i;
            }

            // Calcula estatísticas
            const avgTemp = (soma / valores.length).toFixed(2);
            const maxTemp = valores[maxIndex].toFixed(2);
            const minTemp = valores[minIndex].toFixed(2);
            const maxTempTime = formatarDataHora(timestamps[maxIndex]);
            const minTempTime = formatarDataHora(timestamps[minIndex]);

            // Atualiza a interface
            document.getElementById('avgTemp').textContent = avgTemp;
            document.getElementById('maxTemp').innerHTML = `${maxTemp} °C <small>(${maxTempTime})</small>`;
            document.getElementById('minTemp').innerHTML = `${minTemp} °C <small>(${minTempTime})</small>`;

            // Renderiza o gráfico
            renderizarGrafico(timestamps, valores);
        })
        .catch(error => {
            console.error('Erro:', error);
            alert(error.message);
            // Reseta os valores na interface
            document.getElementById('avgTemp').textContent = '--';
            document.getElementById('maxTemp').textContent = '--';
            document.getElementById('minTemp').textContent = '--';
        });
}

// Função para renderizar o gráfico
function renderizarGrafico(timestamps, valores) {
    const ctx = document.getElementById('meuGrafico').getContext('2d');
    
    // Destrói o gráfico anterior se existir
    if (meuGrafico) {
        meuGrafico.destroy();
    }

    // Cria novo gráfico
    meuGrafico = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [{
                label: 'Temperatura (°C)',
                data: valores,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false,
                pointRadius: 3,
                pointBackgroundColor: 'rgb(75, 192, 192)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy',
                        speed: 0.1
                    },
                    pan: {
                        enabled: true,
                        mode: 'xy',
                        speed: 0.1
                    },
                    limits: {
                        x: { min: 'original', max: 'original' },
                        y: { min: 'original', max: 'original' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Temperatura: ${context.parsed.y.toFixed(2)} °C`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        tooltipFormat: 'DD/MM/YYYY HH:mm'
                    },
                    title: {
                        display: true,
                        text: 'Data/Hora'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Temperatura (°C)'
                    }
                }
            }
        }
    });
}