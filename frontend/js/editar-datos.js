
const API_URL = "https://worklink-api-5i9m.onrender.com/api";

document.addEventListener("DOMContentLoaded", () => {
    const token =
        localStorage.getItem("worklink_token") ||
        sessionStorage.getItem("worklink_token");

    const formulario = document.getElementById("form-editar-datos");
    const mensaje = document.getElementById("mensaje-general");
    const botonGuardar = document.getElementById("btn-guardar");
    const botonCerrar = document.getElementById("btn-cerrar-sesion");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    function mostrarMensaje(texto, tipo = "") {
        mensaje.textContent = texto;
        mensaje.className = `mensaje ${tipo}`.trim();
    }

    botonCerrar.addEventListener("click", () => {
        localStorage.removeItem("worklink_token");
        localStorage.removeItem("worklink_usuario");
        sessionStorage.removeItem("worklink_token");
        sessionStorage.removeItem("worklink_usuario");
        window.location.href = "login.html";
    });

    async function api(ruta, opciones = {}) {
        const respuesta = await fetch(`${API_URL}${ruta}`, {
            ...opciones,
            headers: {
                ...(opciones.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...(opciones.headers || {}),
                Authorization: `Bearer ${token}`
            }
        });

        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            if (respuesta.status === 401) {
                localStorage.removeItem("worklink_token");
                sessionStorage.removeItem("worklink_token");
                localStorage.removeItem("worklink_usuario");
                sessionStorage.removeItem("worklink_usuario");
                window.location.href = "login.html";
            }

            throw new Error(datos.mensaje || `Error ${respuesta.status}`);
        }

        return datos;
    }

    async function cargarDatos() {
        try {
            const resultado = await api("/auth/me");
            const usuario = resultado.usuario;

            if (!usuario) {
                throw new Error("No se encontraron los datos de tu cuenta.");
            }

            formulario.elements.nombre.value = usuario.nombre || "";
            formulario.elements.apellido.value = usuario.apellido || "";
            formulario.elements.correo.value = usuario.correo || "";
            formulario.elements.telefono.value = usuario.telefono || "";

            localStorage.setItem("worklink_usuario", JSON.stringify(usuario));
            mostrarMensaje("Podés modificar tus datos y guardar los cambios.");

        } catch (error) {
            mostrarMensaje(error.message, "error");
        }
    }

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        botonGuardar.disabled = true;
        mostrarMensaje("Guardando cambios...");

        const datos = {
            nombre: formulario.elements.nombre.value.trim(),
            apellido: formulario.elements.apellido.value.trim(),
            correo: formulario.elements.correo.value.trim(),
            telefono: formulario.elements.telefono.value.trim()
        };

        if (!datos.nombre || !datos.apellido || !datos.correo) {
            mostrarMensaje(
                "Completá el nombre, apellido y correo electrónico.",
                "error"
            );
            botonGuardar.disabled = false;
            return;
        }

        try {
            const resultado = await api("/usuarios/me", {
                method: "PUT",
                body: JSON.stringify(datos)
            });

            if (resultado.usuario) {
                localStorage.setItem(
                    "worklink_usuario",
                    JSON.stringify(resultado.usuario)
                );
            }

            mostrarMensaje(
                resultado.mensaje || "Tus datos se actualizaron correctamente.",
                "exito"
            );

            setTimeout(() => {
                window.location.href = "mi-perfil.html";
            }, 900);

        } catch (error) {
            mostrarMensaje(error.message, "error");
        } finally {
            botonGuardar.disabled = false;
        }
    });

    cargarDatos();
});
