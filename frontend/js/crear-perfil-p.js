
document.addEventListener("DOMContentLoaded", () => {
    const API = "http://localhost:3000/api";

    const formulario = document.getElementById("form-crear-perfil");
    const boton = document.getElementById("btn-guardar");
    const mensaje = document.getElementById("mensaje");

    const token =
        localStorage.getItem("worklink_token") ||
        sessionStorage.getItem("worklink_token");

    const parametros = new URLSearchParams(window.location.search);
    const modoEdicion = parametros.get("editar") === "1";

    let perfilActual = null;
    let guardando = false;

    if (!token) {
        mostrarMensaje(
            "Tu sesión no está activa. Iniciá sesión para continuar.",
            "error"
        );
        boton.disabled = true;
        return;
    }

    document.getElementById("btn-cerrar-sesion")
        ?.addEventListener("click", () => {
            localStorage.removeItem("worklink_token");
            localStorage.removeItem("worklink_usuario");
            sessionStorage.removeItem("worklink_token");
            sessionStorage.removeItem("worklink_usuario");

            window.location.href = "login.html";
        });

    function mostrarMensaje(texto, tipo = "") {
        mensaje.textContent = texto;
        mensaje.className = `mensaje visible ${tipo}`.trim();
    }

    async function api(ruta, opciones = {}) {
        const respuesta = await fetch(`${API}${ruta}`, {
            ...opciones,
            headers: {
                ...(opciones.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...(opciones.headers || {}),
                Authorization: `Bearer ${token}`
            }
        });

        const resultado = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            if (respuesta.status === 401) {
                localStorage.removeItem("worklink_token");
                sessionStorage.removeItem("worklink_token");
                localStorage.removeItem("worklink_usuario");
                sessionStorage.removeItem("worklink_usuario");

                window.location.href = "login.html";
            }

            throw new Error(
                resultado.mensaje || `Error ${respuesta.status}`
            );
        }

        return resultado;
    }

    function establecerModoEdicion() {
        document.title = "Editar perfil profesional | Worklink";

        document.querySelector(".introduccion h1").textContent =
            "Actualizá tu perfil profesional.";

        document.querySelector(".introduccion p").textContent =
            "Modificá tus datos para mantener tu información profesional al día.";

        document.querySelector(".titulo-formulario h2").textContent =
            "Editar información profesional";

        document.querySelector(".titulo-formulario p").textContent =
            "Actualizá los campos que necesités.";

        boton.textContent = "Guardar cambios";
    }

    function rellenarFormulario(perfil) {
        document.getElementById("titulo").value =
            perfil.titulo_profesional || "";

        document.getElementById("descripcion").value =
            perfil.descripcion || "";

        document.getElementById("experiencia").value =
            perfil.anios_experiencia ?? 0;

        document.getElementById("tarifa").value =
            perfil.tarifa_base ?? "";

        document.getElementById("departamento").value =
            perfil.departamento || "";

        document.getElementById("municipio").value =
            perfil.municipio || "";

        document.getElementById("direccion").value =
            perfil.direccion_referencia || "";

        document.getElementById("foto").value =
            perfil.foto_url || "";
    }

    async function cargarPerfilExistente() {
        establecerModoEdicion();
        boton.disabled = true;

        mostrarMensaje("Cargando los datos de tu perfil...", "");

        try {
            const resultado = await api("/perfiles/mi-perfil");

            perfilActual = resultado.perfil || null;

            if (!perfilActual || !perfilActual.id_perfil) {
                throw new Error(
                    "No encontramos un perfil profesional para editar. Volvé a Mi perfil y comprobá si ya creaste uno."
                );
            }

            rellenarFormulario(perfilActual);

            mostrarMensaje(
                "Tus datos actuales están cargados. Podés modificarlos y guardar los cambios.",
                "exito"
            );

            boton.disabled = false;

        } catch (error) {
            mostrarMensaje(error.message, "error");
            boton.disabled = true;
        }
    }

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        if (guardando) return;

        if (modoEdicion && !perfilActual) {
            mostrarMensaje(
                "No se ha cargado tu perfil actual. No se guardaron cambios.",
                "error"
            );
            return;
        }

        const tarifaTexto = document.getElementById("tarifa").value.trim();
        const fotoTexto = document.getElementById("foto").value.trim();

        const datos = {
            titulo_profesional: document.getElementById("titulo").value.trim(),
            descripcion: document.getElementById("descripcion").value.trim(),
            anios_experiencia: Number(
                document.getElementById("experiencia").value
            ),
            tarifa_base: tarifaTexto === "" ? null : Number(tarifaTexto),
            departamento: document.getElementById("departamento").value.trim(),
            municipio: document.getElementById("municipio").value.trim(),
            direccion_referencia:
                document.getElementById("direccion").value.trim(),
            foto_url: fotoTexto || null
        };

        if (
            !datos.titulo_profesional ||
            !datos.descripcion ||
            !datos.departamento ||
            !datos.municipio
        ) {
            mostrarMensaje(
                "Completá los campos obligatorios antes de continuar.",
                "error"
            );
            return;
        }

        guardando = true;
        boton.disabled = true;
        boton.textContent = "Guardando...";

        mostrarMensaje(
            modoEdicion
                ? "Actualizando tu perfil profesional..."
                : "Creando tu perfil profesional...",
            ""
        );

        try {
            const resultado = modoEdicion
                ? await api(`/perfiles/${perfilActual.id_perfil}`, {
                    method: "PUT",
                    body: JSON.stringify(datos)
                })
                : await api("/perfiles", {
                    method: "POST",
                    body: JSON.stringify(datos)
                });

            mostrarMensaje(
                resultado.mensaje ||
                    (modoEdicion
                        ? "Tu perfil profesional se actualizó correctamente."
                        : "Tu perfil profesional se creó correctamente."),
                "exito"
            );

            boton.textContent = "¡Guardado!";

            setTimeout(() => {
                window.location.href = "mi-perfil.html";
            }, 1000);

        } catch (error) {
            mostrarMensaje(error.message, "error");
            boton.disabled = false;
            boton.textContent = modoEdicion
                ? "Guardar cambios"
                : "Crear mi perfil";
        } finally {
            guardando = false;
        }
    });

    if (modoEdicion) {
        cargarPerfilExistente();
    } else {
        boton.textContent = "Crear mi perfil";
    }
});
