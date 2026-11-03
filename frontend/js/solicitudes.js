
const API_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("worklink_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const lista = document.getElementById("lista-solicitudes");
    const mensaje = document.getElementById("mensaje-general");
    const estadoVacio = document.getElementById("estado-vacio");

    let solicitudes = [];
    let filtroActual = "todas";
    let idUsuario = null;
    let rolUsuario = null;

    document.getElementById("btn-cerrar-sesion")
        ?.addEventListener("click", () => {
            localStorage.removeItem("worklink_token");
            localStorage.removeItem("worklink_usuario");
            window.location.href = "login.html";
        });

    // Leer el usuario guardado al iniciar sesión.
    try {
        const usuario = JSON.parse(
            localStorage.getItem("worklink_usuario") || "null"
        );

        idUsuario = usuario?.id_usuario ?? usuario?.id ?? null;
        rolUsuario = usuario?.tipo_cuenta ?? usuario?.rol ?? null;
    } catch {
        console.warn("No se pudo leer el usuario guardado.");
    }

    document.querySelectorAll("[data-filtro]").forEach((boton) => {
        boton.addEventListener("click", () => {
            filtroActual = boton.dataset.filtro;

            document.querySelectorAll("[data-filtro]").forEach((pestana) => {
                pestana.classList.toggle("activa", pestana === boton);
            });

            mostrarSolicitudes();
        });
    });

    async function cargarSolicitudes() {
        mensaje.textContent = "Cargando solicitudes...";
        lista.replaceChildren();
        estadoVacio.hidden = true;

        try {
            const respuesta = await fetch(
                `${API_URL}/solicitudes/mis-solicitudes`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.mensaje || "No se pudieron cargar las solicitudes."
                );
            }

            solicitudes = Array.isArray(datos.solicitudes)
                ? datos.solicitudes
                : [];

            mensaje.textContent = solicitudes.length
                ? `${solicitudes.length} solicitud${solicitudes.length !== 1 ? "es" : ""} encontrada${solicitudes.length !== 1 ? "s" : ""}.`
                : "";

            mostrarSolicitudes();
        } catch (error) {
            console.error(error);
            mensaje.textContent = error.message;
        }
    }

    function mostrarSolicitudes() {
        lista.replaceChildren();

        const visibles = solicitudes.filter((solicitud) => {
            const esCliente = idUsuario !== null &&
                Number(solicitud.id_cliente) === Number(idUsuario);

            const esProfesional = idUsuario !== null &&
                Number(solicitud.id_profesional) === Number(idUsuario);

            if (filtroActual === "enviadas") return esCliente;
            if (filtroActual === "recibidas") return esProfesional;

            // Si el usuario guardado no permite identificar su ID,
            // se muestran todas las solicitudes devueltas por el backend.
            return idUsuario === null || esCliente || esProfesional;
        });

        estadoVacio.hidden = visibles.length !== 0;

        if (visibles.length === 0) {
            if (solicitudes.length > 0 && filtroActual !== "todas") {
                estadoVacio.querySelector("h2").textContent =
                    "No hay solicitudes en esta sección";
                estadoVacio.querySelector("p").textContent =
                    "Probá otra pestaña para consultar tus solicitudes.";
            } else {
                estadoVacio.querySelector("h2").textContent =
                    "No hay solicitudes para mostrar";
                estadoVacio.querySelector("p").textContent =
                    "Cuando solicités o recibás un servicio, aparecerá aquí.";
            }
            return;
        }

        visibles.forEach((solicitud) => {
            lista.appendChild(crearTarjeta(solicitud));
        });
    }


    function crearTarjeta(solicitud) {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta-solicitud";

        const esCliente = idUsuario !== null &&
            Number(solicitud.id_cliente) === Number(idUsuario);

        const esProfesional = idUsuario !== null &&
            Number(solicitud.id_profesional) === Number(idUsuario);

        const encabezado = document.createElement("div");
        encabezado.className = "encabezado-tarjeta";

        const tituloGrupo = document.createElement("div");
        const titulo = document.createElement("h2");
        titulo.textContent = solicitud.nombre_servicio || "Servicio solicitado";

        const numero = document.createElement("span");
        numero.className = "numero-solicitud";
        numero.textContent = `Solicitud #${solicitud.id_solicitud}`;

        tituloGrupo.append(titulo, numero);

        const estado = document.createElement("span");
        estado.className = `estado estado-${solicitud.estado || "pendiente"}`;
        estado.textContent = traducirEstado(solicitud.estado);

        encabezado.append(tituloGrupo, estado);

        const detalles = document.createElement("div");
        detalles.className = "detalles-solicitud";

        agregarDetalle(
            detalles,
            esCliente ? "Profesional" : "Cliente",
            esCliente
                ? `${solicitud.nombre_profesional || ""} ${solicitud.apellido_profesional || ""}`.trim()
                : `${solicitud.nombre_cliente || ""} ${solicitud.apellido_cliente || ""}`.trim()
        );

        agregarDetalle(
            detalles,
            "Ubicación",
            [solicitud.municipio, solicitud.departamento]
                .filter(Boolean).join(", ") || "No especificada"
        );

        agregarDetalle(
            detalles,
            "Fecha preferida",
            formatearFecha(solicitud.fecha_preferida)
        );

        agregarDetalle(
            detalles,
            "Presupuesto",
            solicitud.presupuesto !== null &&
            solicitud.presupuesto !== undefined
                ? `$${Number(solicitud.presupuesto).toFixed(2)}`
                : "No especificado"
        );

        agregarDetalle(
            detalles,
            "Fecha de solicitud",
            formatearFecha(solicitud.fecha_solicitud)
        );

        const descripcion = document.createElement("p");
        descripcion.className = "descripcion-solicitud";
        descripcion.textContent =
            solicitud.descripcion_problema || "Sin descripción.";

        tarjeta.append(encabezado, detalles, descripcion);

        const acciones = document.createElement("div");
        acciones.className = "acciones-solicitud";

        // Abrir conversación entre el cliente y el profesional
        if (esCliente || esProfesional) {
            agregarAccion(
                acciones,
                "💬 Abrir chat",
                "btn-chat",
                () => {
                    window.location.href =
                        `chat.html?id=${encodeURIComponent(solicitud.id_solicitud)}`;
                }
            );
        }

        // Acciones del profesional: aceptar o rechazar
        if (
            esProfesional &&
            ["profesional", "ambos"].includes(rolUsuario) &&
            solicitud.estado === "pendiente"
        ) {
            agregarAccion(
                acciones,
                "Aceptar solicitud",
                "btn-aceptar",
                () => actualizarEstado(solicitud.id_solicitud, "aceptada")
            );

            agregarAccion(
                acciones,
                "Rechazar",
                "btn-rechazar",
                () => actualizarEstado(solicitud.id_solicitud, "rechazada")
            );
        }

        // Iniciar trabajo
        if (
            esProfesional &&
            ["profesional", "ambos"].includes(rolUsuario) &&
            solicitud.estado === "aceptada"
        ) {
            agregarAccion(
                acciones,
                "Iniciar trabajo",
                "btn-aceptar",
                () => actualizarEstado(solicitud.id_solicitud, "en_proceso")
            );
        }

        // Marcar trabajo como completado
        if (
            esProfesional &&
            ["profesional", "ambos"].includes(rolUsuario) &&
            solicitud.estado === "en_proceso"
        ) {
            agregarAccion(
                acciones,
                "Marcar como completada",
                "btn-aceptar",
                () => actualizarEstado(solicitud.id_solicitud, "completada")
            );
        }

        // Cancelar solicitud
        if (
            esCliente &&
            ["cliente", "ambos"].includes(rolUsuario) &&
            ["pendiente", "aceptada"].includes(solicitud.estado)
        ) {
            agregarAccion(
                acciones,
                "Cancelar solicitud",
                "btn-cancelar",
                () => actualizarEstado(solicitud.id_solicitud, "cancelada")
            );
        }

        if (acciones.children.length > 0) {
            tarjeta.appendChild(acciones);
        }

        return tarjeta;
    }
    function agregarDetalle(contenedor, etiqueta, valor) {
        const bloque = document.createElement("div");
        bloque.className = "detalle";

        const titulo = document.createElement("span");
        titulo.textContent = etiqueta;

        const contenido = document.createElement("strong");
        contenido.textContent = valor || "No disponible";

        bloque.append(titulo, contenido);
        contenedor.appendChild(bloque);
    }

    function agregarAccion(contenedor, texto, clase, accion) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = `btn-accion ${clase}`;
        boton.textContent = texto;
        boton.addEventListener("click", accion);
        contenedor.appendChild(boton);
    }

    function traducirEstado(estado) {
        const nombres = {
            pendiente: "Pendiente",
            aceptada: "Aceptada",
            rechazada: "Rechazada",
            en_proceso: "En proceso",
            completada: "Completada",
            cancelada: "Cancelada"
        };

        return nombres[estado] || "Sin estado";
    }

    function formatearFecha(fecha) {
        if (!fecha) return "No especificada";

        const valor = String(fecha);
        const normalizada = valor.includes("T")
            ? valor
            : valor.replace(" ", "T");

        const fechaObj = new Date(normalizada);

        if (Number.isNaN(fechaObj.getTime())) return valor;

        return new Intl.DateTimeFormat("es-SV", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(fechaObj);
    }

    async function actualizarEstado(id, nuevoEstado) {
        const confirmaciones = {
            rechazada: "¿Seguro que querés rechazar esta solicitud?",
            cancelada: "¿Seguro que querés cancelar esta solicitud?",
            completada: "¿Confirmás que el trabajo fue completado?"
        };

        if (
            confirmaciones[nuevoEstado] &&
            !window.confirm(confirmaciones[nuevoEstado])
        ) {
            return;
        }

        try {
            const respuesta = await fetch(
                `${API_URL}/solicitudes/${id}/estado`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ estado: nuevoEstado })
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.mensaje || "No se pudo actualizar la solicitud."
                );
            }

            mensaje.textContent = datos.mensaje ||
                "Estado actualizado correctamente.";

            await cargarSolicitudes();
        } catch (error) {
            console.error(error);
            mensaje.textContent = error.message;
        }
    }

    cargarSolicitudes();
});
