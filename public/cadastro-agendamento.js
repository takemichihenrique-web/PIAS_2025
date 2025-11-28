// Variável global para armazenar o ID do agendamento atual
let agendamentoAtualId = null;

// Função para verificar se agendamento já foi finalizado
function agendamentoJaFinalizado(id) {
    const agendamentosFinalizados = JSON.parse(localStorage.getItem('agendamentosFinalizados') || '[]');
    return agendamentosFinalizados.includes(id);
}

// Função para buscar barbeiros
async function buscarBarbeiro() {
    try {
        console.log("=== BUSCANDO BARBEIROS ===");
        const response = await fetch("/buscar-barbeiros");

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const barbeiros = await response.json();
        console.log("Barbeiros recebidos:", barbeiros);

        const select = document.getElementById("barbeiroSelecionado");
        select.innerHTML = '<option value="">Selecione o Barbeiro</option>';

        if (barbeiros.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "Nenhum barbeiro disponível";
            select.appendChild(option);
        } else {
            barbeiros.forEach((barbeiro) => {
                const option = document.createElement("option");
                option.value = barbeiro.id;
                option.textContent = barbeiro.nome;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar os barbeiros:", error);
        alert("Erro ao carregar barbeiros. Verifique o console.");
    }
}

// Função para buscar serviços
async function buscarServico() {
    try {
        console.log("=== BUSCANDO SERVIÇOS ===");
        const response = await fetch("/buscar-servicos");

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const servicos = await response.json();
        console.log("Serviços recebidos:", servicos);

        const select = document.getElementById("servicoSelecionado");
        select.innerHTML = '<option value="">Selecione o Serviço</option>';

        if (servicos.length === 0) {
            console.log("Nenhum serviço no SQLite, buscando do localStorage...");
            const servicosLocalStorage = JSON.parse(localStorage.getItem('servicos_barbearia') || '[]');

            if (servicosLocalStorage.length === 0) {
                const option = document.createElement("option");
                option.value = "";
                option.textContent = "Nenhum serviço disponível - Cadastre primeiro";
                select.appendChild(option);
            } else {
                servicosLocalStorage.forEach((servico) => {
                    const option = document.createElement("option");
                    option.value = servico.id;
                    option.textContent = `${servico.nome} - R$ ${parseFloat(servico.preco || 0).toFixed(2)}`;
                    select.appendChild(option);
                });
            }
        } else {
            servicos.forEach((servico) => {
                const option = document.createElement("option");
                option.value = servico.id;
                option.textContent = `${servico.nome} - R$ ${parseFloat(servico.preco).toFixed(2)} (Comissão: ${servico.comissao_percentual || 30}%)`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar os serviços:", error);

        // Fallback para localStorage
        try {
            const servicosLocalStorage = JSON.parse(localStorage.getItem('servicos_barbearia') || '[]');
            const select = document.getElementById("servicoSelecionado");
            select.innerHTML = '<option value="">Selecione o Serviço</option>';

            if (servicosLocalStorage.length === 0) {
                const option = document.createElement("option");
                option.value = "";
                option.textContent = "Cadastre serviços primeiro";
                select.appendChild(option);
            } else {
                servicosLocalStorage.forEach((servico) => {
                    const option = document.createElement("option");
                    option.value = servico.id;
                    option.textContent = `${servico.nome} - R$ ${parseFloat(servico.preco || 0).toFixed(2)}`;
                    select.appendChild(option);
                });
            }
        } catch (fallbackError) {
            console.error("Erro no fallback do localStorage:", fallbackError);
            alert("Erro ao carregar serviços. Cadastre serviços primeiro.");
        }
    }
}

// Função para buscar horários disponíveis
async function buscaHorariosDisponiveis() {
    const data = document.getElementById("data").value;
    const id = document.getElementById("servicoSelecionado").value;

    if (!data || !id) {
        document.getElementById("horaSelecionada").innerHTML = '<option value="">Selecione o Horário</option>';
        return;
    }

    try {
        console.log("Buscando horários para data:", data, "serviço:", id);
        const response = await fetch(`/horarios-disponiveis?data=${data}&id=${id}`);

        if (!response.ok) {
            throw new Error("Erro ao buscar horários disponíveis");
        }

        const horariosDisponiveis = await response.json();
        console.log("Horários disponíveis:", horariosDisponiveis);

        const selectHorario = document.getElementById("horaSelecionada");
        selectHorario.innerHTML = '<option value="">Selecione o Horário</option>';

        if (horariosDisponiveis.length > 0) {
            horariosDisponiveis.forEach((horario) => {
                const option = document.createElement("option");
                option.value = horario;
                option.textContent = horario;
                selectHorario.appendChild(option);
            });
        } else {
            alert("Não há horários disponíveis para esta data e serviço.");
        }
    } catch (error) {
        console.error("Erro ao carregar horários disponíveis:", error);
    }
}

// Função para cadastrar agendamento
async function cadastrarAgendamento(event) {
    event.preventDefault();

    const data = document.getElementById("data").value;
    const horario = document.getElementById("horaSelecionada").value;
    const cpf_cliente = document.getElementById("cpf_cli").value;
    const id_barbeiro = document.getElementById("barbeiroSelecionado").value;
    const id_servico = document.getElementById("servicoSelecionado").value;

    console.log("Dados do agendamento:", {
        data, horario, cpf_cliente, id_barbeiro, id_servico
    });

    // Validação do CPF (11 dígitos)
    const cpfNumeros = cpf_cliente.replace(/\D/g, '');
    if (cpfNumeros.length !== 11 || !/^\d+$/.test(cpfNumeros)) {
        alert("CPF deve conter exatamente 11 números.");
        return;
    }

    if (!data || !horario || !cpf_cliente || !id_barbeiro || !id_servico) {
        alert("Preencha todos os campos.");
        return;
    }

    try {
        const resp = await fetch("/cadastrar-agendamento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                data,
                horario,
                cpf_cliente: cpfNumeros,
                id_barbeiro,
                id_servico,
            }),
        });

        const resultado = await resp.json();
        console.log("Resposta do servidor:", resultado);

        if (!resp.ok) {
            console.error("Falha no cadastro:", resultado);
            alert(`Erro ao cadastrar: ${resultado.message}`);
            return;
        }

        alert("Agendamento cadastrado com sucesso!");

        // Limpar formulário
        document.getElementById("data").value = "";
        document.getElementById("cpf_cli").value = "";
        document.getElementById("barbeiroSelecionado").value = "";
        document.getElementById("servicoSelecionado").value = "";
        document.getElementById("horaSelecionada").innerHTML = '<option value="">Selecione o Horário</option>';

        // Atualiza a lista de agendamentos após cadastro
        listarAgendamentos();
    } catch (e) {
        console.error("Erro ao cadastrar agendamento:", e);
        alert("Erro de rede ao cadastrar.");
    }
}

// FUNÇÃO CORRIGIDA: Listar agendamentos
async function listarAgendamentos() {
    try {
        const data = document.getElementById("data").value.trim();
        let url = "/agendamentos";

        if (data) {
            url += `?date=${data}`;
        }

        console.log("Buscando agendamentos na URL:", url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const agendamentos = await response.json();
        console.log("Agendamentos recebidos:", agendamentos);

        const tabela = document.getElementById("tabela-agendamentos");

        if (!tabela) {
            console.error("Tabela de agendamentos não encontrada!");
            return;
        }

        tabela.innerHTML = "";

        if (agendamentos.length === 0) {
            tabela.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #6c757d;">Nenhum agendamento encontrado.</td></tr>';
            console.log("Nenhum agendamento encontrado");
        } else {
            // Carrega a lista de IDs finalizados do localStorage
            const agendamentosFinalizados = JSON.parse(localStorage.getItem('agendamentosFinalizados') || '[]');
            const agendamentosComHistorico = JSON.parse(localStorage.getItem('agendamentosComHistorico') || '[]');

            console.log("Agendamentos finalizados:", agendamentosFinalizados);
            console.log("Agendamentos com histórico:", agendamentosComHistorico);

            agendamentos.forEach(agendamento => {
                const linha = document.createElement("tr");
                linha.id = `agendamento-${agendamento.id}`;

                // Verifica se este agendamento está na lista de finalizados
                const estaFinalizado = agendamentosFinalizados.includes(agendamento.id);
                const temHistorico = agendamentosComHistorico.includes(agendamento.id);
                const jaFinalizado = agendamentoJaFinalizado(agendamento.id);
                const botaoFinalizarDisabled = jaFinalizado ? 'disabled' : '';

                console.log(`Agendamento ${agendamento.id}: finalizado=${estaFinalizado}, historico=${temHistorico}, jaFinalizado=${jaFinalizado}`);

                if (estaFinalizado) {
                    linha.style.display = 'none';
                }

                linha.innerHTML = `
                    <td>${agendamento.id}</td>
                    <td>${agendamento.data}</td>
                    <td>${agendamento.horario}</td>
                    <td>${agendamento.cliente_nome || agendamento.cpf_cliente}</td>
                    <td>${agendamento.barbeiro_nome || agendamento.id_barbeiro}</td>
                    <td>${agendamento.servico_nome || agendamento.id_servico}</td>
                    <td>
                        <button type="button" class="btn-finalizar" onclick="abrirModalPagamento(${agendamento.id})" ${botaoFinalizarDisabled}>
                            <i class="fas ${estaFinalizado ? 'fa-undo' : 'fa-check'}"></i> ${estaFinalizado ? 'Reabrir' : 'Finalizar'}
                        </button>
                        <button type="button" class="btn-excluir" onclick="excluirAgendamento(${agendamento.id})">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </td>
                `;

                // Aplica a cor do botão baseado no estado e histórico
                const btnFinalizar = linha.querySelector('.btn-finalizar');
                if (jaFinalizado) {
                    // Se já foi finalizado - Cinza (desabilitado)
                    btnFinalizar.style.backgroundColor = '#6c757d';
                    btnFinalizar.style.color = '#fff';
                    btnFinalizar.style.cursor = 'not-allowed';
                    btnFinalizar.title = 'Agendamento já finalizado';
                } else if (estaFinalizado) {
                    // Se está finalizado - Amarelo
                    btnFinalizar.style.backgroundColor = '#ffc107';
                    btnFinalizar.style.color = '#000';
                } else if (temHistorico) {
                    // Se tem histórico mas está reaberto - Azul
                    btnFinalizar.style.backgroundColor = '#17a2b8';
                    btnFinalizar.style.color = '#fff';
                } else {
                    // Se nunca foi finalizado - Verde
                    btnFinalizar.style.backgroundColor = '#28a745';
                    btnFinalizar.style.color = '#fff';
                }

                tabela.appendChild(linha);
            });

            console.log(`${agendamentos.length} agendamentos renderizados na tabela`);
        }
    } catch (error) {
        console.error("Erro ao listar agendamentos:", error);
        const tabela = document.getElementById("tabela-agendamentos");
        if (tabela) {
            tabela.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #dc3545;">Erro ao carregar agendamentos.</td></tr>';
        }
    }
}

// Função para excluir agendamento
async function excluirAgendamento(id) {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) {
        return;
    }

    try {
        const resp = await fetch(`/excluir-agendamento/${id}`, {
            method: "DELETE",
        });

        const resultado = await resp.json();

        if (!resp.ok) {
            console.error("Falha na exclusão:", resultado);
            alert(`Erro ao excluir: ${resultado.message}`);
            return;
        }

        // Remove o ID de todas as listas
        const agendamentosFinalizados = JSON.parse(localStorage.getItem('agendamentosFinalizados') || '[]');
        const agendamentosComHistorico = JSON.parse(localStorage.getItem('agendamentosComHistorico') || '[]');
        const pagamentos = JSON.parse(localStorage.getItem('pagamentosAgendamentos') || '[]');

        const novaListaFinalizados = agendamentosFinalizados.filter(agendamentoId => agendamentoId !== id);
        const novaListaHistorico = agendamentosComHistorico.filter(agendamentoId => agendamentoId !== id);
        const novaListaPagamentos = pagamentos.filter(pagamento => pagamento.id !== id);

        localStorage.setItem('agendamentosFinalizados', JSON.stringify(novaListaFinalizados));
        localStorage.setItem('agendamentosComHistorico', JSON.stringify(novaListaHistorico));
        localStorage.setItem('pagamentosAgendamentos', JSON.stringify(novaListaPagamentos));

        alert("Agendamento excluído com sucesso!");
        listarAgendamentos(); // Atualiza a lista após exclusão
    } catch (e) {
        console.error("Erro ao excluir agendamento:", e);
        alert("Erro de rede ao excluir.");
    }
}

// ========== FUNÇÕES DE PAGAMENTO ==========

// Função para abrir o modal de pagamento
function abrirModalPagamento(id) {
    // Verifica se o agendamento já foi finalizado
    if (agendamentoJaFinalizado(id)) {
        alert("⚠️ Este agendamento já foi finalizado e não pode ser alterado!");
        return;
    }

    agendamentoAtualId = id;
    console.log("Abrindo modal de pagamento para agendamento:", id);

    // Buscar informações completas do agendamento para preencher o valor do serviço
    fetch(`/agendamentos`)
        .then(response => response.json())
        .then(agendamentos => {
            const agendamento = agendamentos.find(a => a.id === id);
            console.log("Agendamento encontrado:", agendamento);

            if (!agendamento) {
                alert("Agendamento não encontrado!");
                return;
            }

            // Buscar o preço do serviço separadamente
            if (agendamento && agendamento.id_servico) {
                fetch(`/servicos`)
                    .then(response => response.json())
                    .then(servicos => {
                        const servico = servicos.find(s => s.id == agendamento.id_servico);
                        console.log("Serviço encontrado:", servico);

                        if (servico && servico.preco) {
                            // Preenche automaticamente o valor do serviço
                            document.getElementById('valorServico').value = parseFloat(servico.preco).toFixed(2);
                            console.log("Valor do serviço preenchido:", servico.preco);

                            // Já calcula o valor final inicial
                            calcularValorFinal();
                        } else {
                            document.getElementById('valorServico').value = '';
                            console.log("Serviço não encontrado ou sem preço");
                        }

                        // Verificar se já existe pagamento para este agendamento
                        const pagamentos = JSON.parse(localStorage.getItem('pagamentosAgendamentos') || '[]');
                        const pagamentoExistente = pagamentos.find(p => p.id === id);
                        console.log("Pagamento existente:", pagamentoExistente);

                        if (pagamentoExistente) {
                            // Preencher com os valores existentes
                            document.getElementById('desconto').value = pagamentoExistente.desconto || '0';
                            document.getElementById('formaPagamento').value = pagamentoExistente.formaPagamento || '';
                            document.getElementById('valorPago').value = pagamentoExistente.valorPago || '0';
                            document.getElementById('troco').value = pagamentoExistente.troco || '0';

                            // Recalcula com os valores existentes
                            calcularValorFinal();
                            if (pagamentoExistente.formaPagamento === 'Dinheiro') {
                                calcularTroco();
                            }
                        } else {
                            // Resetar outros campos
                            document.getElementById('formaPagamento').value = '';
                            document.getElementById('desconto').value = '0';
                            document.getElementById('valorPago').value = '0';
                            document.getElementById('troco').value = '0';
                        }

                        toggleCampoDesconto(); // Atualizar visibilidade dos campos
                    })
                    .catch(error => {
                        console.error('Erro ao buscar serviço:', error);
                        document.getElementById('valorServico').value = '';
                    });
            } else {
                document.getElementById('valorServico').value = '';
                console.log("Agendamento sem ID de serviço");
            }

            // Mostrar modal
            document.getElementById('modalPagamento').style.display = 'block';

            // Ajustar o tamanho do modal para caber na tela
            ajustarModal();
        })
        .catch(error => {
            console.error('Erro ao buscar agendamento:', error);
            // Se der erro, ainda assim abre o modal
            document.getElementById('modalPagamento').style.display = 'block';
            ajustarModal();
        });
}

// Função para ajustar o modal dinamicamente
function ajustarModal() {
    const modal = document.getElementById('modalPagamento');
    const modalContent = modal.querySelector('.modal-content');
    const modalBody = modal.querySelector('.modal-body');

    const windowHeight = window.innerHeight;
    const maxModalHeight = windowHeight * 0.85; // 85% da altura da tela

    modalContent.style.maxHeight = maxModalHeight + 'px';
    modalBody.style.maxHeight = (maxModalHeight - 120) + 'px'; // Subtrai header e margens
    modalBody.style.overflowY = 'auto';
}

// Função para fechar o modal de pagamento
function fecharModalPagamento() {
    document.getElementById('modalPagamento').style.display = 'none';
    agendamentoAtualId = null;
}

// Função para mostrar/ocultar campos baseado na forma de pagamento
function toggleCampoDesconto() {
    const formaPagamento = document.getElementById('formaPagamento').value;
    const grupoDesconto = document.getElementById('grupoDesconto');
    const grupoValorPago = document.getElementById('grupoValorPago');
    const grupoTroco = document.getElementById('grupoTroco');

    // SEMPRE mostra desconto para todas as formas de pagamento
    grupoDesconto.style.display = 'block';

    // Mostra campos de valor pago e troco apenas para dinheiro
    if (formaPagamento === 'Dinheiro') {
        grupoValorPago.style.display = 'block';
        grupoTroco.style.display = 'block';

        // Se for dinheiro e valor pago for 0, preenche com valor final
        const valorPago = parseFloat(document.getElementById('valorPago').value) || 0;
        const valorFinal = parseFloat(document.getElementById('valorFinal').value) || 0;

        if (valorPago === 0 && valorFinal > 0) {
            document.getElementById('valorPago').value = valorFinal.toFixed(2);
            calcularTroco(); // Já calcula o troco
        }
    } else {
        grupoValorPago.style.display = 'none';
        grupoTroco.style.display = 'none';
        document.getElementById('valorPago').value = '0';
        document.getElementById('troco').value = '0';
    }

    // Recalcula valores
    calcularValorFinal();
}

// Função para calcular o valor final com desconto
function calcularValorFinal() {
    const valorServico = parseFloat(document.getElementById('valorServico').value) || 0;
    const descontoPercentual = parseFloat(document.getElementById('desconto').value) || 0;

    // Garante que o desconto não seja maior que 100%
    const descontoAjustado = Math.min(descontoPercentual, 100);
    if (descontoPercentual !== descontoAjustado) {
        document.getElementById('desconto').value = descontoAjustado.toFixed(2);
    }

    // Calcula o valor do desconto em reais
    const valorDesconto = valorServico * (descontoAjustado / 100);
    const valorFinal = Math.max(0, valorServico - valorDesconto);

    document.getElementById('valorFinal').value = valorFinal.toFixed(2);

    // Se for dinheiro, recalcula o troco automaticamente
    if (document.getElementById('formaPagamento').value === 'Dinheiro') {
        calcularTroco();
    }
}

// Função para calcular o troco
function calcularTroco() {
    const valorFinal = parseFloat(document.getElementById('valorFinal').value) || 0;
    let valorPago = parseFloat(document.getElementById('valorPago').value) || 0;

    // Se valor pago for menor que valor final, ajusta para igual
    if (valorPago < valorFinal) {
        valorPago = valorFinal;
        document.getElementById('valorPago').value = valorPago.toFixed(2);
    }

    const troco = Math.max(0, valorPago - valorFinal);
    document.getElementById('troco').value = troco.toFixed(2);
}

// NOVA FUNÇÃO: Buscar percentual fixo do serviço - AGORA 30%
async function buscarPercentualComissao(id_servico) {
    try {
        const response = await fetch('/servicos');
        const servicos = await response.json();
        const servico = servicos.find(s => s.id == id_servico);
        return servico ? (servico.comissao_percentual || 30) : 30; // MUDOU PARA 30%
    } catch (error) {
        console.error('Erro ao buscar percentual:', error);
        return 30; // MUDOU PARA 30%
    }
}

// Função para registrar comissão no backend
async function registrarComissaoNoBackend(comissaoPercentual, valorComissao, valorFinal, descontoPercentual) {
    try {
        const response = await fetch("/registrar-comissao", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                agendamento_id: agendamentoAtualId,
                comissao_percentual: comissaoPercentual,
                valor_comissao: valorComissao,
                valor_final: valorFinal,
                desconto: descontoPercentual
            }),
        });

        const resultado = await response.json();
        return resultado.success;

    } catch (error) {
        console.error("Erro ao registrar comissão:", error);
        return false;
    }
}

// Função para confirmar o pagamento COM COMISSÃO FIXA DE 30%
async function confirmarPagamento() {
    // Verifica se o agendamento já foi finalizado
    if (agendamentoJaFinalizado(agendamentoAtualId)) {
        alert("❌ Este agendamento já foi finalizado anteriormente!");
        fecharModalPagamento();
        return;
    }

    const valorServico = parseFloat(document.getElementById('valorServico').value) || 0;
    const descontoPercentual = parseFloat(document.getElementById('desconto').value) || 0;
    const valorFinal = parseFloat(document.getElementById('valorFinal').value) || 0;
    const formaPagamento = document.getElementById('formaPagamento').value;
    const valorPago = parseFloat(document.getElementById('valorPago').value) || 0;
    const troco = parseFloat(document.getElementById('troco').value) || 0;

    console.log("Confirmando pagamento:", {
        valorServico, descontoPercentual, valorFinal, formaPagamento, valorPago, troco
    });

    // Validações
    if (!valorServico || valorServico <= 0) {
        alert("Por favor, informe o valor do serviço.");
        document.getElementById('valorServico').focus();
        return;
    }

    if (!formaPagamento) {
        alert("Por favor, selecione a forma de pagamento.");
        document.getElementById('formaPagamento').focus();
        return;
    }

    if (formaPagamento === 'Dinheiro') {
        if (!valorPago || valorPago <= 0) {
            alert("Por favor, informe o valor pago.");
            document.getElementById('valorPago').focus();
            return;
        }
        if (valorPago < valorFinal) {
            alert("O valor pago deve ser maior ou igual ao valor final quando pagamento em dinheiro.");
            document.getElementById('valorPago').focus();
            return;
        }
    }

    if (descontoPercentual > 100) {
        alert("O desconto não pode ser maior que 100%.");
        document.getElementById('desconto').focus();
        return;
    }

    // BUSCAR PERCENTUAL FIXO DO SERVIÇO - AGORA 30%
    const comissaoPercentual = await buscarPercentualComissao(agendamentoAtualId);
    const valorComissao = valorFinal * (comissaoPercentual / 100);

    console.log("Comissão calculada:", { comissaoPercentual, valorComissao });

    // Montar resumo do pagamento (SEM perguntar percentual)
    let resumo = `Confirmar finalização do agendamento?\n\n`;
    resumo += `Valor do Serviço: R$ ${valorServico.toFixed(2)}\n`;
    if (descontoPercentual > 0) {
        resumo += `Desconto: ${descontoPercentual.toFixed(2)}%\n`;
    }
    resumo += `Valor Final: R$ ${valorFinal.toFixed(2)}\n`;
    resumo += `Comissão do Barbeiro: ${comissaoPercentual}% (R$ ${valorComissao.toFixed(2)})\n`;
    resumo += `Forma de Pagamento: ${formaPagamento}`;

    if (formaPagamento === 'Dinheiro') {
        resumo += `\nValor Pago: R$ ${valorPago.toFixed(2)}`;
        if (troco > 0) {
            resumo += `\nTroco: R$ ${troco.toFixed(2)}`;
        }
    }

    // Confirmar finalização
    if (confirm(resumo)) {
        // Registrar a comissão no backend
        const comissaoRegistrada = await registrarComissaoNoBackend(comissaoPercentual, valorComissao, valorFinal, descontoPercentual);

        if (!comissaoRegistrada) {
            alert("⚠️ Pagamento confirmado, mas houve erro ao registrar comissão.");
        }

        // Salvar informações do pagamento no localStorage
        const pagamentoInfo = {
            id: agendamentoAtualId,
            valorServico: valorServico,
            desconto: descontoPercentual,
            valorFinal: valorFinal,
            formaPagamento: formaPagamento,
            valorPago: valorPago,
            troco: troco,
            comissaoPercentual: comissaoPercentual,
            valorComissao: valorComissao,
            dataPagamento: new Date().toISOString()
        };

        const pagamentos = JSON.parse(localStorage.getItem('pagamentosAgendamentos') || '[]');
        const pagamentoExistenteIndex = pagamentos.findIndex(p => p.id === agendamentoAtualId);

        if (pagamentoExistenteIndex !== -1) {
            pagamentos[pagamentoExistenteIndex] = pagamentoInfo;
        } else {
            pagamentos.push(pagamentoInfo);
        }

        localStorage.setItem('pagamentosAgendamentos', JSON.stringify(pagamentos));

        // FINALIZAR O AGENDAMENTO
        const agendamentosFinalizados = JSON.parse(localStorage.getItem('agendamentosFinalizados') || '[]');
        const agendamentosComHistorico = JSON.parse(localStorage.getItem('agendamentosComHistorico') || '[]');

        if (!agendamentosFinalizados.includes(agendamentoAtualId)) {
            agendamentosFinalizados.push(agendamentoAtualId);
            localStorage.setItem('agendamentosFinalizados', JSON.stringify(agendamentosFinalizados));
        }

        if (!agendamentosComHistorico.includes(agendamentoAtualId)) {
            agendamentosComHistorico.push(agendamentoAtualId);
            localStorage.setItem('agendamentosComHistorico', JSON.stringify(agendamentosComHistorico));
        }

        const agendamentosDefinitivamenteFinalizados = JSON.parse(localStorage.getItem('agendamentosDefinitivamenteFinalizados') || '[]');
        if (!agendamentosDefinitivamenteFinalizados.includes(agendamentoAtualId)) {
            agendamentosDefinitivamenteFinalizados.push(agendamentoAtualId);
            localStorage.setItem('agendamentosDefinitivamenteFinalizados', JSON.stringify(agendamentosDefinitivamenteFinalizados));
        }

        alert("✅ Pagamento confirmado e agendamento finalizado com sucesso!\n\n💰 Comissão de 30% registrada para o barbeiro.");
        fecharModalPagamento();
        listarAgendamentos();
    }
}

// Função para buscar clientes por CPF (com sugestões)
async function buscarClientes(cpfParcial) {
    if (cpfParcial.length < 3) {
        document.getElementById('cpfClientes').innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`/clientes?cpf=${cpfParcial}`);
        const clientes = await response.json();

        const datalist = document.getElementById('cpfClientes');
        datalist.innerHTML = '';

        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.cpf;
            option.textContent = `${cliente.cpf} - ${cliente.nome}`;
            datalist.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
    }
}

// Função para formatar CPF enquanto digita
function formatarCPFInput(input) {
    let cpf = input.value.replace(/\D/g, '');
    cpf = cpf.substring(0, 11);

    if (cpf.length > 3) {
        cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    }
    if (cpf.length > 6) {
        cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    }
    if (cpf.length > 9) {
        cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    input.value = cpf;
}

// FUNÇÃO DE DEBUG - Testar se os agendamentos estão sendo buscados
async function debugAgendamentos() {
    try {
        console.log("=== DEBUG AGENDAMENTOS ===");

        // Testar busca de agendamentos
        const response = await fetch('/agendamentos');
        const agendamentos = await response.json();
        console.log("Agendamentos encontrados:", agendamentos);

        // Testar barbeiros
        const responseBarbeiros = await fetch('/buscar-barbeiros');
        const barbeiros = await responseBarbeiros.json();
        console.log("Barbeiros encontrados:", barbeiros);

        // Testar serviços
        const responseServicos = await fetch('/buscar-servicos');
        const servicos = await responseServicos.json();
        console.log("Serviços encontrados:", servicos);

        alert(`Debug completo!\nAgendamentos: ${agendamentos.length}\nBarbeiros: ${barbeiros.length}\nServiços: ${servicos.length}\nVerifique o console.`);

    } catch (error) {
        console.error('Erro no debug:', error);
        alert('Erro ao fazer debug. Verifique o console.');
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log("=== INICIALIZANDO PÁGINA DE AGENDAMENTOS ===");

    // Configurar limite de caracteres para CPF
    const cpfInput = document.getElementById('cpf_cli');
    if (cpfInput) {
        cpfInput.setAttribute('maxlength', '14'); // xxx.xxx.xxx-xx
        cpfInput.addEventListener('input', function() {
            formatarCPFInput(this);
        });
    }

    // Carregar barbeiros e serviços ao carregar a página
    console.log("Carregando barbeiros e serviços...");
    buscarBarbeiro();
    buscarServico();
    listarAgendamentos();

    // Adicionar eventos para os selects
    const servicoSelect = document.getElementById('servicoSelecionado');
    if (servicoSelect) {
        servicoSelect.addEventListener('change', function() {
            if (document.getElementById('data').value) {
                buscaHorariosDisponiveis();
            }
        });
    }

    const dataInput = document.getElementById('data');
    if (dataInput) {
        dataInput.addEventListener('change', function() {
            if (servicoSelect.value) {
                buscaHorariosDisponiveis();
            }
        });
    }

    // Adicionar botão para debug
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) {
        const debugBtn = document.createElement('button');
        debugBtn.type = 'button';
        debugBtn.textContent = 'Debug Agendamentos';
        debugBtn.className = 'btn-excluir';
        debugBtn.style.marginTop = '10px';
        debugBtn.style.backgroundColor = '#6c757d';
        debugBtn.onclick = debugAgendamentos;
        mainContainer.appendChild(debugBtn);
    }

    // Adicionar listener para redimensionamento da janela
    window.addEventListener('resize', function() {
        if (document.getElementById('modalPagamento').style.display === 'block') {
            ajustarModal();
        }
    });

    // Event listeners para cálculos automáticos
    const valorServicoInput = document.getElementById('valorServico');
    const descontoInput = document.getElementById('desconto');
    const valorPagoInput = document.getElementById('valorPago');
    const formaPagamentoSelect = document.getElementById('formaPagamento');

    if (valorServicoInput) {
        valorServicoInput.addEventListener('input', calcularValorFinal);
    }
    if (descontoInput) {
        descontoInput.addEventListener('input', calcularValorFinal);
    }
    if (valorPagoInput) {
        valorPagoInput.addEventListener('input', calcularTroco);
    }
    if (formaPagamentoSelect) {
        formaPagamentoSelect.addEventListener('change', toggleCampoDesconto);
    }

    console.log("=== PÁGINA DE AGENDAMENTOS INICIALIZADA ===");
});

// Fechar modal ao clicar fora dele
window.onclick = function(event) {
    const modal = document.getElementById('modalPagamento');
    if (event.target === modal) {
        fecharModalPagamento();
    }
}