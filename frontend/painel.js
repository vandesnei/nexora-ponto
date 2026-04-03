const tabela = document.getElementById("tabela")

// 🚀 CARREGAR DADOS
async function carregar() {

    try {

        const res = await fetch("/registros-completos")
        const dados = await res.json()

        // 🔥 LIMPA TABELA (mantém cabeçalho)
        tabela.innerHTML = `
            <tr style="background-color:#ddd;">
                <th>Nome</th>
                <th>Data</th>
                <th>Tipo</th>
            </tr>
        `

        dados.forEach(reg => {

            const row = tabela.insertRow()

            row.insertCell(0).innerText = reg.nome
            row.insertCell(1).innerText = new Date(reg.data).toLocaleString()
            row.insertCell(2).innerText = reg.tipo

        })

    } catch (erro) {

        console.error("Erro ao carregar painel:", erro)
        alert("Erro ao carregar dados")

    }

}

// 🔄 BOTÃO ATUALIZAR
function atualizar() {
    carregar()
}

// 🚀 AUTO CARREGAR
carregar()

// 🔁 ATUALIZA AUTOMATICAMENTE A CADA 5 SEGUNDOS
setInterval(carregar, 5000)