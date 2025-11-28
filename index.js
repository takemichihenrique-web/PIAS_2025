const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = process.env.PORT || 5000;

// Serve os arquivos estáticos da pasta "public"
const path = require("path");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));

// Configura o body-parser para ler JSON
app.use(bodyParser.json());

// Conexão com o banco de dados SQLite
const dbPath = path.join(__dirname, "database.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Erro ao conectar ao banco de dados:", err.message);
    } else {
        console.log("Conectado ao banco de dados SQLite.");
    }
});

// Criação das tabelas
db.serialize(() => {
    // Tabela de barbeiros
    db.run(`
        CREATE TABLE IF NOT EXISTS barbeiros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT NOT NULL UNIQUE,
            email TEXT,
            telefone TEXT,
            salario REAL DEFAULT 0,
            especialidade TEXT,
            endereco TEXT,
            senha TEXT,
            cargo TEXT NOT NULL CHECK (cargo IN ('Barbeiro', 'Cabeleireiro', 'Recepcionista', 'Gerente', 'Outro')) DEFAULT 'Barbeiro'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT NOT NULL UNIQUE,
            email TEXT,
            telefone TEXT,
            endereco TEXT
        )
    `);

    // Serviços com comissão fixa
    db.run(`
        CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            preco TEXT NOT NULL,
            duracao TEXT,
            descricao TEXT,
            comissao_percentual REAL DEFAULT 50
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data DATE NOT NULL,
            horario TIME NOT NULL,
            cpf_cliente VARCHAR(11) NOT NULL,
            id_barbeiro INTEGER NOT NULL,
            id_servico INTEGER NOT NULL,
            FOREIGN KEY (cpf_cliente) REFERENCES clientes (cpf),
            FOREIGN KEY (id_barbeiro) REFERENCES barbeiros (id),
            FOREIGN KEY (id_servico) REFERENCES servicos (id)
        )
    `);

    // Tabela para armazenar comissões
    db.run(`
        CREATE TABLE IF NOT EXISTS pagamentos_comissoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agendamento_id INTEGER NOT NULL UNIQUE,
            data DATE NOT NULL,
            cpf_cliente VARCHAR(11) NOT NULL,
            id_barbeiro INTEGER NOT NULL,
            id_servico INTEGER NOT NULL,
            servico_nome TEXT NOT NULL,
            servico_preco REAL NOT NULL,
            desconto REAL DEFAULT 0,
            valor_final REAL NOT NULL,
            comissao_percentual REAL NOT NULL,
            valor_comissao REAL NOT NULL,
            data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agendamento_id) REFERENCES agendamentos (id),
            FOREIGN KEY (id_barbeiro) REFERENCES barbeiros (id),
            FOREIGN KEY (id_servico) REFERENCES servicos (id)
        )
    `);

    // Inserir usuário admin padrão
    db.get("SELECT COUNT(*) as count FROM barbeiros WHERE cargo = 'Gerente'", (err, row) => {
        if (err) {
            console.error("Erro ao verificar barbeiros:", err);
            return;
        }

        if (row.count === 0) {
            db.run(`
                INSERT INTO barbeiros (nome, cpf, email, telefone, cargo, senha, salario) 
                VALUES ('Administrador do Sistema', '12345678900', 'admin@sistema.com', '(00) 00000-0000', 'Gerente', 'admin123', 5000.00)
            `, function(err) {
                if (err) {
                    console.error("Erro ao inserir admin padrão:", err);
                } else {
                    console.log("Usuário admin padrão criado: CPF 12345678900, Senha: admin123, Salário: R$ 5000,00");
                }
            });
        }
    });

    console.log("Tabelas criadas com sucesso.");
});

// ========== ROTAS DE AUTENTICAÇÃO ==========
app.post("/login-barbeiro", (req, res) => {
    const { nome, senha } = req.body;
    if (!nome || !senha) {
        return res.status(400).json({ success: false, message: "Nome e senha são obrigatórios." });
    }

    const query = `SELECT * FROM barbeiros WHERE nome LIKE ? AND senha = ?`;
    db.get(query, [`%${nome}%`, senha], (err, barbeiro) => {
        if (err) {
            console.error("Erro ao buscar barbeiro:", err);
            return res.status(500).json({ success: false, message: "Erro interno do servidor." });
        }

        if (barbeiro) {
            return res.json({
                success: true,
                user: {
                    id: barbeiro.id,
                    nome: barbeiro.nome,
                    cpf: barbeiro.cpf,
                    cargo: barbeiro.cargo,
                    email: barbeiro.email,
                    telefone: barbeiro.telefone,
                    salario: barbeiro.salario,
                    especialidade: barbeiro.especialidade,
                    endereco: barbeiro.endereco
                }
            });
        }

        res.status(401).json({ success: false, message: "Nome ou senha incorretos." });
    });
});

// ========== ROTAS DE BARBEIROS ==========
app.post("/barbeiros", (req, res) => {
    console.log("Recebendo dados para cadastrar barbeiro:", req.body);
    const { nome, cpf, email, telefone, salario, especialidade, endereco, cargo, senha } = req.body;

    if (!nome || !cpf) {
        return res.status(400).json({ success: false, message: "Nome e CPF são obrigatórios." });
    }

    const query = `INSERT INTO barbeiros (nome, cpf, email, telefone, salario, especialidade, endereco, cargo, senha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [nome, cpf, email || null, telefone || null, salario || 0, especialidade || null, endereco || null, cargo || 'Barbeiro', senha || '123456'], function(err) {
        if (err) {
            console.error("Erro ao cadastrar barbeiro:", err);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ success: false, message: "CPF já cadastrado no sistema." });
            }
            return res.status(500).json({ success: false, message: "Erro ao cadastrar barbeiro." });
        }
        res.status(201).json({ success: true, id: this.lastID, message: "Barbeiro cadastrado com sucesso." });
    });
});

app.put("/barbeiros/cpf/:cpf", (req, res) => {
    const cpf = req.params.cpf;
    const { nome, email, telefone, salario, especialidade, endereco, cargo, senha } = req.body;

    if (!nome) {
        return res.status(400).json({ success: false, message: "Nome é obrigatório." });
    }

    let query = `UPDATE barbeiros SET nome = ?, email = ?, telefone = ?, salario = ?, especialidade = ?, endereco = ?, cargo = ?`;
    let params = [nome, email || null, telefone || null, salario || 0, especialidade || null, endereco || null, cargo || 'Barbeiro'];

    if (senha && senha.trim() !== '') {
        query += `, senha = ?`;
        params.push(senha);
    }

    query += ` WHERE cpf = ?`;
    params.push(cpf);

    db.run(query, params, function(err) {
        if (err) {
            console.error("Erro ao atualizar barbeiro:", err);
            return res.status(500).json({ success: false, message: "Erro ao atualizar barbeiro." });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: "Barbeiro não encontrado." });
        }

        res.json({ success: true, message: "Barbeiro atualizado com sucesso." });
    });
});

app.get("/barbeiros", (req, res) => {
    const cpf = req.query.cpf || "";
    let query = `SELECT * FROM barbeiros`;

    if (cpf) {
        query += ` WHERE cpf LIKE ? ORDER BY id DESC`;
        db.all(query, [`%${cpf}%`], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar barbeiros." });
            }
            res.json(rows);
        });
    } else {
        query += ` ORDER BY id DESC`;
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar barbeiros." });
            }
            res.json(rows);
        });
    }
});

app.get("/buscar-barbeiros", (req, res) => {
    const query = `SELECT id, nome, cargo FROM barbeiros WHERE cargo IN ('Barbeiro', 'Cabeleireiro') ORDER BY nome`;
    db.all(query, (err, rows) => {
        if (err) {
            console.error("❌ Erro ao buscar barbeiros:", err);
            return res.status(500).json({ message: "Erro ao buscar barbeiros." });
        }
        res.json(rows);
    });
});

// ========== ROTAS DE SERVIÇOS ==========
app.get("/servicos", (req, res) => {
    const nome = req.query.nome || "";
    let query = `SELECT * FROM servicos`;

    if (nome) {
        query += ` WHERE nome LIKE ? ORDER BY id DESC`;
        db.all(query, [`%${nome}%`], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar serviços." });
            }
            res.json(rows);
        });
    } else {
        query += ` ORDER BY id DESC`;
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar serviços." });
            }
            res.json(rows);
        });
    }
});

app.put("/servicos/nome/:nome", (req, res) => {
    const nomeOriginal = req.params.nome;
    const { nome, preco, duracao, descricao, comissao_percentual } = req.body;

    if (!nome || !preco) {
        return res.status(400).json({ success: false, message: "Nome e preço são obrigatórios." });
    }

    const query = `UPDATE servicos SET nome = ?, preco = ?, duracao = ?, descricao = ?, comissao_percentual = ? WHERE nome = ?`;
    db.run(query, [nome, preco, duracao || null, descricao || null, comissao_percentual || 50, nomeOriginal], function(err) {
        if (err) {
            console.error("Erro ao atualizar serviço:", err);
            return res.status(500).json({ success: false, message: "Erro ao atualizar serviço." });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: "Serviço não encontrado." });
        }

        res.json({ success: true, message: "Serviço atualizado com sucesso." });
    });
});

app.get("/buscar-servicos", (req, res) => {
    const query = `SELECT id, nome, preco, comissao_percentual FROM servicos ORDER BY nome`;
    db.all(query, (err, rows) => {
        if (err) {
            console.error("❌ Erro ao buscar serviços:", err);
            return res.status(500).json({ message: "Erro ao buscar serviços." });
        }
        res.json(rows);
    });
});

app.post("/servicos", (req, res) => {
    console.log("Recebendo dados para cadastrar serviço:", req.body);
    const { nome, preco, duracao, descricao, comissao_percentual } = req.body;

    if (!nome || !preco) {
        return res.status(400).json({ success: false, message: "Nome e preço são obrigatórios." });
    }

    const query = `INSERT INTO servicos (nome, preco, duracao, descricao, comissao_percentual) VALUES (?, ?, ?, ?, ?)`;
    db.run(query, [nome, preco, duracao || null, descricao || null, comissao_percentual || 50], function(err) {
        if (err) {
            console.error("Erro ao cadastrar serviço:", err);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ success: false, message: "Serviço já cadastrado no sistema." });
            }
            return res.status(500).json({ success: false, message: "Erro ao cadastrar serviço." });
        }
        res.status(201).json({ success: true, id: this.lastID, message: "Serviço cadastrado com sucesso." });
    });
});

// ========== ROTAS DE CLIENTES ==========
app.get("/clientes", (req, res) => {
    const cpf = req.query.cpf || "";
    let query = `SELECT * FROM clientes`;

    if (cpf) {
        query += ` WHERE cpf LIKE ? ORDER BY nome`;
        db.all(query, [`%${cpf}%`], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar clientes." });
            }
            res.json(rows);
        });
    } else {
        query += ` ORDER BY nome`;
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar clientes." });
            }
            res.json(rows);
        });
    }
});

app.post("/clientes", (req, res) => {
    const { nome, cpf, email, telefone, endereco } = req.body;

    if (!nome || !cpf) {
        return res.status(400).json({ success: false, message: "Nome e CPF são obrigatórios." });
    }

    const query = `INSERT INTO clientes (nome, cpf, email, telefone, endereco) VALUES (?, ?, ?, ?, ?)`;
    db.run(query, [nome, cpf, email || null, telefone || null, endereco || null], function(err) {
        if (err) {
            console.error("Erro ao cadastrar cliente:", err);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ success: false, message: "CPF já cadastrado no sistema." });
            }
            return res.status(500).json({ success: false, message: "Erro ao cadastrar cliente." });
        }
        res.status(201).json({ success: true, id: this.lastID, message: "Cliente cadastrado com sucesso." });
    });
});

app.put("/clientes/cpf/:cpf", (req, res) => {
    const cpf = req.params.cpf;
    const { nome, email, telefone, endereco } = req.body;

    if (!nome) {
        return res.status(400).json({ success: false, message: "Nome é obrigatório." });
    }

    const query = `UPDATE clientes SET nome = ?, email = ?, telefone = ?, endereco = ? WHERE cpf = ?`;
    db.run(query, [nome, email || null, telefone || null, endereco || null, cpf], function(err) {
        if (err) {
            console.error("Erro ao atualizar cliente:", err);
            return res.status(500).json({ success: false, message: "Erro ao atualizar cliente." });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: "Cliente não encontrado." });
        }

        res.json({ success: true, message: "Cliente atualizado com sucesso." });
    });
});

// ========== ROTAS DE AGENDAMENTOS ==========
app.get("/horarios-disponiveis", (req, res) => {
    const { data, id } = req.query;

    if (!data || !id) {
        return res.status(400).json({ message: "Data e ID do serviço são obrigatórios." });
    }

    const query = `SELECT horario FROM agendamentos WHERE data = ? AND id_servico = ?`;
    db.all(query, [data, id], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Erro ao buscar horários." });
        }

        const horariosOcupados = rows.map(row => row.horario);
        const todosHorarios = [];

        for (let hora = 8; hora <= 18; hora++) {
            for (let minuto = 0; minuto < 60; minuto += 30) {
                const horario = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
                if (!horariosOcupados.includes(horario)) {
                    todosHorarios.push(horario);
                }
            }
        }

        res.json(todosHorarios);
    });
});

app.post("/cadastrar-agendamento", (req, res) => {
    const { data, horario, cpf_cliente, id_barbeiro, id_servico } = req.body;

    if (!data || !horario || !cpf_cliente || !id_barbeiro || !id_servico) {
        return res.status(400).json({ success: false, message: "Todos os campos são obrigatórios." });
    }

    const verificaBarbeiroQuery = `SELECT cargo FROM barbeiros WHERE id = ? AND cargo IN ('Barbeiro', 'Cabeleireiro')`;
    db.get(verificaBarbeiroQuery, [id_barbeiro], (err, barbeiro) => {
        if (err) {
            console.error("Erro ao verificar barbeiro:", err);
            return res.status(500).json({ success: false, message: "Erro interno do servidor." });
        }

        if (!barbeiro) {
            return res.status(400).json({ success: false, message: "Barbeiro selecionado não está autorizado a realizar serviços." });
        }

        const verificaHorarioQuery = `SELECT * FROM agendamentos WHERE data = ? AND horario = ? AND id_barbeiro = ?`;
    db.get(verificaHorarioQuery, [data, horario, id_barbeiro], (err, agendamentoExistente) => {
        if (err) {
            console.error("Erro ao verificar horário:", err);
            return res.status(500).json({ success: false, message: "Erro interno do servidor." });
        }

        if (agendamentoExistente) {
            return res.status(400).json({ success: false, message: "Já existe um agendamento para este barbeiro no horário selecionado." });
        }

        const query = `INSERT INTO agendamentos (data, horario, cpf_cliente, id_barbeiro, id_servico) VALUES (?, ?, ?, ?, ?)`;
        db.run(query, [data, horario, cpf_cliente, id_barbeiro, id_servico], function(err) {
            if (err) {
                console.error("Erro ao cadastrar agendamento:", err);
                return res.status(500).json({ success: false, message: "Erro ao cadastrar agendamento." });
            }
            res.status(201).json({ success: true, message: "Agendamento cadastrado com sucesso." });
        });
    });
    });
});

app.get("/agendamentos", (req, res) => {
    const date = req.query.date;
    let query = `
        SELECT 
            a.id,
            a.data,
            a.horario,
            a.cpf_cliente,
            c.nome as cliente_nome,
            a.id_barbeiro,
            b.nome as barbeiro_nome,
            a.id_servico,
            s.nome as servico_nome
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cpf_cliente = c.cpf
        LEFT JOIN barbeiros b ON a.id_barbeiro = b.id
        LEFT JOIN servicos s ON a.id_servico = s.id
    `;

    if (date) {
        query += ` WHERE a.data = ? ORDER BY a.horario`;
        db.all(query, [date], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar agendamentos." });
            }
            res.json(rows);
        });
    } else {
        query += ` ORDER BY a.data DESC, a.horario DESC`;
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar agendamentos." });
            }
            res.json(rows);
        });
    }
});

app.delete("/excluir-agendamento/:id", (req, res) => {
    const id = req.params.id;
    const query = `DELETE FROM agendamentos WHERE id = ?`;

    db.run(query, [id], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Erro ao excluir agendamento." });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: "Agendamento não encontrado." });
        }

        res.json({ success: true, message: "Agendamento excluído com sucesso." });
    });
});

// ========== ROTAS DE RELATÓRIOS ==========
app.get("/relatorio-financeiro", (req, res) => {
    const { cpf_cliente, servico, dataInicio, dataFim } = req.query;

    let query = `
        SELECT 
            a.id,
            a.data,
            a.horario,
            a.cpf_cliente,
            c.nome as cliente_nome,
            a.id_barbeiro,
            b.nome as barbeiro_nome,
            a.id_servico,
            s.nome as servico_nome,
            s.preco as servico_preco
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cpf_cliente = c.cpf
        LEFT JOIN barbeiros b ON a.id_barbeiro = b.id
        LEFT JOIN servicos s ON a.id_servico = s.id
        WHERE 1=1
    `;

    const params = [];

    if (cpf_cliente && cpf_cliente.trim() !== '') {
        query += ` AND a.cpf_cliente LIKE ?`;
        params.push(`%${cpf_cliente}%`);
    }

    if (servico && servico.trim() !== '') {
        query += ` AND s.nome LIKE ?`;
        params.push(`%${servico}%`);
    }

    if (dataInicio && dataInicio.trim() !== '') {
        query += ` AND a.data >= ?`;
        params.push(dataInicio);
    }

    if (dataFim && dataFim.trim() !== '') {
        query += ` AND a.data <= ?`;
        params.push(dataFim);
    }

    query += ` ORDER BY a.data DESC, a.horario DESC`;

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Erro na consulta:", err);
            return res.status(500).json({ success: false, message: "Erro no banco de dados", error: err.message });
        }
        res.json(rows);
    });
});

// NOVA ROTA PARA RELATÓRIO FINANCEIRO COM PAGAMENTOS CONFIRMADOS
app.post("/relatorio-financeiro-confirmados", (req, res) => {
    const { cpf_cliente, servico, dataInicio, dataFim } = req.query;
    const { pagamentos } = req.body;

    console.log("Recebendo pagamentos para relatório:", pagamentos);

    if (!pagamentos || !Array.isArray(pagamentos)) {
        return res.status(400).json({ success: false, message: "Dados de pagamentos são obrigatórios." });
    }

    if (pagamentos.length === 0) {
        return res.json([]);
    }

    const agendamentosIds = pagamentos.map(p => p.id).filter(id => id);

    if (agendamentosIds.length === 0) {
        return res.json([]);
    }

    let query = `
        SELECT 
            a.id,
            a.data,
            a.horario,
            a.cpf_cliente,
            c.nome as cliente_nome,
            a.id_barbeiro,
            b.nome as barbeiro_nome,
            a.id_servico,
            s.nome as servico_nome,
            s.preco as servico_preco
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cpf_cliente = c.cpf
        LEFT JOIN barbeiros b ON a.id_barbeiro = b.id
        LEFT JOIN servicos s ON a.id_servico = s.id
        WHERE a.id IN (${agendamentosIds.map(() => '?').join(',')})
    `;

    const params = [...agendamentosIds];

    if (cpf_cliente && cpf_cliente.trim() !== '') {
        query += ` AND a.cpf_cliente LIKE ?`;
        params.push(`%${cpf_cliente}%`);
    }

    if (servico && servico.trim() !== '') {
        query += ` AND s.nome LIKE ?`;
        params.push(`%${servico}%`);
    }

    if (dataInicio && dataInicio.trim() !== '') {
        query += ` AND a.data >= ?`;
        params.push(dataInicio);
    }

    if (dataFim && dataFim.trim() !== '') {
        query += ` AND a.data <= ?`;
        params.push(dataFim);
    }

    query += ` ORDER BY a.data DESC, a.horario DESC`;

    db.all(query, params, (err, agendamentos) => {
        if (err) {
            console.error("Erro na consulta:", err);
            return res.status(500).json({ success: false, message: "Erro no banco de dados", error: err.message });
        }

        // Combinar dados dos agendamentos com dados de pagamento
        const resultado = agendamentos.map(agendamento => {
            const pagamento = pagamentos.find(p => p.id === agendamento.id);
            return {
                ...agendamento,
                valorFinal: pagamento ? pagamento.valorFinal : 0,
                desconto: pagamento ? pagamento.desconto : 0,
                formaPagamento: pagamento ? pagamento.formaPagamento : '',
                dataPagamento: pagamento ? pagamento.dataPagamento : null
            };
        });

        res.json(resultado);
    });
});

// ========== ROTAS DE COMISSÕES ==========
app.get("/comissoes-barbeiros", (req, res) => {
    const { dataInicio, dataFim, id_barbeiro } = req.query;

    let query = `
        SELECT 
            b.id as barbeiro_id,
            b.nome as barbeiro_nome,
            b.cargo,
            b.salario,
            a.id as agendamento_id,
            a.data,
            s.nome as servico_nome,
            s.preco as servico_preco,
            pc.desconto,
            pc.valor_final,
            pc.comissao_percentual,
            pc.valor_comissao
        FROM agendamentos a
        LEFT JOIN barbeiros b ON a.id_barbeiro = b.id
        LEFT JOIN servicos s ON a.id_servico = s.id
        LEFT JOIN pagamentos_comissoes pc ON a.id = pc.agendamento_id
        WHERE pc.valor_comissao > 0
    `;

    const params = [];

    if (id_barbeiro && id_barbeiro.trim() !== '') {
        query += ` AND b.id = ?`;
        params.push(id_barbeiro);
    }

    if (dataInicio && dataInicio.trim() !== '') {
        query += ` AND a.data >= ?`;
        params.push(dataInicio);
    }

    if (dataFim && dataFim.trim() !== '') {
        query += ` AND a.data <= ?`;
        params.push(dataFim);
    }

    query += ` ORDER BY a.data DESC, b.nome`;

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Erro ao buscar comissões:", err);
            return res.status(500).json({ success: false, message: "Erro no banco de dados", error: err.message });
        }

        // Agrupar por barbeiro
        const comissoesPorBarbeiro = {};
        let totalGeral = 0;

        rows.forEach(row => {
            if (!comissoesPorBarbeiro[row.barbeiro_id]) {
                comissoesPorBarbeiro[row.barbeiro_id] = {
                    barbeiro_id: row.barbeiro_id,
                    barbeiro_nome: row.barbeiro_nome,
                    cargo: row.cargo,
                    salario: parseFloat(row.salario || 0),
                    total_comissao: 0,
                    servicos: []
                };
            }

            comissoesPorBarbeiro[row.barbeiro_id].servicos.push({
                agendamento_id: row.agendamento_id,
                data: row.data,
                servico_nome: row.servico_nome,
                servico_preco: parseFloat(row.servico_preco),
                desconto: row.desconto || 0,
                valor_final: parseFloat(row.valor_final),
                comissao_percentual: row.comissao_percentual || 0,
                valor_comissao: parseFloat(row.valor_comissao || 0)
            });

            comissoesPorBarbeiro[row.barbeiro_id].total_comissao += parseFloat(row.valor_comissao || 0);
            totalGeral += parseFloat(row.valor_comissao || 0);
        });

        res.json({
            comissoes: Object.values(comissoesPorBarbeiro),
            total_geral: totalGeral
        });
    });
});

app.post("/registrar-comissao", (req, res) => {
    const { agendamento_id, comissao_percentual, valor_comissao, valor_final, desconto } = req.body;

    if (!agendamento_id || !comissao_percentual || !valor_comissao || !valor_final) {
        return res.status(400).json({ success: false, message: "Todos os campos são obrigatórios." });
    }

    // Primeiro verifica se já existe registro
    const checkQuery = `SELECT * FROM pagamentos_comissoes WHERE agendamento_id = ?`;

    db.get(checkQuery, [agendamento_id], (err, existing) => {
        if (err) {
            console.error("Erro ao verificar comissão existente:", err);
            return res.status(500).json({ success: false, message: "Erro interno do servidor." });
        }

        let query;
        let params;

        if (existing) {
            // Atualizar comissão existente
            query = `UPDATE pagamentos_comissoes SET comissao_percentual = ?, valor_comissao = ?, valor_final = ?, desconto = ? WHERE agendamento_id = ?`;
            params = [comissao_percentual, valor_comissao, valor_final, desconto || 0, agendamento_id];

            executarQuery();
        } else {
            // Buscar informações do agendamento para inserir dados completos
            const agendamentoQuery = `
                SELECT a.data, a.cpf_cliente, a.id_barbeiro, a.id_servico, s.preco, s.nome as servico_nome 
                FROM agendamentos a 
                LEFT JOIN servicos s ON a.id_servico = s.id 
                WHERE a.id = ?
            `;

            db.get(agendamentoQuery, [agendamento_id], (err, agendamento) => {
                if (err) {
                    console.error("Erro ao buscar agendamento:", err);
                    return res.status(500).json({ success: false, message: "Erro ao buscar dados do agendamento." });
                }

                if (!agendamento) {
                    return res.status(404).json({ success: false, message: "Agendamento não encontrado." });
                }

                // Inserir nova comissão
                query = `
                    INSERT INTO pagamentos_comissoes 
                    (agendamento_id, data, cpf_cliente, id_barbeiro, id_servico, servico_nome, servico_preco, desconto, valor_final, comissao_percentual, valor_comissao) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                params = [
                    agendamento_id,
                    agendamento.data,
                    agendamento.cpf_cliente,
                    agendamento.id_barbeiro,
                    agendamento.id_servico,
                    agendamento.servico_nome,
                    agendamento.preco,
                    desconto || 0,
                    valor_final,
                    comissao_percentual,
                    valor_comissao
                ];

                executarQuery();
            });
        }

        function executarQuery() {
            db.run(query, params, function(err) {
                if (err) {
                    console.error("Erro ao registrar comissão:", err);
                    return res.status(500).json({ success: false, message: "Erro ao registrar comissão." });
                }

                res.json({ success: true, message: existing ? "Comissão atualizada com sucesso!" : "Comissão registrada com sucesso!", changes: this.changes });
            });
        }
    });
});

// ========== ROTAS GERAIS ==========
app.get("/test", (req, res) => {
    res.json({ message: "Servidor funcionando!" });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/debug-servicos", (req, res) => {
    const query = `SELECT id, nome, preco, duracao, comissao_percentual FROM servicos ORDER BY nome`;
    db.all(query, (err, rows) => {
        if (err) {
            console.error("❌ Erro ao buscar serviços:", err);
            return res.status(500).json({ success: false, message: "Erro ao buscar serviços", error: err.message });
        }
        res.json({ success: true, total: rows.length, servicos: rows });
    });
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: "Rota não encontrada" });
});

// Iniciar servidor
app.listen(port, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta ${port}`);
});