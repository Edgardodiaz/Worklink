
const API_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", async () => {
    const estado = document.getElementById("estado-perfil");
    const contenido = document.getElementById("contenido-perfil");
    const errorPerfil = document.getElementById("error-perfil");
    const listaServicios = document.getElementById("lista-servicios");
    const estadoServicios = document.getElementById("estado-servicios");

    document.getElementById("btn-volver")?.addEventListener("click", () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = "inicio.html";
        }
    });

    const parametros = new URLSearchParams(window.location.search);
    const idPerfil = parametros.get("id");

    if (!idPerfil || !/^\d+$/.test(idPerfil) || Number(idPerfil) < 1) {
        mostrarError("El enlace no contiene un identificador válido.");
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_URL}/perfiles/${encodeURIComponent(idPerfil)}`
        );

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.perfil) {
            throw new Error(datos.mensaje || "No se encontró el perfil.");
        }

        mostrarPerfil(datos.perfil);
        mostrarServicios(Array.isArray(datos.servicios) ? datos.servicios : []);

        estado.hidden = true;
        contenido.hidden = false;
    } catch (error) {
        console.error("Error cargando perfil:", error);
        mostrarError(
            "No se pudo cargar el perfil. Revisá tu conexión e intentá de nuevo."
        );
    }

    function mostrarError(mensaje) {
        estado.textContent = mensaje;
        estado.hidden = false;
        contenido.hidden = true;
        errorPerfil.hidden = false;
    }

    function mostrarPerfil(perfil) {
        const nombreCompleto = [
            perfil.nombre,
            perfil.apellido
        ].filter(Boolean).join(" ");

        document.getElementById("nombre-profesional").textContent =
            nombreCompleto || "Profesional";

        document.getElementById("titulo-profesional").textContent =
            perfil.titulo_profesional || "Servicios profesionales";

        document.getElementById("descripcion-profesional").textContent =
            perfil.descripcion || "Este profesional aún no ha agregado una descripción.";

        document.getElementById("ubicacion-profesional").textContent = [
            perfil.municipio,
            perfil.departamento
        ].filter(Boolean).join(", ") || "Ubicación no especificada";

        const anios = Number(perfil.anios_experiencia) || 0;

        document.getElementById("experiencia-profesional").textContent =
            `${anios} ${anios === 1 ? "año" : "años"}`;

        const tarifa = document.getElementById("tarifa-profesional");

        if (
            perfil.tarifa_base !== null &&
            perfil.tarifa_base !== undefined &&
            perfil.tarifa_base !== ""
        ) {
            tarifa.textContent = `$${Number(perfil.tarifa_base).toFixed(2)}`;
        } else {
            tarifa.textContent = "Por consultar";
        }

        const iniciales = nombreCompleto
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((parte) => parte.charAt(0).toUpperCase())
            .join("");

        document.getElementById("avatar-profesional").textContent =
            iniciales || "W";

        const verificacion = document.getElementById("estado-verificacion");

        verificacion.textContent = Number(perfil.verificado) === 1
            ? "✓ Profesional verificado"
            : "";
    }


    function mostrarServicios(servicios) {
        listaServicios.replaceChildren();

        if (servicios.length === 0) {
            estadoServicios.textContent =
                "Este profesional todavía no ha publicado servicios.";
            return;
        }

        estadoServicios.textContent = "";

        servicios.forEach((servicio) => {
            const tarjeta = document.createElement("article");
            tarjeta.className = "tarjeta-servicio";

            const icono = document.createElement("div");
            icono.className = "icono-servicio";
            icono.textContent = "🔧";
            icono.setAttribute("aria-hidden", "true");

            const titulo = document.createElement("h3");
            titulo.textContent = servicio.nombre || "Servicio profesional";

            const categoria = document.createElement("p");
            categoria.className = "categoria-servicio";
            categoria.textContent = servicio.categoria || "Servicio";

            const descripcion = document.createElement("p");
            descripcion.textContent =
                servicio.descripcion || "Sin descripción disponible.";

            const precio = document.createElement("p");
            precio.className = "precio-servicio";

            if (
                servicio.precio_desde !== null &&
                servicio.precio_desde !== undefined &&
                servicio.precio_desde !== ""
            ) {
                const cantidad = Number(servicio.precio_desde);
                const tipo = servicio.tipo_precio
                    ? ` · ${servicio.tipo_precio}`
                    : "";

                precio.textContent = Number.isFinite(cantidad)
                    ? `Desde $${cantidad.toFixed(2)}${tipo}`
                    : "Precio por consultar";
            } else {
                precio.textContent = "Precio por consultar";
            }

            const botonSolicitar = document.createElement("button");
            botonSolicitar.type = "button";
            botonSolicitar.className = "btn-principal";
            botonSolicitar.textContent = "Solicitar este servicio";

            botonSolicitar.addEventListener("click", () => {
                const formulario = document.getElementById("formulario-solicitud");
                const campoId = document.getElementById("solicitud-id-servicio");
                const mensaje = document.getElementById("mensaje-solicitud");

                campoId.value = servicio.id_servicio;
                mensaje.textContent = "";
                formulario.hidden = false;

                formulario.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            });

            tarjeta.append(
                icono,
                titulo,
                categoria,
                descripcion,
                precio,
                botonSolicitar
            );

            listaServicios.appendChild(tarjeta);
        });
    }
    
    // Enviar la solicitud al backend.
    const formularioSolicitud = document.getElementById("form-solicitud");
    const mensajeSolicitud = document.getElementById("mensaje-solicitud");
    const botonEnviar = document.getElementById("btn-enviar-solicitud");

    document.getElementById("btn-cancelar-solicitud")
        ?.addEventListener("click", () => {
            document.getElementById("formulario-solicitud").hidden = true;
        });

    formularioSolicitud?.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const token = localStorage.getItem("worklink_token");

        if (!token) {
            window.location.href = "login.html";
            return;
        }

        const presupuestoTexto =
            document.getElementById("solicitud-presupuesto").value.trim();

        const fechaTexto =
            document.getElementById("solicitud-fecha").value;

        const datosSolicitud = {
            id_servicio: Number(
                document.getElementById("solicitud-id-servicio").value
            ),
            descripcion_problema:
                document.getElementById("solicitud-descripcion").value.trim(),
            departamento:
                document.getElementById("solicitud-departamento").value.trim(),
            municipio:
                document.getElementById("solicitud-municipio").value.trim(),
            direccion:
                document.getElementById("solicitud-direccion").value.trim(),
            fecha_preferida: fechaTexto
                ? fechaTexto.replace("T", " ") + ":00"
                : null,
            presupuesto: presupuestoTexto === ""
                ? null
                : Number(presupuestoTexto)
        };

        mensajeSolicitud.textContent = "Enviando solicitud...";
        botonEnviar.disabled = true;

        try {
            const respuesta = await fetch(`${API_URL}/solicitudes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(datosSolicitud)
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    resultado.mensaje || "No se pudo enviar la solicitud."
                );
            }

            mensajeSolicitud.textContent =
                `¡Solicitud enviada correctamente! Número: ${resultado.id_solicitud}. Estado: ${resultado.estado}.`;

            formularioSolicitud.reset();
            document.getElementById("formulario-solicitud").hidden = false;

        } catch (error) {
            console.error("Error enviando solicitud:", error);
            mensajeSolicitud.textContent = error.message;
        } finally {
            botonEnviar.disabled = false;
        }
    });

});
