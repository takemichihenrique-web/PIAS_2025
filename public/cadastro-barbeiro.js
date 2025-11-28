                                 let funcionarioEditando = null;

                                 // Função para mostrar modal com salários médios
                                 function mostrarSalariosMedios() {
                                     document.getElementById('modal-salarios').classList.remove('hidden');
                                 }

                                 // Função para fechar modal de salários
                                 function fecharModalSalarios() {
                                     document.getElementById('modal-salarios').classList.add('hidden');
                                 }

                                 // Função para buscar funcionário por CPF e preencher formulário
                                 async function buscarPorCPF() {
                                     const cpf = document.getElementById('cpf').value.replace(/\D/g, '');

                                     if (!cpf || cpf.length !== 11) {
                                         alert('Digite um CPF válido para buscar!');
                                         return;
                                     }

                                     try {
                                         const response = await fetch(`/barbeiros?cpf=${cpf}`);

                                         if (!response.ok) {
                                             throw new Error('Erro ao buscar funcionário');
                                         }

                                         const funcionarios = await response.json();

                                         if (funcionarios.length === 0) {
                                             alert('Nenhum funcionário encontrado com este CPF!');
                                             limpaBarbeiro();
                                             return;
                                         }

                                         const funcionario = funcionarios[0];
                                         funcionarioEditando = funcionario;

                                         // Preencher formulário com os dados do funcionário
                                         document.getElementById('nome').value = funcionario.nome || '';
                                         document.getElementById('email').value = funcionario.email || '';
                                         document.getElementById('telefone').value = funcionario.telefone || '';
                                         document.getElementById('cargo').value = funcionario.cargo || '';
                                         document.getElementById('salario').value = formatarSalarioInput(funcionario.salario || 0);
                                         document.getElementById('especialidade').value = funcionario.especialidade || '';
                                         document.getElementById('endereco').value = funcionario.endereco || '';

                                         // Limpar campos de senha
                                         document.getElementById('senha').value = '';
                                         document.getElementById('confirmar-senha').value = '';

                                         // Adicionar classe de edição ao formulário
                                         document.getElementById('barbeiro-form').classList.add('editing');

                                         alert('Funcionário encontrado! Preencha os campos que deseja alterar e clique em "Atualizar Funcionário".');

                                     } catch (error) {
                                         console.error('Erro ao buscar funcionário:', error);
                                         alert('Erro ao buscar funcionário: ' + error.message);
                                     }
                                 }

                                 async function cadastrarBarbeiro(event) {
                                     event.preventDefault();

                                     // Mostrar loading no botão
                                     const button = event.target;
                                     const originalText = button.innerHTML;
                                     button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
                                     button.disabled = true;

                                     try {
                                         const senha = document.getElementById("senha").value;
                                         const confirmarSenha = document.getElementById("confirmar-senha").value;

                                         // Validação da senha
                                         if (senha && senha !== confirmarSenha) {
                                             alert("As senhas não coincidem!");
                                             return;
                                         }

                                         if (senha && senha.length < 4) {
                                             alert("A senha deve ter pelo menos 4 caracteres!");
                                             return;
                                         }

                                         const barbeiro = {
                                             nome: document.getElementById("nome").value.trim(),
                                             telefone: document.getElementById("telefone").value.trim(),
                                             email: document.getElementById("email").value.trim(),
                                             cpf: document.getElementById("cpf").value.replace(/\D/g, ''),
                                             cargo: document.getElementById("cargo").value,
                                             salario: document.getElementById("salario").value,
                                             especialidade: document.getElementById("especialidade").value.trim(),
                                             endereco: document.getElementById("endereco").value.trim(),
                                             senha: senha || '1234' // Senha padrão se não for informada
                                         };

                                         console.log('Dados do funcionário:', barbeiro); // DEBUG

                                         // Validação básica
                                         if (!barbeiro.nome || !barbeiro.cpf) {
                                             alert("Nome e CPF são obrigatórios!");
                                             return;
                                         }

                                         if (barbeiro.cpf.length !== 11) {
                                             alert("CPF deve conter 11 números!");
                                             return;
                                         }

                                         // Validação do salário
                                         if (!barbeiro.salario) {
                                             alert("Salário é obrigatório!");
                                             return;
                                         }

                                         // Converter salário para número
                                         const salarioNumerico = parseFloat(barbeiro.salario.replace(/\./g, '').replace(',', '.'));
                                         if (isNaN(salarioNumerico) || salarioNumerico <= 0) {
                                             alert("Salário deve ser um número maior que zero!");
                                             return;
                                         }

                                         barbeiro.salario = salarioNumerico;

                                         const response = await fetch('/barbeiros', {
                                             method: 'POST',
                                             headers: {
                                                 'Content-Type': 'application/json'
                                             },
                                             body: JSON.stringify(barbeiro)
                                         });

                                         console.log('Resposta do servidor:', response.status); // DEBUG

                                         if (response.ok) {
                                             const result = await response.text();
                                             console.log('Resultado:', result); // DEBUG

                                             alert("Funcionário cadastrado com sucesso!");
                                             document.getElementById("barbeiro-form").reset();
                                             funcionarioEditando = null;
                                             document.getElementById('barbeiro-form').classList.remove('editing');
                                             listarBarbeiros();
                                         } else {
                                             const errorText = await response.text();
                                             console.error('Erro do servidor:', errorText); // DEBUG

                                             if (errorText.includes('UNIQUE constraint failed')) {
                                                 alert("Erro: CPF já cadastrado no sistema!");
                                             } else if (errorText.includes('CHECK constraint failed')) {
                                                 alert("Erro: Cargo inválido! Use apenas: Barbeiro, Cabeleireiro, Recepcionista, Gerente ou Outro");
                                             } else {
                                                 alert(`Erro ao cadastrar: ${errorText}`);
                                             }
                                         }
                                     } catch (err) {
                                         console.error("Erro na solicitação:", err);
                                         alert("Erro de conexão ao cadastrar funcionário. Verifique se o servidor está rodando na porta 5000.");
                                     } finally {
                                         button.innerHTML = originalText;
                                         button.disabled = false;
                                     }
                                 }

                                 // Função para listar todos os funcionários
                                 async function listarBarbeiros() {
                                     console.log('Listando funcionários...');

                                     try {
                                         const response = await fetch('/barbeiros');
                                         console.log('Resposta do servidor:', response.status);

                                         if (!response.ok) {
                                             throw new Error('Erro ao buscar funcionários: ' + response.status);
                                         }

                                         const barbeiros = await response.json();
                                         console.log('Funcionários recebidos:', barbeiros);

                                         const tabela = document.getElementById('tabela-barbeiros');

                                         if (!tabela) {
                                             console.error('Elemento tabela-barbeiros não encontrado!');
                                             return;
                                         }

                                         tabela.innerHTML = '';

                                         if (barbeiros.length === 0) {
                                             tabela.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #2c3e50;">Nenhum funcionário cadastrado.</td></tr>';
                                         } else {
                                             barbeiros.forEach(barbeiro => {
                                                 const linha = document.createElement('tr');
                                                 linha.innerHTML = `
                                                     <td>${barbeiro.id}</td>
                                                     <td>${barbeiro.nome || '-'}</td>
                                                     <td>${formatarCPF(barbeiro.cpf)}</td>
                                                     <td>${barbeiro.email || '-'}</td>
                                                     <td>${formatarTelefone(barbeiro.telefone)}</td>
                                                     <td>${barbeiro.cargo || '-'}</td>
                                                     <td>${formatarSalario(barbeiro.salario)}</td>
                                                     <td>${barbeiro.especialidade || '-'}</td>
                                                     <td>${barbeiro.endereco || '-'}</td>
                                                 `;
                                                 tabela.appendChild(linha);
                                             });
                                         }
                                     } catch (error) {
                                         console.error('Erro ao listar funcionários:', error);
                                         const tabela = document.getElementById('tabela-barbeiros');
                                         if (tabela) {
                                             tabela.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #e74c3c;">Erro ao carregar funcionários. Verifique o servidor.</td></tr>';
                                         }
                                     }
                                 }

                                 // Função para atualizar as informações do funcionário
                                 async function atualizarBarbeiro() {
                                     if (!funcionarioEditando) {
                                         alert('Primeiro busque um funcionário por CPF para editar!');
                                         return;
                                     }

                                     const nome = document.getElementById('nome').value.trim();
                                     const cpf = funcionarioEditando.cpf;
                                     const email = document.getElementById('email').value.trim();
                                     const telefone = document.getElementById('telefone').value.trim();
                                     const cargo = document.getElementById('cargo').value;
                                     const salario = document.getElementById('salario').value;
                                     const especialidade = document.getElementById('especialidade').value.trim();
                                     const endereco = document.getElementById('endereco').value.trim();
                                     const senha = document.getElementById('senha').value;
                                     const confirmarSenha = document.getElementById('confirmar-senha').value;

                                     // Validação
                                     if (!nome) {
                                         alert("Nome é obrigatório para atualização!");
                                         return;
                                     }

                                     // Validação da senha se for preenchida
                                     if (senha && senha !== confirmarSenha) {
                                         alert("As senhas não coincidem!");
                                         return;
                                     }

                                     // Validação do salário
                                     if (!salario) {
                                         alert("Salário é obrigatório!");
                                         return;
                                     }

                                     // Converter salário para número
                                     const salarioNumerico = parseFloat(salario.replace(/\./g, '').replace(',', '.'));
                                     if (isNaN(salarioNumerico) || salarioNumerico <= 0) {
                                         alert("Salário deve ser um número maior que zero!");
                                         return;
                                     }

                                     const barbeiroAtualizado = {
                                         nome,
                                         email,
                                         telefone,
                                         cargo,
                                         salario: salarioNumerico,
                                         especialidade,
                                         endereco
                                     };

                                     // Só adiciona senha se foi preenchida
                                     if (senha) {
                                         barbeiroAtualizado.senha = senha;
                                     }

                                     try {
                                         console.log('Atualizando funcionário com CPF:', cpf);
                                         console.log('Dados enviados:', barbeiroAtualizado);

                                         const response = await fetch(`/barbeiros/cpf/${cpf}`, {
                                             method: 'PUT',
                                             headers: {
                                                 'Content-Type': 'application/json'
                                             },
                                             body: JSON.stringify(barbeiroAtualizado)
                                         });

                                         console.log('Resposta da atualização:', response.status);

                                         if (response.ok) {
                                             alert('Funcionário atualizado com sucesso!');
                                             limpaBarbeiro();
                                             listarBarbeiros();
                                         } else {
                                             const errorMessage = await response.text();
                                             console.error('Erro do servidor:', errorMessage);
                                             alert('Erro ao atualizar funcionário: ' + errorMessage);
                                         }
                                     } catch (error) {
                                         console.error('Erro ao atualizar funcionário:', error);
                                         alert('Erro de conexão ao atualizar funcionário: ' + error.message);
                                     }
                                 }

                                 // Função para limpar o formulário
                                 function limpaBarbeiro() {
                                     document.getElementById('barbeiro-form').reset();
                                     funcionarioEditando = null;
                                     document.getElementById('barbeiro-form').classList.remove('editing');
                                 }

                                 // Função para formatar telefone
                                 function formatarTelefone(telefone) {
                                     if (!telefone) return '-';
                                     const numeros = telefone.replace(/\D/g, '');

                                     if (numeros.length === 11) {
                                         return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                                     }
                                     if (numeros.length === 10) {
                                         return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
                                     }

                                     return telefone;
                                 }

                                 // Função para formatar CPF
                                 function formatarCPF(cpf) {
                                     if (!cpf) return '-';
                                     cpf = cpf.replace(/\D/g, '');
                                     return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                                 }

                                 // Função para formatar salário
                                 function formatarSalario(salario) {
                                     if (!salario) return 'R$ 0,00';
                                     return new Intl.NumberFormat('pt-BR', {
                                         style: 'currency',
                                         currency: 'BRL'
                                     }).format(salario);
                                 }

                                 // Função para formatar salário para input
                                 function formatarSalarioInput(salario) {
                                     if (!salario) return '0,00';
                                     return parseFloat(salario).toFixed(2).replace('.', ',');
                                 }

                                 // Máscaras para os campos
                                 document.addEventListener('DOMContentLoaded', function() {
                                     console.log('Página carregada, inicializando...');

                                     // Máscara para CPF
                                     const cpfInput = document.getElementById('cpf');
                                     if (cpfInput) {
                                         cpfInput.addEventListener('input', function(e) {
                                             let value = this.value.replace(/\D/g, '');
                                             if (value.length <= 11) {
                                                 value = value.replace(/(\d{3})(\d)/, '$1.$2');
                                                 value = value.replace(/(\d{3})(\d)/, '$1.$2');
                                                 value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                                             }
                                             this.value = value;
                                         });
                                     }

                                     // Máscara para telefone
                                     const telefoneInput = document.getElementById('telefone');
                                     if (telefoneInput) {
                                         telefoneInput.addEventListener('input', function(e) {
                                             let value = this.value.replace(/\D/g, '');

                                             if (value.length <= 11) {
                                                 if (value.length <= 2) {
                                                     value = value.replace(/(\d{0,2})/, '($1');
                                                 } else if (value.length <= 6) {
                                                     value = value.replace(/(\d{2})(\d{0,4})/, '($1) $2');
                                                 } else if (value.length <= 10) {
                                                     value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
                                                 } else {
                                                     value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
                                                 }
                                             }

                                             this.value = value;
                                         });
                                     }

                                     // Máscara para salário
                                     const salarioInput = document.getElementById('salario');
                                     if (salarioInput) {
                                         salarioInput.addEventListener('input', function(e) {
                                             let value = this.value.replace(/\D/g, '');
                                             value = (value / 100).toFixed(2);
                                             value = value.replace('.', ',');
                                             value = value.replace(/(\d)(\d{3})(\d{3}),/g, "$1.$2.$3,");
                                             value = value.replace(/(\d)(\d{3}),/g, "$1.$2,");
                                             this.value = value;
                                         });
                                     }

                                     // Fechar modal ao clicar fora
                                     const modalSalarios = document.getElementById('modal-salarios');
                                     if (modalSalarios) {
                                         modalSalarios.addEventListener('click', function(e) {
                                             if (e.target === this) {
                                                 fecharModalSalarios();
                                             }
                                         });
                                     }

                                     // Carregar dados iniciais
                                     console.log('Carregando dados iniciais...');
                                     listarBarbeiros();
                                 });

                                 // Função para testar conexão com o servidor
                                 async function testarConexao() {
                                     try {
                                         const response = await fetch('/barbeiros');
                                         if (!response.ok) {
                                             console.warn('Servidor respondendo com status:', response.status);
                                             alert('⚠️ Servidor está com problemas. Status: ' + response.status);
                                         } else {
                                             console.log('Conexão com servidor OK');
                                         }
                                     } catch (error) {
                                         console.error('Não foi possível conectar ao servidor:', error);
                                         alert('⚠️ Não foi possível conectar ao servidor. Verifique se o servidor está rodando na porta 5000.');
                                     }
                                 }