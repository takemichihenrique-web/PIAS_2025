// Funções de formatação
function formatarCPF(campo) {
    let cpf = campo.value.replace(/\D/g, '');

    if (cpf.length > 11) {
        cpf = cpf.substring(0, 11);
    }

    if (cpf.length <= 11) {
        cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
        cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
        cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    campo.value = cpf;
    return cpf;
}

function formatarTelefone(campo) {
    let telefone = campo.value.replace(/\D/g, '');

    if (telefone.length > 11) {
        telefone = telefone.substring(0, 11);
    }

    if (telefone.length === 11) {
        telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
        telefone = telefone.replace(/(\d{5})(\d)/, '$1-$2');
    } else if (telefone.length === 10) {
        telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
        telefone = telefone.replace(/(\d{4})(\d)/, '$1-$2');
    }

    campo.value = telefone;
    return telefone;
}

function formatarCPFExibicao(cpf) {
    if (!cpf) return '-';
    cpf = cpf.replace(/\D/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Função para buscar cliente por CPF
async function buscarClientePorCPF() {
    console.log('Função buscarClientePorCPF chamada');

    const cpfInput = document.getElementById('cpf');
    let cpf = cpfInput.value.replace(/\D/g, ''); // Remove formatação

    console.log('CPF buscado:', cpf);

    if (cpf.length !== 11) {
        alert('Por favor, digite um CPF válido com 11 dígitos.');
        return;
    }

    try {
        const response = await fetch(`/clientes?cpf=${cpf}`);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const clientes = await response.json();
        console.log('Clientes encontrados:', clientes);

        if (clientes && clientes.length > 0) {
            const cliente = clientes[0];
            // Preenche os campos com os dados do cliente
            document.getElementById('nome').value = cliente.nome || '';
            document.getElementById('email').value = cliente.email || '';
            document.getElementById('telefone').value = cliente.telefone || '';
            document.getElementById('endereco').value = cliente.endereco || '';

            alert('Cliente encontrado! Preencha os campos que deseja atualizar.');
        } else {
            alert('Cliente não encontrado. Você pode cadastrar um novo cliente.');
            // Limpa os campos exceto o CPF
            document.getElementById('nome').value = '';
            document.getElementById('email').value = '';
            document.getElementById('telefone').value = '';
            document.getElementById('endereco').value = '';
        }
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        alert('Erro ao buscar cliente. Tente novamente. Verifique o console para detalhes.');
    }
}

// Função para cadastrar cliente
async function cadastrarCliente(event) {
    console.log('Função cadastrarCliente chamada');

    if (event) event.preventDefault();

    const cpf = document.getElementById("cpf").value.replace(/\D/g, '');
    const cliente = {
        nome: document.getElementById("nome").value,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("email").value,
        cpf: cpf,
        endereco: document.getElementById("endereco").value
    };

    console.log('Dados do cliente para cadastro:', cliente);

    // Validações
    if (!cliente.nome || !cliente.cpf) {
        alert("Nome e CPF são obrigatórios!");
        return;
    }

    if (cliente.cpf.length !== 11) {
        alert("CPF deve conter 11 dígitos!");
        return;
    }

    try {
        const response = await fetch('/clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cliente)
        });

        const result = await response.json();
        console.log('Resposta do cadastro:', result);

        if (response.ok) {
            alert("Cliente cadastrado com sucesso!");
            document.getElementById("cliente-form").reset();
            listarClientes(); // Atualiza a lista
        } else {
            alert(`Erro: ${result.message}`);
        }
    } catch (err) {
        console.error("Erro na solicitação:", err);
        alert("Erro ao cadastrar cliente. Verifique o console para detalhes.");
    }
}

// Função para listar clientes
async function listarClientes() {
    console.log('Função listarClientes chamada');

    const cpf = document.getElementById('cpf').value.replace(/\D/g, '');  // Pega o valor do CPF sem formatação

    let url = '/clientes';  // URL padrão para todos os clientes

    if (cpf) {
        // Se CPF foi digitado, adiciona o parâmetro de consulta
        url += `?cpf=${cpf}`;
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const clientes = await response.json();
        console.log('Clientes para listar:', clientes);

        const tabela = document.getElementById('tabela-clientes');
        tabela.innerHTML = ''; // Limpa a tabela antes de preencher

        if (!clientes || clientes.length === 0) {
            // Caso não encontre clientes, exibe uma mensagem
            tabela.innerHTML = '<tr><td colspan="6">Nenhum cliente encontrado.</td></tr>';
        } else {
            clientes.forEach(cliente => {
                const linha = document.createElement('tr');
                linha.innerHTML = `
                    <td>${cliente.id}</td>
                    <td>${cliente.nome}</td>
                    <td>${formatarCPFExibicao(cliente.cpf)}</td>
                    <td>${cliente.email || '-'}</td>
                    <td>${cliente.telefone || '-'}</td>
                    <td>${cliente.endereco || '-'}</td>
                `;
                tabela.appendChild(linha);
            });
        }
    } catch (error) {
        console.error('Erro ao listar clientes:', error);
        alert('Erro ao carregar lista de clientes. Verifique o console para detalhes.');
    }
}

// Função para atualizar cliente - CORRIGIDA
async function atualizarCliente() {
    console.log('Função atualizarCliente chamada');

    const cpfInput = document.getElementById('cpf').value.replace(/\D/g, '');

    console.log('CPF para atualizar:', cpfInput);

    if (!cpfInput || cpfInput.length !== 11) {
        alert("Por favor, digite um CPF válido com 11 dígitos!");
        return;
    }

    const clienteAtualizado = {
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value
    };

    console.log('Dados para atualizar:', clienteAtualizado);

    if (!clienteAtualizado.nome) {
        alert("Nome é obrigatório!");
        return;
    }

    try {
        console.log(`Enviando requisição para: /clientes/cpf/${cpfInput}`);

        const response = await fetch(`/clientes/cpf/${cpfInput}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clienteAtualizado)
        });

        console.log('Status da resposta:', response.status);

        let result;
        try {
            result = await response.json();
            console.log('Resposta da atualização:', result);
        } catch (parseError) {
            console.error('Erro ao fazer parse da resposta:', parseError);
            throw new Error('Resposta do servidor inválida');
        }

        if (response.ok) {
            alert('Cliente atualizado com sucesso!');
            document.getElementById("cliente-form").reset();
            listarClientes(); // Atualiza a lista
        } else {
            alert(`Erro ao atualizar cliente: ${result.message || 'Erro desconhecido'}`);
        }
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        alert('Erro ao atualizar cliente. Verifique o console para detalhes.');
    }
}

// Função para limpar formulário
function limparFormulario() {
    console.log('Função limparFormulario chamada');
    document.getElementById('cliente-form').reset();
}

// Carrega a lista de clientes quando a página é carregada
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página carregada, inicializando...');
    listarClientes();

    // Adiciona event listeners para os botões
    document.querySelector('.btn-cadastrar').addEventListener('click', cadastrarCliente);
    document.querySelector('.btn-atualizar').addEventListener('click', atualizarCliente);
    document.querySelector('.btn-limpar').addEventListener('click', limparFormulario);
    document.querySelector('.btn-listar').addEventListener('click', listarClientes);
    document.querySelector('.search-btn').addEventListener('click', buscarClientePorCPF);

    console.log('Event listeners configurados');
});