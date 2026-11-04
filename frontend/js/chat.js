
const API_URL = "https://worklink-api-5i9m.onrender.com/api";

const token = localStorage.getItem("worklink_token");

const parametros = new URLSearchParams(window.location.search);
const idSolicitud = Number(parametros.get("id"));

const contenedorMensajes = document.getElementById("mensajes");
const formulario = document.getElementById("formulario-chat");
const campoMensaje = document.getElementById("texto-mensaje");
const botonEnviar = document.getElementById("btn-enviar");
const aviso = document.getElementById("aviso");
const contador = document.getElementById("contador");

let idUsuario = null;
let cargandoMensajes = false;
let enviandoMensaje = false;
let solicitudCerrada = false;
let primerRenderizado = true;
let ultimoIdMensaje = 0;
let temporizadorActualizacion = null;

function mostrarAviso(texto, tipo = "error") {
    aviso.textContent = texto;
    aviso.className = `aviso ${tipo}`;
}

function ocultarAviso() {
    aviso.textContent = "";
    aviso.className = "aviso oculto";
}

async function peticionAPI(ruta, opciones = {}) {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
        ...opciones,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(opciones.body ? { "Content-Type": "application/json" } : {}),
            ...opciones.headers
        }
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
        const error = new Error(
            datos.mensaje || `Error HTTP ${respuesta.status}`
        );

        error.status = respuesta.status;
        throw error;
    }

    return datos;
}

function obtenerNombre(usuario) {
    if (!usuario) return "";

    return [
        usuario.nombre,
        usuario.apellido
    ].filter(Boolean).join(" ").trim();
}

function formatearHora(fecha) {
    const fechaMensaje = new Date(fecha);

    if (Number.isNaN(fechaMensaje.getTime())) {
        return "";
    }

    return fechaMensaje.toLocaleString("es-SV", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function mostrarMensajes(lista) {
    const estabaAbajo =
        contenedorMensajes.scrollHeight -
        contenedorMensajes.scrollTop -
        contenedorMensajes.clientHeight < 100;

    const fragmento = document.createDocumentFragment();

    if (lista.length === 0) {
        const vacio = document.createElement("div");
        vacio.className = "sin-mensajes";
        vacio.textContent =
            "Todavía no hay mensajes. ¡Iniciá la conversación!";
        fragmento.appendChild(vacio);
    }

    for (const mensaje of lista) {
        const propio =
            Number(mensaje.id_remitente) === Number(idUsuario);

        const fila = document.createElement("div");
        fila.className = `mensaje-fila${propio ? " propio" : ""}`;

        const nombre = document.createElement("div");
        nombre.className = "mensaje-remitente";
        nombre.textContent = propio
            ? "Vos"
            : [
                mensaje.nombre_remitente,
                mensaje.apellido_remitente
            ].filter(Boolean).join(" ");

        const burbuja = document.createElement("div");
        burbuja.className = "burbuja";

        // textContent evita interpretar los mensajes como HTML.
        burbuja.appendChild(
            document.createTextNode(mensaje.mensaje || "")
        );

        const hora = document.createElement("span");
        hora.className = "hora-mensaje";
        hora.textContent = formatearHora(mensaje.fecha_envio);

        burbuja.appendChild(hora);
        fila.append(nombre, burbuja);
        fragmento.appendChild(fila);
    }

    contenedorMensajes.replaceChildren(fragmento);

    if (estabaAbajo || primerRenderizado) {
        contenedorMensajes.scrollTop =
            contenedorMensajes.scrollHeight;
    }

    primerRenderizado = false;
}

async function cargarMensajes(silencioso = false) {
    if (cargandoMensajes || document.hidden) return;

    cargandoMensajes = true;

    try {
        const datos = await peticionAPI(
            `/mensajes/${idSolicitud}`
        );

        const lista = Array.isArray(datos.mensajes)
            ? datos.mensajes
            : [];

        mostrarMensajes(lista);

        ultimoIdMensaje = lista.length
            ? Number(lista[lista.length - 1].id_mensaje)
            : 0;

        ocultarAviso();
    } catch (error) {
        if (!silencioso) {
            mostrarAviso(error.message);
        }

        if (error.status === 401) {
            detenerActualizacion();
            botonEnviar.disabled = true;
            campoMensaje.disabled = true;
        }
    } finally {
        cargandoMensajes = false;
    }
}

async function enviarMensaje(evento) {
    evento.preventDefault();

    if (enviandoMensaje || solicitudCerrada) return;

    const mensaje = campoMensaje.value.trim();

    if (!mensaje) {
        mostrarAviso("Escribí un mensaje antes de enviarlo.");
        return;
    }

    if (mensaje.length > 2000) {
        mostrarAviso("El mensaje no puede superar los 2000 caracteres.");
        return;
    }

    enviandoMensaje = true;
    botonEnviar.disabled = true;
    ocultarAviso();

    try {
        await peticionAPI(`/mensajes/${idSolicitud}`, {
            method: "POST",
            body: JSON.stringify({ mensaje })
        });

        campoMensaje.value = "";
        campoMensaje.style.height = "auto";
        actualizarContador();

        await cargarMensajes(true);
    } catch (error) {
        mostrarAviso(error.message);

        if (error.status === 400 &&
            error.message.toLowerCase().includes("cerrada")) {
            bloquearChat(error.message);
        }
    } finally {
        enviandoMensaje = false;

        if (!solicitudCerrada) {
            botonEnviar.disabled = false;
            campoMensaje.focus();
        }
    }
}

function actualizarContador() {
    contador.textContent = `${campoMensaje.value.length} / 2000`;
}

function bloquearChat(mensaje) {
    solicitudCerrada = true;
    campoMensaje.disabled = true;
    botonEnviar.disabled = true;
    campoMensaje.placeholder = "Esta solicitud está cerrada.";
    mostrarAviso(mensaje);
    detenerActualizacion();
}

function detenerActualizacion() {
    if (temporizadorActualizacion) {
        clearInterval(temporizadorActualizacion);
        temporizadorActualizacion = null;
    }
}

async function iniciarChat() {
    if (!token) {
        mostrarAviso("Tu sesión no está activa. Iniciá sesión nuevamente.");
        contenedorMensajes.textContent = "Iniciá sesión para continuar.";

        campoMensaje.disabled = true;
        botonEnviar.disabled = true;
        return;
    }

    if (!Number.isSafeInteger(idSolicitud) || idSolicitud <= 0) {
        mostrarAviso("Falta un ID de solicitud válido en la dirección.");
        contenedorMensajes.textContent = "No se pudo abrir la conversación.";

        campoMensaje.disabled = true;
        botonEnviar.disabled = true;
        return;
    }

    try {
        const datosUsuario = await peticionAPI("/auth/me");
        const usuario = datosUsuario.usuario;

        idUsuario = Number(usuario?.id_usuario);

        if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
            throw new Error("No se pudo identificar tu usuario.");
        }

        document.getElementById("numero-solicitud").textContent =
            `#${idSolicitud}`;

        // El router de mensajes valida la participación antes de
        // devolver el historial o aceptar mensajes.
        await cargarMensajes();

        temporizadorActualizacion = setInterval(
            () => cargarMensajes(true),
            5000
        );
    } catch (error) {
        mostrarAviso(error.message);

        contenedorMensajes.textContent =
            "No se pudo cargar esta conversación.";

        campoMensaje.disabled = true;
        botonEnviar.disabled = true;
    }
}

formulario.addEventListener("submit", enviarMensaje);

campoMensaje.addEventListener("input", () => {
    actualizarContador();

    campoMensaje.style.height = "auto";
    campoMensaje.style.height =
        `${Math.min(campoMensaje.scrollHeight, 140)}px`;
});

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        cargarMensajes(true);
    }
});

window.addEventListener("beforeunload", detenerActualizacion);

iniciarChat();
