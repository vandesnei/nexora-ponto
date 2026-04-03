document.addEventListener("DOMContentLoaded", () => {

    const video = document.getElementById("video")
    const status = document.getElementById("status")

    async function iniciar() {
        try {

            // 🎥 Ativar câmera
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            video.srcObject = stream

            status.innerText = "Carregando reconhecimento..."

            // 🧠 Carregar modelos
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
            await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
            await faceapi.nets.faceRecognitionNet.loadFromUri('/models')

            status.innerText = "Reconhecimento pronto"

        } catch (erro) {
            console.error("Erro ao iniciar:", erro)
            status.innerText = "Erro ao acessar câmera ou modelos"
        }
    }

    iniciar()

    // 👁️ Quando o vídeo começar
    video.addEventListener("play", () => {

        const intervalo = setInterval(async () => {
            try {

                const detections = await faceapi.detectAllFaces(
                    video,
                    new faceapi.TinyFaceDetectorOptions()
                )

                if (detections.length > 0) {
                    status.innerText = "Rosto detectado ✅"
                } else {
                    status.innerText = "Procurando rosto..."
                }

            } catch (erro) {
                console.error("Erro na detecção:", erro)
            }
        }, 1500)

    })

})