
const API_URL = "https://worklink-api-5i9m.onrender.com/api";

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("worklink_token");

    const idSolicitud = new URLSearchParams(
        window.location.search
    ).get("id");

    const form = document.getElementById("form-resena");
    const estrellas = document.querySelectorAll(
        "#estrellas button"
    );
    const puntuacionInput = document.getElementById("puntuacion");
    const comentarioInput = document.getElementById("comentario");
    const contador = document.getElementById("contador-caracteres");
    const textoCalificacion = document.getElementById("texto-calificacion");
    const numeroSolicitud = document.getElementById("numero-solicitud");
    const mensaje = document.getElementById("mensaje-resena");
    const botonPublicar = document.getElementById("btn-publicar");

    let puntuacionSeleccionada = 0;
    let enviando = false;

    const descripciones = {
        1: "Muy malo",
        2: "Malo",
        3: "Regular",
        4: "Bueno",
        5: "Excelente"
    };

    // Verificar sesión
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // Verificar ID de solicitud
    if (!idSolicitud || !/^[1-9]\d*$/.test(idSolicitud)) {
        mostrarMensaje("El ID de la solicitud no es válido.", "error");
        botonPublicar.disabled = true;
        numeroSolicitud.textContent = "No disponible";
        return;
    }

    numeroSolicitud.textContent = `#${idSolicitud}`;

    // Seleccionar puntuación
    estrellas.forEach((estrella) => {
        estrella.addEventListener("click", () => {
            puntuacionSeleccionada = Number(
                estrella.dataset.valor
            );

            puntuacionInput.value = puntuacionSeleccionada;

            actualizarEstrellas();

            textoCalificacion.textContent =
                descripciones[puntuacionSeleccionada];

            botonPublicar.disabled = false;
        });

        // Efecto visual al pasar el cursor
        estrella.addEventListener("mouseenter", () => {
            const valor = Number(estrella.dataset.valor);
            pintarEstrellas(valor);
        });
    });

    document.getElementById("estrellas")
        .addEventListener("mouseleave", actualizarEstrellas);

    function pintarEstrellas(valor) {
        estrellas.forEach((estrella) => {
            const numero = Number(estrella.dataset.valor);

            estrella.classList.toggle(
                "activa",
                numero <= valor
            );
        });
    }

    function actualizarEstrellas() {
        pintarEstrellas(puntuacionSeleccionada);
    }

    // Contador de caracteres
    comentarioInput.addEventListener("input", () => {
        contador.textContent = comentarioInput.value.length;
    });

    // Mostrar mensajes
    function mostrarMensaje(texto, tipo = "") {
        mensaje.textContent = texto;
        mensaje.style.color =
            tipo === "error" ? "#dc3545" :
            tipo === "exito" ? "#198754" :
            "inherit";
    }

    // Publicar reseña
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (enviando) return;

        if (puntuacionSeleccionada < 1 ||
            puntuacionSeleccionada > 5) {
            mostrarMensaje(
                "Seleccioná una calificación de 1 a 5 estrellas.",
                "error"
            );
            return;
        }

        const comentario = comentarioInput.value.trim();

        if (comentario.length > 1000) {
            mostrarMensaje(
                "El comentario no puede superar los 1000 caracteres.",
                "error"
            );
            return;
        }

        enviando = true;
        botonPublicar.disabled = true;
        botonPublicar.textContent = "Publicando...";
        mostrarMensaje("Enviando tu reseña...");

        try {
            const respuesta = await fetch(
                `${API_URL}/resenas`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        id_solicitud: Number(idSolicitud),
                        puntuacion: puntuacionSeleccionada,
                        comentario: comentario
                    })
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.mensaje || "No se pudo publicar la reseña."
                );
            }

            mostrarMensaje(
                "¡Tu reseña fue publicada correctamente!",
                "exito"
            );

            form.reset();

            puntuacionSeleccionada = 0;
            puntuacionInput.value = "";
            contador.textContent = "0";
            textoCalificacion.textContent =
                "Seleccioná una calificación";

            actualizarEstrellas();

            botonPublicar.textContent = "Reseña publicada";
            botonPublicar.disabled = true;

            // Regresar a las solicitudes después de publicar
            setTimeout(() => {
                window.location.href = "solicitudes.html";
            }, 2200);

        } catch (error) {
            console.error("Error al publicar reseña:", error);

            mostrarMensaje(error.message, "error");

            enviando = false;
            botonPublicar.disabled = false;
            botonPublicar.textContent = "Publicar reseña";
        }
    });
});
