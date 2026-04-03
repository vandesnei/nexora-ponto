const video = document.getElementById("video")
const canvas = document.getElementById("canvas")
const overlay = document.getElementById("overlay")
const ctx = overlay.getContext("2d")

let detectionInterval = null

// 🔄 INICIAR CÂMERA
async function iniciarCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user"
            },
            audio: false
        })

        video.srcObject = stream

        await video.play()

    } catch (erro) {
        console.error("Erro na câmera:", erro)
        alert("❌ Não foi possível acessar a câmera")
    }
}

// 🔄 CARREGAR MODELOS
async function carregarModelos() {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models")
}

// 🎯 DETECÇÃO EM TEMPO REAL (CORRIGIDA)
async function detectar() {

    const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions()
    )

    const displaySize = {
        width: video.clientWidth,
        height: video.clientHeight
    }

    overlay.width = displaySize.width
    overlay.height = displaySize.height

    const resized = faceapi.resizeResults(detections, displaySize)

    ctx.clearRect(0, 0, overlay.width, overlay.height)

    // 🎯 DESENHAR DETECÇÃO REAL
    faceapi.draw.drawDetections(overlay, resized)

    // 🟩 QUADRADO CENTRAL (GUIA)
    const guiaSize = 200
    const x = (overlay.width / 2) - (guiaSize / 2)
    const y = (overlay.height / 2) - (guiaSize / 2)

    ctx.strokeStyle = "lime"
    ctx.lineWidth = 3
    ctx.strokeRect(x, y, guiaSize, guiaSize)

    // 🔥 STATUS INTELIGENTE
    const status = document.getElementById("status")

    if (detections.length > 0) {
        status.innerHTML = "✅ Rosto detectado"
        status.style.color = "green"
    } else {
        status.innerHTML = "🔍 Procurando rosto..."
        status.style.color = "#333"
    }
}

// 🔁 LOOP DE DETECÇÃO (SEGURO)
function iniciarDeteccao() {

    if (detectionInterval) clearInterval(detectionInterval)

    detectionInterval = setInterval(detectar, 200)
}

// 📸 FUNÇÃO GLOBAL
window.capturarFace = async function () {

    try {

        const id = document.getElementById("id").value

        if (!id) {
            alert("Informe o ID")
            return
        }

        // 🔍 VERIFICA FACE
        const check = await fetch(`/verificar-face/${id}`)
        const result = await check.json()

        if (result.existe) {
            const confirmar = confirm("⚠️ Já existe face cadastrada.\nDeseja substituir?")
            if (!confirmar) return
        }

        // 🔍 DETECÇÃO
        const detections = await faceapi.detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions()
        )

        if (detections.length === 0) {
            alert("Nenhum rosto detectado")
            return
        }

        // 📸 REDUZ TAMANHO (IMPORTANTE)
        canvas.width = 320
        canvas.height = 240
        canvas.getContext("2d").drawImage(video, 0, 0, 320, 240)

        const imagem = canvas.toDataURL("image/jpeg", 0.6)

        // 📡 SALVAR
        const res = await fetch("/salvar-face", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, imagem })
        })

        // 👉 CHAMA O MODAL
        mostrarModal()

        const msg = await res.text()

        if (!res.ok) {
            alert(msg)
            return
        }

        // 🎉 SUCESSO
        function mostrarModal() {

            const escolha = confirm(
                "✅ Rosto cadastrado com sucesso!\n\n" +
                "OK = Cadastrar outra face\n" +
                "Cancelar = Concluir e sair"
            )

            if (escolha) {
                // 🔁 continuar cadastrando
                document.getElementById("status").innerText = "Pronto para nova captura"
            } else {
                // 🚪 sair
                window.location.href = "/painel.html"
            }
        }

    } catch (e) {
        console.error(e)
        alert("Erro ao salvar face")
    }
}

// 🚀 INICIALIZAÇÃO (CORRIGIDA)
async function init() {

    try {

        status.innerText = "📦 Carregando modelos..."

        await carregarModelos()

        status.innerText = "📷 Iniciando câmera..."

        await iniciarCamera()

        status.innerHTML = "✅ Sistema pronto - posicione o rosto"
        status.style.color = "green"

        // 🔁 só inicia depois que vídeo estiver pronto
        video.addEventListener("loadeddata", () => {
            iniciarDeteccao()
        })

    } catch (e) {
        console.error("Erro ao iniciar:", e)
        status.innerText = "❌ Erro ao iniciar sistema"
        status.style.color = "red"
    }
}

init()