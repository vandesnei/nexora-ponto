const express = require("express")
const cors = require("cors")
const path = require("path")
const { Pool } = require("pg")

const app = express()
app.use(cors())
app.use(express.json())

// 🔥 CONEXÃO POSTGRESQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
})

// 🔥 CRIAR TABELAS
async function criarTabelas() {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS empregados (
            id SERIAL PRIMARY KEY,
            nome TEXT,
            matricula TEXT,
            cargo TEXT,
            foto TEXT
        )
    `)

    await pool.query(`
        CREATE TABLE IF NOT EXISTS registros (
            id SERIAL PRIMARY KEY,
            empregado_id INTEGER,
            tipo TEXT,
            data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await pool.query(`
        CREATE TABLE IF NOT EXISTS config (
            chave TEXT PRIMARY KEY,
            valor TEXT
        )
    `)

    console.log("✅ PostgreSQL pronto")
}

criarTabelas()

// 🔥 SERVIR FRONTEND
app.use(express.static(path.join(__dirname, "../frontend")))

// 🔥 ROTA TESTE
app.get("/ping", (req, res) => {
    res.send("ok")
})

// 🔥 CADASTRAR EMPREGADO
app.post("/empregados", async (req, res) => {

    const { nome, matricula, cargo, foto } = req.body

    try {

        await pool.query(
            "INSERT INTO empregados (nome, matricula, cargo, foto) VALUES ($1,$2,$3,$4)",
            [nome, matricula, cargo, foto]
        )

        res.send("Cadastrado")

    } catch (err) {
        console.log(err)
        res.status(500).send("Erro")
    }
})

// 🔥 LISTAR EMPREGADOS
app.get("/empregados", async (req, res) => {

    try {

        const result = await pool.query("SELECT * FROM empregados ORDER BY id DESC")

        res.json(result.rows)

    } catch (err) {
        console.log(err)
        res.status(500).send("Erro")
    }
})

// 🔥 BUSCAR EMPREGADO
app.get("/empregados/:id", async (req, res) => {

    const { id } = req.params

    try {

        const result = await pool.query(
            "SELECT * FROM empregados WHERE id = $1",
            [id]
        )

        res.json(result.rows[0])

    } catch (err) {
        console.log(err)
        res.status(500).send("Erro")
    }
})

// 🔥 REGISTRAR PONTO
app.post("/registrar-ponto", async (req, res) => {

    const { empregado_id, tipo } = req.body

    try {

        await pool.query(
            "INSERT INTO registros (empregado_id, tipo) VALUES ($1,$2)",
            [empregado_id, tipo]
        )

        res.send("Registrado")

    } catch (err) {
        console.log(err)
        res.status(500).send("Erro no servidor")
    }
})

// 🔥 LISTAR REGISTROS POR EMPREGADO
app.get("/registros/:id", async (req, res) => {

    const { id } = req.params

    try {

        const result = await pool.query(
            "SELECT * FROM registros WHERE empregado_id = $1 ORDER BY data DESC",
            [id]
        )

        res.json(result.rows)

    } catch (err) {
        console.log(err)
        res.status(500).send("Erro")
    }
})

// 🔐 VALIDAR SENHA
app.post("/validar-senha", async (req, res) => {

    const { senha } = req.body

    try {

        const result = await pool.query(
            "SELECT valor FROM config WHERE chave = 'senha_painel'"
        )

        if (result.rows.length === 0) {
            return res.status(404).send("Senha não definida")
        }

        if (senha === result.rows[0].valor) {
            res.send("ok")
        } else {
            res.status(401).send("Inválida")
        }

    } catch (err) {
        console.log(err)
        res.status(500).send("Erro")
    }
})

// 🔐 ALTERAR SENHA
app.post("/alterar-senha", async (req, res) => {

    const { novaSenha } = req.body

    try {

        await pool.query(`
            INSERT INTO config (chave, valor)
            VALUES ('senha_painel', $1)
            ON CONFLICT (chave)
            DO UPDATE SET valor = $1
        `, [novaSenha])

        res.send("Atualizada")

    } catch (err) {
        console.log(err)
        res.status(500).send("Erro")
    }
})

// 🚀 START SERVIDOR
const PORT = process.env.PORT || 10000

app.listen(PORT, () => {
    console.log("🚀 Rodando na porta", PORT)
})