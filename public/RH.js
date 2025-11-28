let todosFuncionarios = [];
let salarioAtivo = true; // Estado global do salário

// Carregar funcionários
async function carregarFuncionarios() {
    const loading = document.getElementById('loading');
    const noEmployees = document.getElementById('no-employees');

    loading.classList.remove('hidden');
    noEmployees.classList.add('hidden');

    try {
        const response = await fetch('/barbeiros');
        if (!response.ok) throw new Error('Erro ao carregar funcionários');

        const funcionarios = await response.json();
        todosFuncionarios = funcionarios;

        if (funcionarios.length === 0) {
            loading.classList.add('hidden');
            noEmployees.classList.remove('hidden');
            return;
        }

        atualizarEstatisticas(funcionarios);
        renderizarFuncionarios(funcionarios);
        loading.classList.add('hidden');

    } catch (error) {
        console.error('Erro:', error);
        loading.classList.add('hidden');
        alert('Erro ao carregar funcionários: ' + error.message);
    }
}

// FUNÇÃO NOVA: Alternar entre salário ativo/inativo
function alternarSalario() {
    salarioAtivo = !salarioAtivo;

    const toggleBtn = document.getElementById('toggle-salario');
    const statusText = document.getElementById('status-salario');

    if (salarioAtivo) {
        toggleBtn.innerHTML = '<i class="fas fa-toggle-on"></i> Salário Ativo';
        toggleBtn.style.background = '#28a745';
        statusText.textContent = 'Salário fixo ATIVO';
        statusText.style.color = '#28a745';
    } else {
        toggleBtn.innerHTML = '<i class="fas fa-toggle-off"></i> Salário Inativo';
        toggleBtn.style.background = '#dc3545';
        statusText.textContent = 'Apenas comissões';
        statusText.style.color = '#dc3545';
    }

    // Recarregar cálculos do modal atual se estiver aberto
    recarregarCalculosModal();

    console.log(`Salário ${salarioAtivo ? 'ativado' : 'desativado'}`);
}

// FUNÇÃO NOVA: Recarregar cálculos do modal atual
function recarregarCalculosModal() {
    const modal = document.getElementById('employee-modal');
    if (!modal.classList.contains('hidden')) {
        const barbeiroId = modal.getAttribute('data-barbeiro-id');
        if (barbeiroId) {
            // Fechar e reabrir o modal para atualizar os cálculos
            const funcionario = todosFuncionarios.find(f => f.id == barbeiroId);
            if (funcionario) {
                fecharModal();
                setTimeout(() => abrirModal(funcionario), 100);
            }
        }
    }
}

// FUNÇÃO ATUALIZADA: Calcular totais mensais considerando salário ativo/inativo
async function calcularTotaisMensais(barbeiroId) {
    try {
        console.log('=== CALCULANDO TOTAIS MENSAIS ===');
        console.log('Barbeiro ID:', barbeiroId);
        console.log('Salário ativo:', salarioAtivo);

        // Buscar salário fixo do barbeiro
        const responseBarbeiro = await fetch('/barbeiros');
        const barbeiros = await responseBarbeiro.json();
        const barbeiro = barbeiros.find(b => b.id == barbeiroId);

        if (!barbeiro) {
            console.log('Barbeiro não encontrado');
            return { salarioFixo: 0, totalComissaoMes: 0, totalReceber: 0, salarioAtivo: salarioAtivo };
        }

        const salarioFixo = salarioAtivo ? parseFloat(barbeiro.salario || 0) : 0;
        console.log('Salário fixo calculado:', salarioFixo);

        // Buscar comissões
        const response = await fetch('/comissoes-barbeiros');

        if (!response.ok) {
            throw new Error('Erro ao buscar comissões');
        }

        const data = await response.json();
        let totalComissaoMes = 0;

        // Procurar o barbeiro nas comissões
        if (data.comissoes && data.comissoes.length > 0) {
            const comissaoBarbeiro = data.comissoes.find(c => c.barbeiro_id == barbeiroId);
            console.log('Comissões do barbeiro:', comissaoBarbeiro);

            if (comissaoBarbeiro) {
                totalComissaoMes = comissaoBarbeiro.total_comissao || 0;
            }
        }

        const totalReceber = salarioFixo + totalComissaoMes;

        console.log('RESULTADO FINAL:');
        console.log('- Salário Fixo: R$', salarioFixo);
        console.log('- Comissões Mês: R$', totalComissaoMes);
        console.log('- Total a Receber: R$', totalReceber);
        console.log('- Modo:', salarioAtivo ? 'Salário + Comissões' : 'Apenas Comissões');

        return {
            salarioFixo,
            totalComissaoMes,
            totalReceber,
            salarioAtivo: salarioAtivo
        };

    } catch (error) {
        console.error('Erro ao calcular totais mensais:', error);
        return { salarioFixo: 0, totalComissaoMes: 0, totalReceber: 0, salarioAtivo: salarioAtivo };
    }
}

// Atualizar estatísticas
function atualizarEstatisticas(funcionarios) {
    const estatisticas = {
        'Barbeiro': { count: 0, totalSalario: 0 },
        'Cabeleireiro': { count: 0, totalSalario: 0 },
        'Recepcionista': { count: 0, totalSalario: 0 },
        'Gerente': { count: 0, totalSalario: 0 },
        'Outro': { count: 0, totalSalario: 0 }
    };

    funcionarios.forEach(funcionario => {
        const cargo = funcionario.cargo || 'Outro';
        if (estatisticas[cargo]) {
            estatisticas[cargo].count++;
            estatisticas[cargo].totalSalario += parseFloat(funcionario.salario || 0);
        }
    });

    for (const [cargo, dados] of Object.entries(estatisticas)) {
        const elementoCount = document.getElementById(`total-${cargo.toLowerCase()}s`);
        const elementoMedia = document.getElementById(`media-${cargo.toLowerCase()}s`);

        if (elementoCount) elementoCount.textContent = dados.count;
        if (elementoMedia) {
            const media = dados.count > 0 ? (dados.totalSalario / dados.count).toFixed(2) : 0;
            elementoMedia.textContent = `Média: R$ ${media}`;
        }
    }
}

// Renderizar funcionários
function renderizarFuncionarios(funcionarios) {
    const grids = ['barbeiros', 'cabeleireiros', 'recepcionistas', 'gerentes', 'outros'];
    grids.forEach(grid => {
        const elemento = document.getElementById(`grid-${grid}`);
        if (elemento) elemento.innerHTML = '';
    });

    const contadores = {
        'Barbeiro': 0, 'Cabeleireiro': 0, 'Recepcionista': 0, 'Gerente': 0, 'Outro': 0
    };

    funcionarios.forEach(funcionario => {
        const cargo = funcionario.cargo || 'Outro';
        contadores[cargo]++;
        criarCardFuncionario(funcionario);
    });

    for (const [cargo, count] of Object.entries(contadores)) {
        const section = document.getElementById(`section-${cargo.toLowerCase()}s`);
        const countElement = document.getElementById(`count-${cargo.toLowerCase()}s`);

        if (section && countElement) {
            countElement.textContent = count;
            if (count > 0) section.classList.remove('hidden');
            else section.classList.add('hidden');
        }
    }

    const totalFuncionarios = funcionarios.length;
    const noEmployees = document.getElementById('no-employees');
    if (totalFuncionarios === 0) noEmployees.classList.remove('hidden');
    else noEmployees.classList.add('hidden');
}

// Criar card de funcionário
function criarCardFuncionario(funcionario) {
    const cargo = funcionario.cargo || 'Outro';
    const gridId = `grid-${cargo.toLowerCase()}s`;
    const grid = document.getElementById(gridId);

    if (!grid) {
        console.warn(`Grid não encontrado: ${gridId}`);
        return;
    }

    const card = document.createElement('div');
    card.className = 'employee-card';
    card.setAttribute('data-barbeiro-id', funcionario.id);

    card.onclick = () => abrirModal(funcionario);

    const salario = parseFloat(funcionario.salario || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    card.innerHTML = `
        <div class="card-header">
            <div class="employee-avatar ${cargo.toLowerCase()}">
                <i class="fas ${getCargoIcon(cargo)}"></i>
            </div>
            <div class="employee-info">
                <h3>${funcionario.nome || 'Nome não informado'}</h3>
                <span class="employee-cargo ${cargo.toLowerCase()}">${cargo}</span>
            </div>
        </div>
        <div class="card-body">
            <div class="employee-detail">
                <i class="fas fa-id-card"></i>
                <span>${funcionario.cpf || 'CPF não informado'}</span>
            </div>
            <div class="employee-detail">
                <i class="fas fa-money-bill-wave"></i>
                <span>${salario}</span>
            </div>
            ${funcionario.especialidade ? `
            <div class="employee-detail">
                <i class="fas fa-star"></i>
                <span>${funcionario.especialidade}</span>
            </div>
            ` : ''}
        </div>
        <div class="card-footer">
            <button class="btn-view" onclick="event.stopPropagation(); abrirModal(${JSON.stringify(funcionario).replace(/"/g, '&quot;')})">
                <i class="fas fa-eye"></i> Ver Detalhes
            </button>
        </div>
    `;

    grid.appendChild(card);
}

// Obter ícone do cargo
function getCargoIcon(cargo) {
    const icons = {
        'Barbeiro': 'fa-cut',
        'Cabeleireiro': 'fa-female',
        'Recepcionista': 'fa-headset',
        'Gerente': 'fa-user-tie',
        'Outro': 'fa-user'
    };
    return icons[cargo] || 'fa-user';
}

// FUNÇÃO ATUALIZADA: Abrir modal com valores mensais e toggle
async function abrirModal(funcionario) {
    if (typeof funcionario === 'string') {
        try {
            funcionario = JSON.parse(funcionario.replace(/&quot;/g, '"'));
        } catch (e) {
            console.error('Erro ao parsear funcionário:', e);
            return;
        }
    }

    const modal = document.getElementById('employee-modal');

    // Preencher dados básicos do modal PRIMEIRO
    document.getElementById('modal-title').textContent = `Detalhes - ${funcionario.nome}`;
    document.getElementById('modal-nome').textContent = funcionario.nome || 'Nome não informado';
    document.getElementById('modal-cargo').textContent = funcionario.cargo || 'Outro';
    document.getElementById('modal-cargo').className = `employee-cargo ${(funcionario.cargo || 'Outro').toLowerCase()}`;
    document.getElementById('modal-cpf').textContent = funcionario.cpf || 'CPF não informado';
    document.getElementById('modal-email').textContent = funcionario.email || 'E-mail não informado';
    document.getElementById('modal-telefone').textContent = funcionario.telefone || 'Telefone não informado';

    const salarioBase = parseFloat(funcionario.salario || 0);
    document.getElementById('modal-salario').textContent = salarioBase.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    document.getElementById('modal-endereco').textContent = funcionario.endereco || 'Endereço não informado';
    document.getElementById('modal-especialidade').textContent = funcionario.especialidade || 'Nenhuma especialidade informada';
    document.getElementById('modal-id').textContent = funcionario.id || 'N/A';

    // CALCULAR TOTAIS MENSAIS
    console.log('=== INICIANDO CÁLCULO DE TOTAIS MENSAIS ===');
    const totaisMensais = await calcularTotaisMensais(funcionario.id);
    console.log('Totais calculados para o modal:', totaisMensais);

    // CRIAR HTML DOS VALORES MENSAIS COM TOGGLE
    const valoresMensaisHTML = `
        <div class="valores-mensais" style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 10px; border: 2px solid #dee2e6;">
            <!-- TOGGLE DO SALÁRIO -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; border: 2px solid #e9ecef;">
                <div>
                    <div style="font-weight: bold; color: #495057;">Modo de Pagamento</div>
                    <div id="status-salario" style="font-size: 0.9em; color: ${salarioAtivo ? '#28a745' : '#dc3545'}; font-weight: bold;">
                        ${salarioAtivo ? 'Salário fixo ATIVO' : 'Apenas comissões'}
                    </div>
                </div>
                <button id="toggle-salario" onclick="alternarSalario()" 
                    style="padding: 10px 15px; background: ${salarioAtivo ? '#28a745' : '#dc3545'}; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                    <i class="fas ${salarioAtivo ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    ${salarioAtivo ? 'Salário Ativo' : 'Salário Inativo'}
                </button>
            </div>

            <h4 style="margin-bottom: 20px; color: #495057; text-align: center;">
                <i class="fas fa-chart-bar"></i>
                RESUMO FINANCEIRO MENSAL
            </h4>

            <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
                <!-- Salário Fixo -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #007bff; ${!salarioAtivo ? 'opacity: 0.6;' : ''}">
                    <div>
                        <div style="font-weight: bold; color: #495057;">Salário Fixo</div>
                        <div style="font-size: 0.85em; color: #6c757d;">
                            ${salarioAtivo ? 'Valor base mensal' : 'DESATIVADO'}
                        </div>
                    </div>
                    <div style="font-weight: bold; color: #007bff; font-size: 1.1em;">
                        R$ ${totaisMensais.salarioFixo.toFixed(2)}
                    </div>
                </div>

                <!-- Comissões -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #28a745;">
                    <div>
                        <div style="font-weight: bold; color: #495057;">Comissões (30%)</div>
                        <div style="font-size: 0.85em; color: #6c757d;">Serviços realizados</div>
                    </div>
                    <div style="font-weight: bold; color: #28a745; font-size: 1.1em;">
                        R$ ${totaisMensais.totalComissaoMes.toFixed(2)}
                    </div>
                </div>

                <!-- Total a Receber -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: linear-gradient(135deg, #dc3545, #c82333); border-radius: 8px; color: white;">
                    <div>
                        <div style="font-weight: bold; font-size: 1.1em;">TOTAL A RECEBER</div>
                        <div style="font-size: 0.85em; opacity: 0.9;">
                            ${salarioAtivo ? 'Salário + Comissões' : 'Apenas Comissões'}
                        </div>
                    </div>
                    <div style="font-weight: bold; font-size: 1.3em;">
                        R$ ${totaisMensais.totalReceber.toFixed(2)}
                    </div>
                </div>
            </div>

            <!-- Status -->
            <div style="margin-top: 15px; text-align: center;">
                ${
                    totaisMensais.totalComissaoMes > 0 
                    ? `<div style="padding: 8px; background: #d4edda; border-radius: 6px; color: #155724;">
                           <i class="fas fa-check-circle"></i> Comissões ativas este mês
                       </div>`
                    : `<div style="padding: 8px; background: #fff3cd; border-radius: 6px; color: #856404;">
                           <i class="fas fa-info-circle"></i> Sem comissões este mês
                       </div>`
                }
                ${
                    !salarioAtivo 
                    ? `<div style="margin-top: 8px; padding: 8px; background: #f8d7da; border-radius: 6px; color: #721c24;">
                           <i class="fas fa-exclamation-triangle"></i> Modo apenas comissões ativo
                       </div>`
                    : ''
                }
            </div>
        </div>
    `;

    // INSERIR NO MODAL
    const modalBody = document.querySelector('#employee-modal .modal-body');

    // Remover seção anterior se existir
    const existingValores = modalBody.querySelector('.valores-mensais');
    if (existingValores) {
        existingValores.remove();
    }

    // Encontrar onde inserir
    const modalFooter = modalBody.querySelector('.modal-footer');
    if (modalFooter) {
        modalFooter.insertAdjacentHTML('beforebegin', valoresMensaisHTML);
    } else {
        modalBody.insertAdjacentHTML('beforeend', valoresMensaisHTML);
    }

    // Armazenar ID do barbeiro no modal para referência
    modal.setAttribute('data-barbeiro-id', funcionario.id);
    modal.setAttribute('data-cpf', funcionario.cpf);

    // Definir ícone do avatar
    const modalAvatar = document.getElementById('modal-avatar');
    modalAvatar.className = `fas ${getCargoIcon(funcionario.cargo)}`;

    // Mostrar modal
    modal.classList.remove('hidden');

    console.log('=== MODAL ABERTO COM TOGGLE DE SALÁRIO ===');
}

// Fechar modal
function fecharModal() {
    const modal = document.getElementById('employee-modal');
    modal.classList.add('hidden');
}

// Editar funcionário
function editarFuncionario() {
    const modal = document.getElementById('employee-modal');
    const cpf = modal.getAttribute('data-cpf');

    if (cpf) {
        window.location.href = `cadastro-barbeiro.html?cpf=${cpf}&edit=true`;
    }
}

// Filtrar funcionários
function filtrarFuncionarios() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const cargoFiltro = document.getElementById('filter-cargo').value;

    const funcionariosFiltrados = todosFuncionarios.filter(funcionario => {
        const nomeMatch = funcionario.nome?.toLowerCase().includes(searchTerm);
        const cargoMatch = !cargoFiltro || funcionario.cargo === cargoFiltro;
        return nomeMatch && cargoMatch;
    });

    renderizarFuncionarios(funcionariosFiltrados);
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== RH INICIALIZADO COM TOGGLE DE SALÁRIO ===');
    carregarFuncionarios();

    document.getElementById('search-input').addEventListener('input', filtrarFuncionarios);
    document.getElementById('filter-cargo').addEventListener('change', filtrarFuncionarios);

    document.getElementById('employee-modal').addEventListener('click', function(e) {
        if (e.target === this) fecharModal();
    });
});