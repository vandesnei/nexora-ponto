const express = require("express")
const sqlite3 = require("sqlite3").verbose()
const cors = require("cors")
const path = require("path")
const fs = require("fs")

const app = express()

app.use(cors())

// 🔥 LIMITE DE PAYLOAD
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ limit: "10mb", extended: true }))

// ================= FRONTEND =================
const frontendPath = path.join(__dirname, "../frontend")

app.use(express.static(frontendPath))
app.use("/models", express.static(path.join(frontendPath, "models")))

// ================= BANCO SQLITE =================
const dbPath = path.join(__dirname, "database.db")

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.log("❌ Erro banco:", err)
    else console.log("✅ Banco SQLite conectado")
})

// 🔥 CRIAR TABELAS AUTOMATICAMENTE
db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS empregados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            matricula TEXT,
            cargo TEXT,
            foto TEXT
        )
    `)

    db.run(`
        CREATE TABLE IF NOT EXISTS registros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empregado_id INTEGER,
            data TEXT,
            tipo TEXT
        )
    `)

    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT,
            senha TEXT
        )
    `)

    db.run(`
        CREATE TABLE IF NOT EXISTS config (
            chave TEXT PRIMARY KEY,
            valor TEXT
        )
    `)

})

// ================= LOGIN =================
app.post("/login", (req, res) => {
    const { usuario, senha } = req.body

    if (!usuario || !senha) {
        return res.status(400).send("Usuário e senha obrigatórios")
    }

    db.get(
        "SELECT * FROM usuarios WHERE usuario=? AND senha=?",
        [usuario, senha],
        (err, result) => {
            if (err) return res.status(500).send("Erro no servidor")
            if (result) res.json(result)
            else res.status(401).send("Login inválido")
        }
    )
})

// ================= EMPREGADOS =================

// LISTAR
app.get("/empregados", (req, res) => {
    db.all("SELECT * FROM empregados", [], (err, result) => {
        if (err) return res.status(500).send("Erro ao buscar empregados")
        res.json(result)
    })
})

// CADASTRAR
app.post("/empregados", (req, res) => {

    const { nome, matricula, cargo, foto } = req.body

    if (!nome || !matricula) {
        return res.status(400).send("Nome e matrícula são obrigatórios")
    }

    db.run(
        "INSERT INTO empregados (nome, matricula, cargo, foto) VALUES (?, ?, ?, ?)",
        [nome, matricula, cargo || null, foto || null],
        function (err) {

            if (err) {
                console.log(err)
                return res.status(500).send("Erro ao salvar empregado")
            }

            res.json({
                mensagem: "Empregado cadastrado",
                id: this.lastID
            })
        }
    )
})

// EXCLUIR UM
app.delete("/empregados/:id", (req, res) => {
    const { id } = req.params

    db.run("DELETE FROM empregados WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).send("Erro ao excluir")
        res.send("Excluído com sucesso")
    })
})

// LIMPAR TODOS
app.delete("/empregados", (req, res) => {
    db.run("DELETE FROM empregados", [], (err) => {
        if (err) return res.status(500).send("Erro ao limpar")
        res.send("Lista limpa")
    })
})

// ================= REGISTROS =================

// REGISTRO INTELIGENTE
app.post("/registrar-ponto", (req, res) => {

    const { id } = req.body

    if (!id) {
        return res.status(400).send("ID do empregado é obrigatório")
    }

    db.get("SELECT id FROM empregados WHERE id=?", [id], (err, emp) => {

        if (err) return res.status(500).send("Erro no servidor")

        if (!emp) {
            return res.status(404).send("Empregado não encontrado")
        }

        db.get(
            "SELECT tipo, data FROM registros WHERE empregado_id=? ORDER BY data DESC LIMIT 1",
            [id],
            (err, result) => {

                if (err) return res.status(500).send("Erro")

                let tipo = "entrada"

                if (result) {

                    tipo = result.tipo === "entrada" ? "saida" : "entrada"

                    const ultimo = new Date(result.data)
                    const agora = new Date()

                    const diffMinutos = (agora - ultimo) / 1000 / 60

                    if (diffMinutos < 1) {
                        return res.status(429).send("Registro muito recente")
                    }
                }

                db.run(
                    "INSERT INTO registros(empregado_id,data,tipo) VALUES(?,datetime('now'),?)",
                    [id, tipo],
                    (err) => {

                        if (err) return res.status(500).send("Erro ao registrar")

                        res.send(`Ponto ${tipo} registrado`)
                    }
                )
            }
        )
    })
})

// LISTAR REGISTROS
app.get("/registros-completos", (req, res) => {

    db.all(`
        SELECT r.*, e.nome 
        FROM registros r
        JOIN empregados e ON e.id = r.empregado_id
        ORDER BY r.data DESC
    `, [], (err, result) => {

        if (err) return res.status(500).send("Erro")

        res.json(result)
    })
})

// ================= FACE =================

// VERIFICAR FACE
app.get("/verificar-face/:id", (req, res) => {
    const { id } = req.params

    const caminho = path.join(frontendPath, "faces", `${id}.jpg`)

    res.json({
        existe: fs.existsSync(caminho)
    })
})

// SALVAR FACE
app.post("/salvar-face", (req, res) => {

    const { id, imagem } = req.body

    if (!id || !imagem) {
        return res.status(400).send("Dados inválidos")
    }

    const pasta = path.join(frontendPath, "faces")

    if (!fs.existsSync(pasta)) {
        fs.mkdirSync(pasta, { recursive: true })
    }

    const caminho = path.join(pasta, `${id}.jpg`)

    if (fs.existsSync(caminho)) {
        fs.unlinkSync(caminho)
    }

    const base64Data = imagem.replace(/^data:image\/jpeg;base64,/, "")

    fs.writeFile(caminho, base64Data, "base64", (err) => {
        if (err) return res.status(500).send("Erro ao salvar face")
        res.send("Face salva com sucesso")
    })
})

// LISTAR FACES
app.get("/faces", (req, res) => {
    db.all("SELECT id, nome FROM empregados", [], (err, result) => {
        if (err) return res.status(500).send("Erro")
        res.json(result)
    })
})

// ================= SENHA =================

app.post("/validar-senha", (req, res) => {

    const { senha } = req.body

    if (!senha) return res.status(400).send("Senha obrigatória")

    db.get(
        "SELECT valor FROM config WHERE chave='senha_painel'",
        (err, result) => {

            if (err) return res.status(500).send("Erro")

            if (result && senha === result.valor) {
                res.send("ok")
            } else {
                res.status(401).send("Senha inválida")
            }
        }
    )
})

app.post("/alterar-senha", (req, res) => {

    const { novaSenha } = req.body

    if (!novaSenha) return res.status(400).send("Senha inválida")

    db.run(
        "UPDATE config SET valor=? WHERE chave='senha_painel'",
        [novaSenha],
        (err) => {

            if (err) return res.status(500).send("Erro")

            res.send("Senha atualizada")
        }
    )
})

// ================= START =================
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`🚀 Nexora rodando na porta ${PORT}`)
})