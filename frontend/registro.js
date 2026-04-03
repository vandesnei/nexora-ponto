const mensagem = document.getElementById("mensagem")

async function iniciar() {

    // 🔥 PEGA DADOS SALVOS
    const id = localStorage.getItem("usuario_id")
    const nome = localStorage.getItem("usuario_nome")

    if (!id || !nome) {
        mensagem.innerText = "❌ Erro: usuário não identificado"

        // 🔁 volta pro reconhecimento
        setTimeout(() => {
            window.location.href = "/reconhecimento.html"
        }, 2000)

        return
    }

    mensagem.innerText = `👋 Olá, ${nome}`

    try {

        mensagem.innerText = "⏳ Registrando ponto..."

        const res = await fetch("/registrar-ponto", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id })
        })

        // 🚨 VERIFICA SE DEU ERRO HTTP
        if (!res.ok) {
            throw new Error("Erro no servidor")
        }

        const msg = await res.text()

        mensagem.innerText = `✅ ${msg}`

        console.log("Resposta backend:", msg)

    } catch (erro) {

        console.error("Erro:", erro)

        // ⚠️ FALLBACK (salva local se backend falhar)
        const agora = new Date()

        const registro = {
            nome: nome,
            data: agora.toLocaleDateString(),
            hora: agora.toLocaleTimeString()
        }

        let pontos = JSON.parse(localStorage.getItem("pontos")) || []
        pontos.push(registro)

        localStorage.setItem("pontos", JSON.stringify(pontos))

        mensagem.innerText = "⚠️ Registrado localmente (sem conexão com servidor)"

    } finally {

        // 🔥 LIMPA DADOS
        localStorage.removeItem("usuario_id")
        localStorage.removeItem("usuario_nome")

        // 🔁 VOLTA AUTOMÁTICO
        setTimeout(() => {
            window.location.href = "/reconhecimento.html"
        }, 3000)
    }
}

// 🚀 START
iniciar()