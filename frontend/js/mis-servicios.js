
const API_URL = "https://worklink-api-5i9m.onrender.com/api";

const formulario = document.getElementById("form-servicio");
const selectorCategoria = document.getElementById("id-categoria");
const selectorTipoPrecio = document.getElementById("tipo-precio");
const campoPrecio = document.getElementById("precio");
const ayudaPrecio = document.getElementById("ayuda-precio");
const botonGuardar = document.getElementById("btn-guardar");
const botonCancelar = document.getElementById("btn-cancelar");
const botonRecargar = document.getElementById("btn-recargar");
const listaServicios = document.getElementById("lista-servicios");

let serviciosActuales = [];

// Obtener el token guardado al iniciar sesión
function obtenerToken() {
    return localStorage.getItem("worklink_token");
}

// Peticiones autenticadas al backend
async function solicitarAPI(ruta, opciones = {}) {
    const token = obtenerToken();

    if (!token) {
        throw new Error("Tu sesión no está activa. Iniciá sesión nuevamente.");
    }

    const respuesta = await fetch(`${API_URL}${ruta}`, {
        ...opciones,
        headers: {
            ...(opciones.body ? { "Content-Type": "application/json" } : {}),
            Authorization: `Bearer ${token}`,
            ...(opciones.headers || {})
        }
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (respuesta.status === 401) {
        localStorage.removeItem("worklink_token");
        localStorage.removeItem("worklink_usuario");
        window.location.href = "login.html";
        throw new Error("Tu sesión expiró. Iniciá sesión nuevamente.");
    }

    if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo completar la operación.");
    }

    return datos;
}

// Mostrar mensajes de forma segura
function mostrarMensaje(id, texto, error = false) {
    const elemento = document.getElementById(id);

    if (!elemento) return;

    elemento.textContent = texto;
    elemento.style.color = error ? "#c0392b" : "#21865b";
}

// Cargar las categorías desde MySQL
async function cargarCategorias(categoriaSeleccionada = "") {
    selectorCategoria.innerHTML = "";

    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = "Seleccioná una categoría";
    selectorCategoria.appendChild(opcionInicial);

    try {
        const datos = await solicitarAPI("/servicios/categorias");

        for (const categoria of datos.categorias || []) {
            const opcion = document.createElement("option");
            opcion.value = categoria.id_categoria;
            opcion.textContent = categoria.nombre;

            if (String(categoria.id_categoria) === String(categoriaSeleccionada)) {
                opcion.selected = true;
            }

            selectorCategoria.appendChild(opcion);
        }

        if (!datos.categorias || datos.categorias.length === 0) {
            mostrarMensaje(
                "mensaje-formulario",
                "No hay categorías activas disponibles.",
                true
            );
        }
    } catch (error) {
        mostrarMensaje("mensaje-formulario", error.message, true);
    }
}

// Ajustar el campo de precio según la modalidad
function actualizarCampoPrecio() {
    const tipo = selectorTipoPrecio.value;

    if (tipo === "cotizacion") {
        campoPrecio.value = "";
        campoPrecio.disabled = true;
        campoPrecio.required = false;
        ayudaPrecio.textContent =
            "El cliente deberá solicitar una cotización.";
    } else {
        campoPrecio.disabled = false;
        campoPrecio.required = true;

        ayudaPrecio.textContent = tipo === "por_hora"
            ? "Indicá el precio por hora en dólares."
            : "Indicá el precio total del servicio en dólares.";
    }
}

// Reiniciar el formulario
function reiniciarFormulario() {
    formulario.reset();

    document.getElementById("id-servicio").value = "";
    document.getElementById("titulo-formulario").textContent =
        "Publicar un servicio";

    botonGuardar.textContent = "Publicar servicio";
    botonCancelar.hidden = true;

    actualizarCampoPrecio();
    mostrarMensaje("mensaje-formulario", "");
}

// Formatear precios
function formatearPrecio(precio) {
    return Number(precio).toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
}

function textoPrecio(servicio) {
    if (servicio.tipo_precio === "cotizacion") {
        return "Precio por cotización";
    }

    if (servicio.precio_desde === null || servicio.precio_desde === "") {
        return "Precio no especificado";
    }

    const precio = formatearPrecio(servicio.precio_desde);

    return servicio.tipo_precio === "por_hora"
        ? `${precio} por hora`
        : precio;
}

// Crear elementos de texto de forma segura
function crearElemento(tag, clase, texto) {
    const elemento = document.createElement(tag);

    if (clase) {
        elemento.className = clase;
    }

    if (texto !== undefined) {
        elemento.textContent = texto;
    }

    return elemento;
}

// Dibujar las tarjetas de servicios
function mostrarServicios(servicios) {
    listaServicios.replaceChildren();

    if (!servicios.length) {
        const vacio = crearElemento("div", "vacio");
        vacio.appendChild(
            crearElemento("h3", "", "Todavía no publicaste servicios")
        );
        vacio.appendChild(
            crearElemento(
                "p",
                "",
                "Completá el formulario para ofrecer tu primer servicio en Worklink."
            )
        );

        listaServicios.appendChild(vacio);
        return;
    }

    for (const servicio of servicios) {
        const tarjeta = crearElemento("article", "tarjeta-servicio");

        const detalles = crearElemento("div", "detalles-servicio");

        detalles.appendChild(
            crearElemento("span", "categoria-servicio", servicio.categoria)
        );

        detalles.appendChild(
            crearElemento(
                "span",
                `estado-servicio ${servicio.activo ? "estado-activo" : "estado-inactivo"}`,
                servicio.activo ? "Activo" : "Desactivado"
            )
        );

        tarjeta.appendChild(detalles);
        tarjeta.appendChild(crearElemento("h3", "", servicio.nombre));
        tarjeta.appendChild(
            crearElemento(
                "p",
                "",
                servicio.descripcion || "Sin descripción."
            )
        );
        tarjeta.appendChild(
            crearElemento("div", "precio-servicio", textoPrecio(servicio))
        );

        const acciones = crearElemento("div", "acciones-servicio");

        const botonEditar = crearElemento("button", "btn-accion btn-editar", "Editar");
        botonEditar.type = "button";
        botonEditar.addEventListener("click", () => editarServicio(servicio));

        acciones.appendChild(botonEditar);

        if (servicio.activo) {
            const botonDesactivar = crearElemento(
                "button",
                "btn-accion btn-desactivar",
                "Desactivar"
            );

            botonDesactivar.type = "button";
            botonDesactivar.addEventListener("click", () => desactivarServicio(servicio));

            acciones.appendChild(botonDesactivar);
        }

        tarjeta.appendChild(acciones);
        listaServicios.appendChild(tarjeta);
    }
}

// Consultar servicios propios
async function cargarServicios() {
    mostrarMensaje("mensaje-listado", "Cargando tus servicios...");

    botonRecargar.disabled = true;

    try {
        const datos = await solicitarAPI("/servicios/mis-servicios");

        serviciosActuales = datos.servicios || [];
        mostrarServicios(serviciosActuales);

        mostrarMensaje(
            "mensaje-listado",
            `Tenés ${serviciosActuales.length} servicio(s) registrado(s).`
        );
    } catch (error) {
        mostrarMensaje("mensaje-listado", error.message, true);
        listaServicios.replaceChildren();
    } finally {
        botonRecargar.disabled = false;
    }
}

// Preparar el formulario para editar
async function editarServicio(servicio) {
    if (!servicio.activo) {
        mostrarMensaje(
            "mensaje-formulario",
            "Este servicio está desactivado. No se puede editar desde aquí.",
            true
        );
        return;
    }

    formulario.elements.namedItem("nombre").value = servicio.nombre;
    document.getElementById("descripcion").value = servicio.descripcion || "";
    document.getElementById("id-servicio").value = servicio.id_servicio;
    selectorTipoPrecio.value = servicio.tipo_precio;

    await cargarCategorias(servicio.id_categoria);

    campoPrecio.value = servicio.precio_desde ?? "";

    document.getElementById("titulo-formulario").textContent =
        "Editar servicio";

    botonGuardar.textContent = "Guardar cambios";
    botonCancelar.hidden = false;

    actualizarCampoPrecio();

    document.getElementById("titulo-formulario").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    mostrarMensaje(
        "mensaje-formulario",
        "Editá los datos y guardá los cambios."
    );
}

// Publicar o actualizar
formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const idServicio = document.getElementById("id-servicio").value;
    const tipo = selectorTipoPrecio.value;

    const cuerpo = {
        nombre: document.getElementById("nombre").value.trim(),
        id_categoria: Number(selectorCategoria.value),
        descripcion: document.getElementById("descripcion").value.trim(),
        tipo_precio: tipo,
        precio_desde: tipo === "cotizacion"
            ? null
            : document.getElementById("precio").value
    };

    if (!cuerpo.nombre || !cuerpo.id_categoria) {
        mostrarMensaje(
            "mensaje-formulario",
            "Completá el nombre y seleccioná una categoría.",
            true
        );
        return;
    }

    if (
        tipo !== "cotizacion" &&
        (cuerpo.precio_desde === "" || Number(cuerpo.precio_desde) < 0)
    ) {
        mostrarMensaje(
            "mensaje-formulario",
            "Ingresá un precio válido.",
            true
        );
        return;
    }

    botonGuardar.disabled = true;
    botonGuardar.textContent = idServicio ? "Guardando..." : "Publicando...";

    try {
        const datos = await solicitarAPI(
            idServicio
                ? `/servicios/${encodeURIComponent(idServicio)}`
                : "/servicios",
            {
                method: idServicio ? "PUT" : "POST",
                body: JSON.stringify(cuerpo)
            }
        );

        mostrarMensaje("mensaje-formulario", datos.mensaje || "Operación completada.");
        reiniciarFormulario();

        await cargarServicios();
    } catch (error) {
        mostrarMensaje("mensaje-formulario", error.message, true);
    } finally {
        botonGuardar.disabled = false;
        botonGuardar.textContent = document.getElementById("id-servicio").value
            ? "Guardar cambios"
            : "Publicar servicio";
    }
});

// Desactivar un servicio
async function desactivarServicio(servicio) {
    const confirmar = window.confirm(
        `¿Querés desactivar el servicio "${servicio.nombre}"?`
    );

    if (!confirmar) return;

    try {
        const datos = await solicitarAPI(
            `/servicios/${encodeURIComponent(servicio.id_servicio)}`,
            { method: "DELETE" }
        );

        mostrarMensaje("mensaje-listado", datos.mensaje || "Servicio desactivado.");
        await cargarServicios();
    } catch (error) {
        mostrarMensaje("mensaje-listado", error.message, true);
    }
}

// Cerrar sesión
document.getElementById("btn-cerrar-sesion").addEventListener("click", () => {
    localStorage.removeItem("worklink_token");
    localStorage.removeItem("worklink_usuario");
    window.location.href = "login.html";
});

// Eventos
selectorTipoPrecio.addEventListener("change", actualizarCampoPrecio);

botonCancelar.addEventListener("click", reiniciarFormulario);

botonRecargar.addEventListener("click", cargarServicios);

// Inicialización
async function iniciarPagina() {
    if (!obtenerToken()) {
        window.location.href = "login.html";
        return;
    }

    actualizarCampoPrecio();

    await cargarCategorias();
    await cargarServicios();
}

iniciarPagina();
