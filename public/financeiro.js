// Variável global para armazenar os pagamentos
let pagamentosConfirmados = [];

// Carregar pagamentos do localStorage
function carregarPagamentos() {
    const pagamentosSalvos = localStorage.getItem('pagamentosAgendamentos');
    pagamentosConfirmados = pagamentosSalvos ? JSON.parse(pagamentosSalvos) : [];
    console.log('Pagamentos carregados:', pagamentosConfirmados);
    return pagamentosConfirmados;
}

// Função para carregar clientes
function carregarClientes() {
    fetch('/clientes')
        .then(response => response.json())
        .then(clientes => {
            const datalist = document.getElementById('clientes-list');
            datalist.innerHTML = '';
            clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.cpf;
                option.textContent = `${cliente.nome} - ${cliente.cpf}`;
                datalist.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar clientes:', error));
}

// Função para carregar serviços
function carregarServicos() {
    fetch('/servicos')
        .then(response => response.json())
        .then(servicos => {
            const select = document.getElementById('servico');
            select.innerHTML = '<option value="">Todos os serviços</option>';
            servicos.forEach(servico => {
                const option = document.createElement('option');
                option.value = servico.nome;
                option.textContent = servico.nome;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar serviços:', error));
}

// Função para formatar valor em Real
function formatarReal(valor) {
    if (!valor || isNaN(valor)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

// Função para buscar relatório financeiro apenas com pagamentos confirmados
function buscarAgendamentos() {
    const cpf = document.getElementById("cpf").value;
    const servico = document.getElementById("servico").value;
    const dataInicio = document.getElementById("dataInicio").value;
    const dataFim = document.getElementById("dataFim").value;

    // Carregar pagamentos atualizados
    const pagamentos = carregarPagamentos();

    console.log("Pagamentos carregados:", pagamentos);

    // Se não há pagamentos, mostrar vazio
    if (pagamentos.length === 0) {
        const tabela = document.getElementById("tabela-agendamentos");
        tabela.innerHTML = '<tr><td colspan="9">Nenhum pagamento confirmado encontrado.</td></tr>';
        calcularResumo([]);
        return;
    }

    // Buscar TODOS os agendamentos primeiro
    let url = `/relatorio-financeiro?`;
    if (cpf) url += `cpf_cliente=${cpf}&`;
    if (servico) url += `servico=${servico}&`;
    if (dataInicio) url += `dataInicio=${dataInicio}&`;
    if (dataFim) url += `dataFim=${dataFim}&`;

    url = url.replace(/[&?]$/, '');

    console.log("Buscando agendamentos em:", url);

    const tabela = document.getElementById("tabela-agendamentos");
    tabela.innerHTML = '<tr><td colspan="9">Carregando...</td></tr>';

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ${response.status}`);
            }
            return response.json();
        })
        .then(agendamentos => {
            console.log("Agendamentos recebidos:", agendamentos);

            // Filtrar apenas os agendamentos que têm pagamentos confirmados
            const agendamentosComPagamento = agendamentos.filter(agendamento => {
                return pagamentos.some(pagamento => pagamento.id === agendamento.id);
            });

            console.log("Agendamentos com pagamento:", agendamentosComPagamento);

            // Combinar dados dos agendamentos com dados de pagamento
            const resultado = agendamentosComPagamento.map(agendamento => {
                const pagamento = pagamentos.find(p => p.id === agendamento.id);
                return {
                    ...agendamento,
                    valorFinal: pagamento ? pagamento.valorFinal : 0,
                    desconto: pagamento ? pagamento.desconto : 0,
                    formaPagamento: pagamento ? pagamento.formaPagamento : '',
                    dataPagamento: pagamento ? pagamento.dataPagamento : null
                };
            });

            renderizarTabela(resultado);
            calcularResumo(resultado);
        })
        .catch(error => {
            console.error('Erro:', error);
            tabela.innerHTML = `<tr><td colspan="9">Erro: ${error.message}. Verifique se o servidor está rodando.</td></tr>`;
        });
}

// Função para renderizar tabela com pagamentos confirmados
function renderizarTabela(data) {
    const tabela = document.getElementById("tabela-agendamentos");
    tabela.innerHTML = '';

    if (!data || data.length === 0) {
        tabela.innerHTML = '<tr><td colspan="9">Nenhum pagamento confirmado encontrado.</td></tr>';
        return;
    }

    data.forEach(agendamento => {
        const tr = document.createElement('tr');

        // Formatar data do pagamento
        const dataPagamento = agendamento.dataPagamento ? 
            new Date(agendamento.dataPagamento).toLocaleDateString('pt-BR') + ' ' + 
            new Date(agendamento.dataPagamento).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) 
            : '—';

        tr.innerHTML = `
            <td>${agendamento.id || '—'}</td>
            <td>${agendamento.cliente_nome || '—'} (${agendamento.cpf_cliente || '—'})</td>
            <td>${agendamento.servico_nome || '—'}</td>
            <td>${formatarReal(agendamento.servico_preco)}</td>
            <td>${formatarReal(agendamento.desconto || 0)}</td>
            <td class="valor-final" style="font-weight: bold; color: #28a745;">${formatarReal(agendamento.valorFinal || 0)}</td>
            <td>${agendamento.formaPagamento || '—'}</td>
            <td>${agendamento.data ? new Date(agendamento.data).toLocaleDateString('pt-BR') : '—'}</td>
            <td>${dataPagamento}</td>
        `;
        tabela.appendChild(tr);
    });
}

// Função para calcular resumo apenas com valores finais dos pagamentos confirmados
function calcularResumo(data) {
    let totalFiltrado = 0;
    let totalHoje = 0;
    let totalMes = 0;
    let totalAno = 0;

    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = new Date().getMonth() + 1;
    const anoAtual = new Date().getFullYear();

    data.forEach(agendamento => {
        const valorFinal = parseFloat(agendamento.valorFinal) || 0;
        totalFiltrado += valorFinal;

        // Data do agendamento para "Hoje"
        if (agendamento.data === hoje) {
            totalHoje += valorFinal;
        }

        // Para mês e ano, usar a data do pagamento se disponível, senão usar data do agendamento
        const dataReferencia = agendamento.dataPagamento ? new Date(agendamento.dataPagamento) : new Date(agendamento.data);

        if (dataReferencia.getMonth() + 1 === mesAtual && dataReferencia.getFullYear() === anoAtual) {
            totalMes += valorFinal;
        }

        if (dataReferencia.getFullYear() === anoAtual) {
            totalAno += valorFinal;
        }
    });

    document.getElementById('total-filtrado').textContent = formatarReal(totalFiltrado);
    document.getElementById('total-hoje').textContent = formatarReal(totalHoje);
    document.getElementById('total-mes').textContent = formatarReal(totalMes);
    document.getElementById('total-ano').textContent = formatarReal(totalAno);
}

// Função para limpar filtros
function limparFiltros() {
    document.getElementById("cpf").value = '';
    document.getElementById("servico").value = '';
    document.getElementById("dataInicio").value = '';
    document.getElementById("dataFim").value = '';
    buscarAgendamentos();
}

// Função para atualizar dados
function atualizarDados() {
    carregarPagamentos();
    buscarAgendamentos();
}

// Função para exportar relatório para CSV
function exportarRelatorio() {
    const tabela = document.getElementById("tabela-agendamentos");
    const linhas = tabela.getElementsByTagName('tr');

    if (linhas.length <= 1) {
        alert('Não há dados para exportar.');
        return;
    }

    let csv = 'ID,Cliente,Serviço,Valor Original,Desconto,Valor Final,Forma Pagamento,Data Serviço,Data Pagamento\n';

    for (let i = 0; i < linhas.length; i++) {
        const celulas = linhas[i].getElementsByTagName('td');
        if (celulas.length === 9) {
            const linha = [
                celulas[0].textContent,
                `"${celulas[1].textContent}"`,
                `"${celulas[2].textContent}"`,
                celulas[3].textContent.replace('R$ ', '').replace('.', '').replace(',', '.'),
                celulas[4].textContent.replace('R$ ', '').replace('.', '').replace(',', '.'),
                celulas[5].textContent.replace('R$ ', '').replace('.', '').replace(',', '.'),
                celulas[6].textContent,
                celulas[7].textContent,
                celulas[8].textContent
            ];
            csv += linha.join(',') + '\n';
        }
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Função para testar dados (apenas para desenvolvimento)
function testarDados() {
    console.log('=== TESTANDO DADOS ===');
    console.log('Pagamentos no localStorage:', localStorage.getItem('pagamentosAgendamentos'));
    console.log('Agendamentos finalizados:', localStorage.getItem('agendamentosFinalizados'));
    console.log('Agendamentos com histórico:', localStorage.getItem('agendamentosComHistorico'));

    // Criar dados de teste se não existirem
    const pagamentosTeste = [
        {
            id: 1,
            valorServico: 30.00,
            desconto: 5.00,
            valorFinal: 25.00,
            formaPagamento: 'Dinheiro',
            valorPago: 30.00,
            troco: 5.00,
            dataPagamento: new Date().toISOString()
        }
    ];

    if (!localStorage.getItem('pagamentosAgendamentos')) {
        localStorage.setItem('pagamentosAgendamentos', JSON.stringify(pagamentosTeste));
        console.log('Dados de teste criados!');
    }

    carregarPagamentos();
    buscarAgendamentos();
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log("Iniciando página financeiro...");

    // Carregar dados primeiro
    carregarPagamentos();
    carregarClientes();
    carregarServicos();

    // Adicionar botões
    const filtersDiv = document.querySelector('.filters');

    // Botão Limpar
    const limparBtn = document.createElement('button');
    limparBtn.type = 'button';
    limparBtn.textContent = 'Limpar';
    limparBtn.className = 'alinhaBtns';
    limparBtn.style.background = '#6c757d';
    limparBtn.onclick = limparFiltros;
    filtersDiv.appendChild(limparBtn);

    // Botão Atualizar
    const atualizarBtn = document.createElement('button');
    atualizarBtn.type = 'button';
    atualizarBtn.textContent = 'Atualizar';
    atualizarBtn.className = 'alinhaBtns';
    atualizarBtn.style.background = '#17a2b8';
    atualizarBtn.onclick = atualizarDados;
    filtersDiv.appendChild(atualizarBtn);

    // Botão Exportar
    const exportarBtn = document.createElement('button');
    exportarBtn.type = 'button';
    exportarBtn.textContent = 'Exportar CSV';
    exportarBtn.className = 'alinhaBtns';
    exportarBtn.style.background = '#28a745';
    exportarBtn.onclick = exportarRelatorio;
    filtersDiv.appendChild(exportarBtn);

    // Botão Testar (apenas desenvolvimento)
    const testarBtn = document.createElement('button');
    testarBtn.type = 'button';
    testarBtn.textContent = 'Testar Dados';
    testarBtn.className = 'alinhaBtns';
    testarBtn.style.background = '#ffc107';
    testarBtn.style.color = '#000';
    testarBtn.onclick = testarDados;
    filtersDiv.appendChild(testarBtn);

    // Buscar dados iniciais
    setTimeout(() => {
        buscarAgendamentos();
    }, 1000);
});

// Atualizar a cada 30 segundos
setInterval(atualizarDados, 30000);