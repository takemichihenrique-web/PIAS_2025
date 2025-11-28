// Função para carregar clientes no datalist
function carregarClientes() {
    fetch('/clientes')
        .then(response => {
            if (!response.ok) throw new Error('Erro ao carregar clientes');
            return response.json();
        })
        .then(clientes => {
            const datalist = document.getElementById('clientes-list');
            datalist.innerHTML = '';

            if (Array.isArray(clientes)) {
                clientes.forEach(cliente => {
                    const option = document.createElement('option');
                    option.value = cliente.cpf || '';
                    option.textContent = `${cliente.nome || ''} - ${cliente.cpf || ''}`;
                    datalist.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Erro ao carregar clientes:', error);
        });
}

// Função para carregar serviços no select
function carregarServicos() {
    fetch('/servicos')
        .then(response => {
            if (!response.ok) throw new Error('Erro ao carregar serviços');
            return response.json();
        })
        .then(servicos => {
            const select = document.getElementById('servico');

            if (Array.isArray(servicos)) {
                servicos.forEach(servico => {
                    const option = document.createElement('option');
                    option.value = servico.nome || servico.id || '';
                    option.textContent = servico.nome || 'Serviço sem nome';
                    select.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Erro ao carregar serviços:', error);
        });
}

// Função para buscar o relatório com filtros
function buscarAgendamentos() {
    const cpf = document.getElementById("cpf").value;
    const servico = document.getElementById("servico").value;
    const dataInicio = document.getElementById("dataInicio").value;
    const dataFim = document.getElementById("dataFim").value;

    // Construir a URL com os parâmetros de filtro
    let url = `/agendamentos?`;
    if (cpf) url += `cpf_cliente=${encodeURIComponent(cpf)}&`;
    if (servico) url += `servico=${encodeURIComponent(servico)}&`;
    if (dataInicio) url += `dataInicio=${encodeURIComponent(dataInicio)}&`;
    if (dataFim) url += `dataFim=${encodeURIComponent(dataFim)}&`;
    url = url.replace(/[&?]$/, ''); // remove & ou ? final

    console.log("URL da requisição:", url);

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Resposta do servidor não OK: ' + response.status);
            return response.json();
        })
        .then(data => {
            console.log('Agendamentos recebidos:', data);
            const tabelaAgendamentos = document.getElementById("tabela-agendamentos");
            tabelaAgendamentos.innerHTML = '';

            if (!Array.isArray(data) || data.length === 0) {
                const trEmpty = document.createElement('tr');
                trEmpty.innerHTML = `<td colspan="5">Nenhum agendamento encontrado.</td>`;
                tabelaAgendamentos.appendChild(trEmpty);
                return;
            }

            data.forEach(agendamento => {
                const id = agendamento.id || '—';
                const clienteNome = agendamento.cliente_nome || '—';
                const clienteCpf = agendamento.cliente_cpf || agendamento.cpf_cliente || '';
                const servicoNome = agendamento.servico_nome || '—';
                const horario = agendamento.horario || '—';
                const dataStr = agendamento.data || '';
                const dataFormatada = dataStr ? new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${id}</td>
                    <td>${clienteNome}${clienteCpf ? ' (' + clienteCpf + ')' : ''}</td>
                    <td>${servicoNome}</td>
                    <td>${horario}</td>
                    <td>${dataFormatada}</td>
                `;
                tabelaAgendamentos.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Erro ao buscar relatórios:', error);
            const tabelaAgendamentos = document.getElementById("tabela-agendamentos");
            tabelaAgendamentos.innerHTML = `<tr><td colspan="5">Erro ao carregar agendamentos.</td></tr>`;
        });
}

// Carregar clientes, serviços e agendamentos ao inicializar a página
document.addEventListener('DOMContentLoaded', function() {
    carregarClientes();
    carregarServicos();
    buscarAgendamentos();
});