// Simulação de banco de dados usando localStorage E sincronização com SQLite
class ServicoService {
    constructor() {
        this.chaveStorage = 'servicos_barbearia';
        this.chaveSequencia = 'servico_sequencia';
        this.inicializarStorage();
    }

    inicializarStorage() {
        if (!localStorage.getItem(this.chaveStorage)) {
            localStorage.setItem(this.chaveStorage, JSON.stringify([]));
            localStorage.setItem(this.chaveSequencia, '1');
        }
    }

    // Gerar ID sequencial
    gerarId() {
        let sequencia = parseInt(localStorage.getItem(this.chaveSequencia) || '1');
        localStorage.setItem(this.chaveSequencia, (sequencia + 1).toString());
        return sequencia;
    }

    // Buscar todos os serviços
    async buscarTodos() {
        try {
            const servicos = JSON.parse(localStorage.getItem(this.chaveStorage)) || [];
            return servicos;
        } catch (error) {
            console.error('Erro ao buscar serviços:', error);
            return [];
        }
    }

    // Buscar serviço por nome
    async buscarPorNome(nome) {
        try {
            const servicos = await this.buscarTodos();
            if (!nome) return servicos;

            return servicos.filter(servico => 
                servico.nome.toLowerCase().includes(nome.toLowerCase())
            );
        } catch (error) {
            console.error('Erro ao buscar serviço por nome:', error);
            return [];
        }
    }

    // Verificar se nome já existe
    async nomeExiste(nome, idIgnorar = null) {
        try {
            const servicos = await this.buscarTodos();
            return servicos.some(servico => 
                servico.nome.toLowerCase() === nome.toLowerCase() && 
                servico.id !== idIgnorar
            );
        } catch (error) {
            console.error('Erro ao verificar nome:', error);
            return false;
        }
    }

    // Cadastrar novo serviço (SINCRONIZADO com SQLite)
    async cadastrar(servico) {
        try {
            // Verificar se nome já existe no localStorage
            const nomeExiste = await this.nomeExiste(servico.nome);
            if (nomeExiste) {
                throw new Error('Já existe um serviço com este nome!');
            }

            const servicos = await this.buscarTodos();
            const novoServico = {
                id: this.gerarId(),
                nome: servico.nome,
                preco: servico.preco,
                duracao: servico.duracao,
                descricao: servico.descricao,
                dataCriacao: new Date().toISOString()
            };

            servicos.push(novoServico);
            localStorage.setItem(this.chaveStorage, JSON.stringify(servicos));

            // SINCRONIZAR COM SQLITE
            try {
                const response = await fetch('/servicos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        nome: servico.nome,
                        preco: servico.preco.toString(),
                        duracao: servico.duracao + ' minutos',
                        descricao: servico.descricao
                    })
                });

                if (!response.ok) {
                    console.warn('Serviço salvo no localStorage, mas falha ao sincronizar com SQLite');
                } else {
                    console.log('Serviço sincronizado com SQLite');
                }
            } catch (syncError) {
                console.warn('Erro na sincronização com SQLite:', syncError);
            }

            return novoServico;
        } catch (error) {
            console.error('Erro ao cadastrar serviço:', error);
            throw error;
        }
    }

    // Atualizar serviço (SINCRONIZADO com SQLite)
    async atualizar(nome, servicoAtualizado) {
        try {
            const servicos = await this.buscarTodos();
            const index = servicos.findIndex(s => s.nome === nome);

            if (index === -1) {
                throw new Error('Serviço não encontrado');
            }

            // Verificar se novo nome já existe (ignorando o próprio serviço)
            const nomeExiste = await this.nomeExiste(servicoAtualizado.nome, servicos[index].id);
            if (nomeExiste) {
                throw new Error('Já existe outro serviço com este nome!');
            }

            servicos[index] = {
                ...servicos[index],
                ...servicoAtualizado,
                dataAtualizacao: new Date().toISOString()
            };

            localStorage.setItem(this.chaveStorage, JSON.stringify(servicos));

            // SINCRONIZAR COM SQLITE
            try {
                const response = await fetch(`/servicos/nome/${encodeURIComponent(nome)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        nome: servicoAtualizado.nome,
                        preco: servicoAtualizado.preco.toString(),
                        duracao: servicoAtualizado.duracao + ' minutos',
                        descricao: servicoAtualizado.descricao
                    })
                });

                if (!response.ok) {
                    console.warn('Serviço atualizado no localStorage, mas falha ao sincronizar com SQLite');
                } else {
                    console.log('Serviço atualizado no SQLite');
                }
            } catch (syncError) {
                console.warn('Erro na sincronização com SQLite:', syncError);
            }

            return servicos[index];
        } catch (error) {
            console.error('Erro ao atualizar serviço:', error);
            throw error;
        }
    }
}

// Instância do serviço
const servicoService = new ServicoService();

// Função para formatar o valor monetário durante a digitação
function formatarPrecoInput(valor) {
    // Remove tudo que não é dígito
    valor = valor.replace(/\D/g, '');

    // Se estiver vazio, retorna vazio
    if (valor === '') return '';

    // Converte para número e formata
    const numero = parseInt(valor) / 100;
    return numero.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Função para formatar número para exibição (R$ 25,00)
function formatarNumeroParaPreco(numero) {
    return numero.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Função para converter o valor formatado para número
function converterPrecoParaNumero(precoFormatado) {
    if (!precoFormatado) return 0;

    // Remove R$, pontos e troca vírgula por ponto
    const valorLimpo = precoFormatado
        .toString()
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();

    return parseFloat(valorLimpo) || 0;
}

// Função para validar o preço
function validarPreco(preco) {
    if (!preco) return false;

    const valorNumerico = converterPrecoParaNumero(preco);
    return !isNaN(valorNumerico) && valorNumerico > 0;
}

// Função para validar a duração
function validarDuracao(duracao) {
    const duracaoNum = parseInt(duracao);
    return !isNaN(duracaoNum) && duracaoNum > 0 && duracaoNum <= 480;
}

// Função para validar todos os campos do formulário
function validarFormulario() {
    const nome = document.getElementById("nome").value.trim();
    const preco = document.getElementById("preco").value;
    const duracao = document.getElementById("duracao").value;

    if (!nome) {
        alert("Nome do serviço é obrigatório!");
        document.getElementById("nome").focus();
        return false;
    }

    if (!preco || !validarPreco(preco)) {
        alert("Preço deve ser um valor válido maior que zero!");
        document.getElementById("preco").focus();
        return false;
    }

    if (!duracao || !validarDuracao(duracao)) {
        alert("Duração deve ser entre 1 e 480 minutos!");
        document.getElementById("duracao").focus();
        return false;
    }

    return true;
}

// Event listeners para formatação em tempo real
document.addEventListener('DOMContentLoaded', function() {
    const precoInput = document.getElementById('preco');

    // Formata o preço enquanto o usuário digita
    precoInput.addEventListener('input', function(e) {
        let valor = e.target.value;

        // Permite backspace e delete
        if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward') {
            return;
        }

        // Formata o valor
        e.target.value = formatarPrecoInput(valor);
    });

    // Adiciona "R$ " automaticamente quando o campo ganha foco se estiver vazio
    precoInput.addEventListener('focus', function(e) {
        if (!e.target.value) {
            e.target.value = '0,00';
        }
    });

    // Carrega a lista de serviços ao iniciar
    listarServicos();
});

// Função para cadastrar serviço - CORRIGIDA
async function cadastrarServico(event) {
    event.preventDefault();

    // Valida o formulário antes de prosseguir
    if (!validarFormulario()) {
        return;
    }

    const nome = document.getElementById("nome").value.trim();
    const precoFormatado = document.getElementById("preco").value;
    const duracao = parseInt(document.getElementById("duracao").value);
    const descricao = document.getElementById("descricao").value.trim();

    // Converte o preço formatado para número
    const preco = converterPrecoParaNumero(precoFormatado);

    const servico = {
        nome: nome,
        preco: preco,
        duracao: duracao,
        descricao: descricao
    };

    try {
        // Usa o serviço local em vez de fetch
        const novoServico = await servicoService.cadastrar(servico);

        alert("Serviço cadastrado com sucesso!");
        document.getElementById("servico-form").reset();
        listarServicos(); // Atualiza a lista após cadastro

    } catch (err) {
        console.error("Erro ao cadastrar serviço:", err);
        alert("Erro ao cadastrar Serviço: " + err.message);
    }
}

// Função para listar todos os serviços ou buscar serviços por nome
async function listarServicos() {
    const nome = document.getElementById('nome').value.trim();

    try {
        // Usa o serviço local em vez de fetch
        const servicos = await servicoService.buscarPorNome(nome);
        const tabela = document.getElementById('tabela-servicos');
        tabela.innerHTML = '';

        if (servicos.length === 0) {
            tabela.innerHTML = '<tr><td colspan="5">Nenhum serviço encontrado.</td></tr>';
        } else {
            servicos.forEach(servico => {
                const linha = document.createElement('tr');
                // Formata o preço para exibição
                const precoFormatado = servico.preco ? formatarNumeroParaPreco(servico.preco) : '0,00';
                linha.innerHTML = `
                    <td>${servico.id || '-'}</td>
                    <td>${servico.nome || '-'}</td>
                    <td>R$ ${precoFormatado}</td>
                    <td>${servico.duracao || '-'} min</td>
                    <td>${servico.descricao || '-'}</td>
                `;
                tabela.appendChild(linha);
            });
        }
    } catch (error) {
        console.error('Erro ao listar serviços:', error);
        alert('Erro ao carregar serviços.');
    }
}

// Função para atualizar as informações do serviço - CORRIGIDA
async function atualizarServico() {
    // Valida o formulário antes de prosseguir
    if (!validarFormulario()) {
        return;
    }

    const nomeOriginal = document.getElementById('nome').value.trim();
    const precoFormatado = document.getElementById('preco').value;
    const duracao = parseInt(document.getElementById('duracao').value);
    const descricao = document.getElementById('descricao').value.trim();

    // Converte o preço formatado para número
    const preco = converterPrecoParaNumero(precoFormatado);

    const servicoAtualizado = {
        nome: nomeOriginal,
        preco: preco,
        duracao: duracao,
        descricao: descricao
    };

    try {
        // Usa o serviço local em vez de fetch
        await servicoService.atualizar(nomeOriginal, servicoAtualizado);

        alert('Serviço atualizado com sucesso!');
        listarServicos(); // Atualiza a lista após a atualização

    } catch (error) {
        console.error('Erro ao atualizar serviço:', error);
        alert('Erro ao atualizar serviço: ' + error.message);
    }
}

// Função para limpar formulário - CORRIGIDA
async function limparServico() {
    document.getElementById('nome').value = '';
    document.getElementById('preco').value = '';
    document.getElementById('duracao').value = '';
    document.getElementById('descricao').value = '';
    listarServicos(); // Atualiza a lista para mostrar todos os serviços
}

// Função para popular formulário ao clicar na tabela - CORRIGIDA
document.addEventListener('DOMContentLoaded', function() {
    const tabela = document.getElementById('tabela-servicos');

    tabela.addEventListener('click', function(e) {
        const linha = e.target.closest('tr');
        if (linha && linha.rowIndex > 0) { // Ignora o cabeçalho
            const celulas = linha.getElementsByTagName('td');

            if (celulas.length >= 5) {
                document.getElementById('nome').value = celulas[1].textContent || '';

                // Remove "R$ " do preço e formata corretamente
                const precoTexto = celulas[2].textContent.replace('R$ ', '') || '0,00';
                document.getElementById('preco').value = precoTexto;

                // Remove " min" da duração
                const duracao = celulas[3].textContent.replace(' min', '') || '30';
                document.getElementById('duracao').value = duracao;

                document.getElementById('descricao').value = celulas[4].textContent || '';
            }
        }
    });
});

// Função para limpar dados de teste (útil para desenvolvimento)
function limparDadosTeste() {
    if (confirm('Tem certeza que deseja limpar todos os dados de serviços?')) {
        localStorage.removeItem('servicos_barbearia');
        localStorage.removeItem('servico_sequencia');
        servicoService.inicializarStorage();
        listarServicos();
        alert('Dados limpos com sucesso!');
    }
}

// Adicionar event listeners para os botões - CORRIGIDO
document.addEventListener('DOMContentLoaded', function() {
    // Botão Cadastrar
    const btnCadastrar = document.querySelector('button[onclick="cadastrarServico(event)"]');
    if (btnCadastrar) {
        btnCadastrar.addEventListener('click', cadastrarServico);
    }

    // Botão Atualizar
    const btnAtualizar = document.querySelector('button[onclick="atualizarServico()"]');
    if (btnAtualizar) {
        btnAtualizar.addEventListener('click', atualizarServico);
    }

    // Botão Limpar
    const btnLimpar = document.querySelector('button[onclick="limparServico()"]');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', limparServico);
    }

    // Botão Listar (já funciona com o input)
    const inputNome = document.getElementById('nome');
    if (inputNome) {
        inputNome.addEventListener('input', listarServicos);
    }
});