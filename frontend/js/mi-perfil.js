
const API_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", () => {
    const token =
        localStorage.getItem("worklink_token") ||
        sessionStorage.getItem("worklink_token");

    const mensajeGeneral = document.getElementById("mensaje-general");
    const mensajeProfesional = document.getElementById("mensaje-profesional");
    const estadoProfesional = document.getElementById("estado-perfil-profesional");

    const vistaProfesional = document.getElementById("vista-datos-profesionales");
    const accionesExistente = document.getElementById("acciones-perfil-existente");
    const accionesCrear = document.getElementById("acciones-crear-profesional");

    const botonEditar = document.getElementById("btn-editar-profesional");
    const botonCrear = document.getElementById("btn-crear-profesional");
    const botonCerrarSesion = document.getElementById("btn-cerrar-sesion");

    let perfilActual = null;

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // Cerrar sesión
    botonCerrarSesion?.addEventListener("click", () => {
        localStorage.removeItem("worklink_token");
        localStorage.removeItem("worklink_usuario");
        sessionStorage.removeItem("worklink_token");
        sessionStorage.removeItem("worklink_usuario");

        window.location.href = "login.html";
    });

    // Peticiones a la API
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

    function mostrarMensaje(elemento, texto, tipo = "") {
        if (!elemento) return;

        elemento.textContent = texto;
        elemento.className = `mensaje ${tipo}`.trim();
    }

    function mostrarValor(id, valor, predeterminado = "No registrado") {
        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.textContent =
                valor !== null && valor !== undefined && String(valor).trim() !== ""
                    ? valor
                    : predeterminado;
        }
    }

    // Cargar los datos personales
    async function cargarDatos() {
        try {
            const datos = await api("/auth/me");
            const usuario = datos.usuario;

            if (!usuario) {
                throw new Error("No se encontraron los datos de tu cuenta.");
            }

            const nombreCompleto = [
                usuario.nombre,
                usuario.apellido
            ].filter(Boolean).join(" ");

            mostrarValor("vista-nombre", nombreCompleto);
            mostrarValor("vista-correo", usuario.correo);
            mostrarValor("vista-telefono", usuario.telefono);

            const tiposCuenta = {
                cliente: "Cliente",
                profesional: "Profesional",
                ambos: "Cliente y profesional"
            };

            mostrarValor(
                "vista-tipo-cuenta",
                tiposCuenta[usuario.tipo_cuenta] || usuario.tipo_cuenta
            );

            localStorage.setItem("worklink_usuario", JSON.stringify(usuario));

            mostrarMensaje(mensajeGeneral, "");

            await cargarPerfilProfesional();

        } catch (error) {
            console.error("Error cargando la cuenta:", error);

            mostrarMensaje(
                mensajeGeneral,
                `No se pudieron cargar tus datos: ${error.message}`,
                "error"
            );

            [
                "vista-nombre",
                "vista-correo",
                "vista-telefono",
                "vista-tipo-cuenta"
            ].forEach(id => mostrarValor(id, "No disponible"));
        }
    }

    // Cargar y mostrar el perfil profesional
    async function cargarPerfilProfesional() {
        estadoProfesional.textContent = "Cargando tu perfil profesional...";

        if (vistaProfesional) vistaProfesional.hidden = true;
        if (accionesExistente) accionesExistente.hidden = true;
        if (accionesCrear) accionesCrear.hidden = true;

        try {
            const datos = await api("/perfiles/mi-perfil");
            const botonServicios = document.getElementById("btn-servicios");

            if (botonServicios) {
                botonServicios.hidden = !datos.perfil;
            }
            perfilActual = datos.perfil || null;

            if (!perfilActual) {
                estadoProfesional.textContent =
                    "Todavía no tenés un perfil profesional. Podés crearlo para comenzar a ofrecer tus servicios.";

                if (accionesCrear) accionesCrear.hidden = false;

                return;
            }

            // Mostrar los datos que ya están guardados en la base de datos
            mostrarValor(
                "vista-titulo-profesional",
                perfilActual.titulo_profesional
            );

            mostrarValor(
                "vista-descripcion-profesional",
                perfilActual.descripcion
            );

            const experiencia = perfilActual.anios_experiencia;

            mostrarValor(
                "vista-experiencia-profesional",
                experiencia !== null && experiencia !== undefined
                    ? `${experiencia} ${Number(experiencia) === 1 ? "año" : "años"}`
                    : null
            );

            const tarifa = perfilActual.tarifa_base;

            mostrarValor(
                "vista-tarifa-profesional",
                tarifa !== null && tarifa !== undefined && tarifa !== ""
                    ? `$${Number(tarifa).toFixed(2)} USD`
                    : null,
                "No especificada"
            );

            mostrarValor(
                "vista-departamento-profesional",
                perfilActual.departamento
            );

            mostrarValor(
                "vista-municipio-profesional",
                perfilActual.municipio
            );

            mostrarValor(
                "vista-direccion-profesional",
                perfilActual.direccion_referencia,
                "No especificada"
            );

            if (vistaProfesional) vistaProfesional.hidden = false;

            estadoProfesional.textContent =
                "Tu perfil profesional está registrado. Aquí podés consultar tus datos cuando lo necesités.";

            if (accionesExistente) accionesExistente.hidden = false;

        } catch (error) {
            console.error("Error cargando el perfil profesional:", error);

            estadoProfesional.textContent =
                `No se pudo cargar el perfil profesional: ${error.message}`;
        }
    }

    // Ir a la página para editar el perfil profesional
    botonEditar?.addEventListener("click", () => {
        window.location.href = "crear-perfil-p.html?editar=1";
    });

    // Ir a la página para crear un perfil profesional
    botonCrear?.addEventListener("click", () => {
        window.location.href = "crear-perfil-p.html";
    });

    cargarDatos();
});
