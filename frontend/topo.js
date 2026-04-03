document.addEventListener("DOMContentLoaded", () => {

    fetch("/topo.html")
        .then(res => res.text())
        .then(data => {

            const container = document.getElementById("topo-container")
            if (!container) return

            container.innerHTML = data

            aplicarRegrasTopo()
        })
        .catch(err => console.error("Erro topo:", err))

})

function voltarPainel() {
    window.location.href = "/painel.html"
}

function sairSistema() {

    if (confirm("Deseja sair do sistema?")) {

        localStorage.removeItem("tipo_usuario")
        localStorage.removeItem("usuario_id")
        localStorage.removeItem("usuario_nome")

        window.location.href = "/index.html"
    }
}

function aplicarRegrasTopo() {

    const pagina = window.location.pathname
    const tipo = localStorage.getItem("tipo_usuario")

    setTimeout(() => {

        const btnPainel = document.querySelector(".btn-topo.painel")
        const btnSair = document.querySelector(".btn-topo.sair")

        if (pagina.includes("index.html") || pagina === "/") {
            if (btnPainel) btnPainel.style.display = "none"
            if (btnSair) btnSair.style.display = "none"
            return
        }

        if (tipo === "funcionario") {
            if (btnPainel) btnPainel.style.display = "none"
        }

        if (pagina.includes("painel.html")) {
            if (btnPainel) btnPainel.style.display = "none"
        }

        if (btnSair) btnSair.style.display = "inline-block"

    }, 50)
}