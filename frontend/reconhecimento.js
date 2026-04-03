const video = document.getElementById("video")
const status = document.getElementById("status")

let faceMatcher = null
let usuariosMap = {}
let reconhecido = false
let ultimoRegistro = 0
let intervalo = null

const TEMPO_BLOQUEIO = 5000 // 5 segundos

// 🚀 INICIAR SISTEMA
async function iniciar() {

    try {

        status.innerText = "📷 Iniciando câmera..."

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false
        })

        video.srcObject = stream
        await video.play()

        status.innerText = "🧠 Carregando modelos..."

        await faceapi.nets.tinyFaceDetector.loadFromUri("/models")
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models")
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models")

        status.innerText = "👥 Buscando funcionários..."

        const res = await fetch("/faces")
        const usuarios = await res.json()

        if (!usuarios.length) {
            status.innerText = "❌ Nenhum funcionário cadastrado"
            return
        }

        // 🔗 MAPA ID → NOME
        usuarios.forEach(u => {
            usuariosMap[u.id] = u.nome
        })

        status.innerText = "📸 Processando rostos..."

        const descriptors = []

        for (let user of usuarios) {

            try {

                const img = await faceapi.fetchImage(`/faces/${user.id}.jpg`)

                const detection = await faceapi
                    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor()

                if (!detection) continue

                descriptors.push(
                    new faceapi.LabeledFaceDescriptors(
                        user.id.toString(),
                        [detection.descriptor]
                    )
                )

            } catch (e) {
                console.warn("Erro na imagem:", user.id)
            }
        }

        if (!descriptors.length) {
            status.innerText = "❌ Nenhuma face válida"
            return
        }

        faceMatcher = new faceapi.FaceMatcher(descriptors, 0.6)

        status.innerText = "🙂 Olhe para a câmera"

    } catch (erro) {

        console.error("Erro ao iniciar:", erro)
        status.innerText = "❌ Erro ao iniciar sistema"
    }
}

iniciar()

// 🎯 LOOP DE RECONHECIMENTO
video.addEventListener("play", () => {

    if (intervalo) return

    intervalo = setInterval(async () => {

        try {

            if (!faceMatcher || reconhecido) return

            const detections = await faceapi
                .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors()

            if (!detections.length) {
                status.innerText = "🔍 Procurando rosto..."
                return
            }

            const resultado = faceMatcher.findBestMatch(detections[0].descriptor)

            if (resultado.label !== "unknown") {

                const agoraTimestamp = Date.now()

                // 🚫 EVITA DUPLICIDADE
                if (agoraTimestamp - ultimoRegistro < TEMPO_BLOQUEIO) {
                    status.innerText = "⏳ Aguarde... já registrado"
                    return
                }

                ultimoRegistro = agoraTimestamp
                reconhecido = true

                const id = resultado.label
                const nome = usuariosMap[id] || "Funcionário"

                status.innerText = `⏳ Registrando ${nome}...`

                // 🔥 REGISTRO REAL NO BACKEND
                try {

                    const res = await fetch("/registrar-ponto", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ id })
                    })

                    if (!res.ok) {
                        throw new Error("Erro no servidor")
                    }

                    const msg = await res.text()

                    status.innerText = `✅ ${nome} - ${msg}`

                    console.log("Registro feito:", nome, msg)

                    // 🔊 SOM
                    try {
                        new Audio("/beep.mp3").play()
                    } catch (e) { }

                } catch (erro) {

                    console.error("Erro ao registrar:", erro)
                    status.innerText = "❌ Erro ao registrar ponto"

                }

                // 🔄 LIBERA NOVO REGISTRO
                setTimeout(() => {
                    reconhecido = false
                    status.innerText = "🟡 Aguardando próximo registro..."
                }, TEMPO_BLOQUEIO)

            } else {

                status.innerText = "❌ Rosto não reconhecido"
            }

        } catch (erro) {
            console.error("Erro no loop:", erro)
        }

    }, 800)
})