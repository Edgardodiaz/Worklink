
const API_URL = "https://worklink-api-5i9m.onrender.com/api"
document.addEventListener("DOMContentLoaded", () => {
    const listaProfesionales = document.getElementById("lista-profesionales");
    const estadoProfesionales = document.getElementById("estado-profesionales");
    const formularioBusqueda = document.getElementById("form-busqueda");
    const campoBusqueda = document.getElementById("buscar-servicio");
    const campoZona = document.getElementById("buscar-zona");
    const botonCerrarSesion = document.getElementById("btn-cerrar-sesion");

    let profesionales = [];

    // Verificar que exista una sesión iniciada.
    const token = localStorage.getItem("worklink_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // Cargar profesionales desde el backend.
    async function cargarProfesionales(filtros = {}) {
        if (!listaProfesionales || !estadoProfesionales) return;

        estadoProfesionales.textContent = "Buscando profesionales...";
        listaProfesionales.replaceChildren();

        const parametros = new URLSearchParams();

        if (filtros.busqueda) {
            parametros.set("busqueda", filtros.busqueda);
        }

        if (filtros.municipio) {
            parametros.set("municipio", filtros.municipio);
        }

        const consulta = parametros.toString();
        const url = `${API_URL}/perfiles${consulta ? `?${consulta}` : ""}`;

        try {
            const respuesta = await fetch(url);

            if (!respuesta.ok) {
                throw new Error("No se pudieron cargar los profesionales.");
            }

            const datos = await respuesta.json();
            profesionales = Array.isArray(datos.perfiles)
                ? datos.perfiles
                : [];

            mostrarProfesionales(profesionales);
        } catch (error) {
            console.error(error);
            estadoProfesionales.textContent =
                "No pudimos conectar con los profesionales. Verificá que el servidor esté funcionando.";
        }
    }

    // Crear las tarjetas de profesionales.
    function mostrarProfesionales(lista) {
        listaProfesionales.replaceChildren();

        if (lista.length === 0) {
            estadoProfesionales.textContent =
                "No encontramos profesionales con esos criterios.";
            return;
        }

        estadoProfesionales.textContent =
            `${lista.length} profesional${lista.length !== 1 ? "es" : ""} disponible${lista.length !== 1 ? "s" : ""}`;

        lista.forEach((profesional) => {
            const tarjeta = document.createElement("article");
            tarjeta.className = "tarjeta-profesional";

            const nombre = [
                profesional.nombre,
                profesional.apellido
            ].filter(Boolean).join(" ");

            const titulo = document.createElement("h3");
            titulo.textContent =
                profesional.titulo_profesional || "Profesional";

            const nombreElemento = document.createElement("p");
            nombreElemento.className = "nombre-profesional";
            nombreElemento.textContent = nombre || "Nombre no disponible";

            const descripcion = document.createElement("p");
            descripcion.textContent =
                profesional.descripcion || "Sin descripción disponible.";

            const ubicacion = document.createElement("p");
            ubicacion.textContent = [
                profesional.municipio,
                profesional.departamento
            ].filter(Boolean).join(", ") || "Ubicación no especificada";

            const experiencia = document.createElement("p");
            const anios = Number(profesional.anios_experiencia) || 0;
            experiencia.textContent =
                `${anios} ${anios === 1 ? "año" : "años"} de experiencia`;

            const tarifa = document.createElement("p");

            if (
                profesional.tarifa_base !== null &&
                profesional.tarifa_base !== undefined &&
                profesional.tarifa_base !== ""
            ) {
                tarifa.textContent =
                    `Tarifa base: $${Number(profesional.tarifa_base).toFixed(2)}`;
            } else {
                tarifa.textContent = "Tarifa por consultar";
            }

            const boton = document.createElement("button");
            boton.type = "button";
            boton.className = "btn-ver-perfil";
            boton.textContent = "Ver perfil";

            boton.addEventListener("click", () => {
                window.location.href =
                    `perfil_profesional.html?id=${encodeURIComponent(profesional.id_perfil)}`;
            });

            tarjeta.append(
                titulo,
                nombreElemento,
                descripcion,
                ubicacion,
                experiencia,
                tarifa,
                boton
            );

            listaProfesionales.appendChild(tarjeta);
        });
    }

    // Buscar por oficio, nombre o ubicación.
    if (formularioBusqueda) {
        formularioBusqueda.addEventListener("submit", (evento) => {
            evento.preventDefault();

            cargarProfesionales({
                busqueda: campoBusqueda?.value.trim() || "",
                municipio: campoZona?.value.trim() || ""
            });
        });
    }

    // Filtrar al seleccionar una categoría.
    document.querySelectorAll("[data-categoria]").forEach((boton) => {
        boton.addEventListener("click", () => {
            const categoria = boton.dataset.categoria;

            if (campoBusqueda) {
                campoBusqueda.value = categoria;
            }

            cargarProfesionales({
                busqueda: categoria,
                municipio: campoZona?.value.trim() || ""
            });
        });
    });

    // Cerrar sesión.
    if (botonCerrarSesion) {
        botonCerrarSesion.addEventListener("click", () => {
            localStorage.removeItem("worklink_token");
            localStorage.removeItem("worklink_usuario");

            window.location.href = "login.html";
        });
    }

    // Mostrar todos los profesionales al abrir la página.
    cargarProfesionales();
});
