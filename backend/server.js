const express = require("express")
const Database = require("better-sqlite3")
const cors = require("cors")
const path = require("path")
const fs = require("fs")

const app = express()

app.use(cors())
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ limit: "10mb", extended: true }))

// ================= FRONTEND =================
const frontendPath = path.join(__dirname, "..", "frontend")

app.use(express.static(frontendPath))
app.use("/models", express.static(path.join(frontendPath, "models")))
app.use("/faces", express.static(path.join(frontendPath, "faces")))

// 🔥 CORREÇÃO AQUI (ROTA RAIZ)
app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"))
})

// ================= BANCO =================
const dbPath = path.join(__dirname, "database.db")
const db = new Database(dbPath)

console.log("✅ Banco SQLite conectado")

// ================= TABELAS =================
db.exec(`
CREATE TABLE IF NOT EXISTS empregados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    matricula TEXT,
    cargo TEXT,
    foto TEXT
);

CREATE TABLE IF NOT EXISTS registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empregado_id INTEGER,
    data TEXT,
    tipo TEXT
);

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT,
    senha TEXT
);

CREATE TABLE IF NOT EXISTS config (
    chave TEXT PRIMARY KEY,
    valor TEXT
);
`)

// ================= LOGIN =================
app.post("/login", (req, res) => {
    const { usuario, senha } = req.body

    if (!usuario || !senha) {
        return res.status(400).send("Usuário e senha obrigatórios")
    }

    try {
        const user = db.prepare(
            "SELECT * FROM usuarios WHERE usuario=? AND senha=?"
        ).get(usuario, senha)

        if (user) res.json(user)
        else res.status(401).send("Login inválido")

    } catch {
        res.status(500).send("Erro no servidor")
    }
})

// ================= EMPREGADOS =================

// LISTAR
app.get("/empregados", (req, res) => {
    try {
        const lista = db.prepare("SELECT * FROM empregados").all()
        res.json(lista)
    } catch {
        res.status(500).send("Erro ao buscar empregados")
    }
})

// CADASTRAR
app.post("/empregados", (req, res) => {
    const { nome, matricula, cargo, foto } = req.body

    if (!nome || !matricula) {
        return res.status(400).send("Nome e matrícula obrigatórios")
    }

    try {
        const result = db.prepare(
            "INSERT INTO empregados (nome, matricula, cargo, foto) VALUES (?, ?, ?, ?)"
        ).run(nome, matricula, cargo || null, foto || null)

        res.json({
            mensagem: "Empregado cadastrado",
            id: result.lastInsertRowid
        })

    } catch (err) {
        console.log(err)
        res.status(500).send("Erro ao salvar")
    }
})

// EXCLUIR
app.delete("/empregados/:id", (req, res) => {
    try {
        db.prepare("DELETE FROM empregados WHERE id=?").run(req.params.id)
        res.send("Excluído")
    } catch {
        res.status(500).send("Erro ao excluir")
    }
})

// LIMPAR
app.delete("/empregados", (req, res) => {
    try {
        db.prepare("DELETE FROM empregados").run()
        res.send("Lista limpa")
    } catch {
        res.status(500).send("Erro")
    }
})

// ================= REGISTROS =================
app.post("/registrar-ponto", (req, res) => {
    const { id } = req.body

    if (!id) return res.status(400).send("ID obrigatório")

    try {
        const emp = db.prepare("SELECT id FROM empregados WHERE id=?").get(id)

        if (!emp) return res.status(404).send("Não encontrado")

        const ultimo = db.prepare(`
            SELECT tipo, data 
            FROM registros 
            WHERE empregado_id=? 
            ORDER BY data DESC LIMIT 1
        `).get(id)

        let tipo = "entrada"

        if (ultimo) {
            tipo = ultimo.tipo === "entrada" ? "saida" : "entrada"

            const diff = (new Date() - new Date(ultimo.data)) / 60000
            if (diff < 1) return res.status(429).send("Muito rápido")
        }

        db.prepare(`
            INSERT INTO registros (empregado_id,data,tipo)
            VALUES (?,datetime('now'),?)
        `).run(id, tipo)

        res.send(`Ponto ${tipo}`)

    } catch {
        res.status(500).send("Erro")
    }
})

// LISTAR
app.get("/registros-completos", (req, res) => {
    try {
        const dados = db.prepare(`
            SELECT r.*, e.nome 
            FROM registros r
            JOIN empregados e ON e.id = r.empregado_id
            ORDER BY r.data DESC
        `).all()

        res.json(dados)
    } catch {
        res.status(500).send("Erro")
    }
})

// ================= FACE =================
app.get("/verificar-face/:id", (req, res) => {
    const caminho = path.join(frontendPath, "faces", `${req.params.id}.jpg`)

    res.json({
        existe: fs.existsSync(caminho)
    })
})

app.post("/salvar-face", (req, res) => {
    const { id, imagem } = req.body

    if (!id || !imagem) return res.status(400).send("Inválido")

    const pasta = path.join(frontendPath, "faces")
    if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true })

    const caminho = path.join(pasta, `${id}.jpg`)

    const base64 = imagem.replace(/^data:image\/jpeg;base64,/, "")

    fs.writeFileSync(caminho, base64, "base64")

    res.send("Salvo")
})

// ================= SENHA =================
app.post("/validar-senha", (req, res) => {
    const { senha } = req.body

    try {
        const result = db.prepare(
            "SELECT valor FROM config WHERE chave='senha_painel'"
        ).get()

        if (result && senha === result.valor) res.send("ok")
        else res.status(401).send("Inválida")

    } catch {
        res.status(500).send("Erro")
    }
})

app.post("/alterar-senha", (req, res) => {
    const { novaSenha } = req.body

    try {
        db.prepare(
            "INSERT OR REPLACE INTO config (chave, valor) VALUES ('senha_painel', ?)"
        ).run(novaSenha)

        res.send("Atualizada")

    } catch {
        res.status(500).send("Erro")
    }
})

// ================= START =================
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`🚀 Rodando na porta ${PORT}`)
})