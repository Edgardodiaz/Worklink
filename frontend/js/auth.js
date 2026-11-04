
const API_URL = "https://worklink-api-5i9m.onrender.com/api";

// Elementos de los formularios
const formularioLogin = document.getElementById("form-login");
const formularioRegistro = document.getElementById("form-registro");

// Mostrar mensajes sin insertar HTML proporcionado por la API
function mostrarMensaje(id, mensaje, error = false) {
    const elemento = document.getElementById(id);

    if (!elemento) return;

    elemento.textContent = mensaje;
    elemento.style.color = error ? "#c0392b" : "#21865b";
}

// Enviar peticiones a la API
async function solicitarAPI(ruta, opciones = {}) {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
        ...opciones,
        headers: {
            "Content-Type": "application/json",
            ...(opciones.headers || {})
        }
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo completar la operación.");
    }

    return datos;
}

// REGISTRO
if (formularioRegistro) {
    formularioRegistro.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const boton = formularioRegistro.querySelector(
            'button[type="submit"]'
        );

        const nombreCompleto = document
            .getElementById("registro-nombre")
            .value.trim();

        const correo = document
            .getElementById("registro-correo")
            .value.trim();

        const contrasena = document
            .getElementById("registro-clave")
            .value;

        const tipoCuenta = document
            .getElementById("registro-rol")
            .value;

        const partesNombre = nombreCompleto.split(/\s+/).filter(Boolean);

        if (partesNombre.length < 2) {
            mostrarMensaje(
                "registro-mensaje",
                "Ingresá tu nombre y al menos un apellido.",
                true
            );
            return;
        }

        if (contrasena.length < 8 || contrasena.length > 72) {
            mostrarMensaje(
                "registro-mensaje",
                "La contraseña debe tener entre 8 y 72 caracteres.",
                true
            );
            return;
        }

        if (!tipoCuenta) {
            mostrarMensaje(
                "registro-mensaje",
                "Seleccioná cómo querés usar Worklink.",
                true
            );
            return;
        }

        boton.disabled = true;
        boton.textContent = "Creando cuenta...";

        mostrarMensaje("registro-mensaje", "");

        try {
            const datos = await solicitarAPI("/usuarios", {
                method: "POST",
                body: JSON.stringify({
                    nombre: partesNombre[0],
                    apellido: partesNombre.slice(1).join(" "),
                    correo,
                    contrasena,
                    tipo_cuenta: tipoCuenta
                })
            });

            mostrarMensaje(
                "registro-mensaje",
                datos.mensaje + " Ahora podés iniciar sesión."
            );

            formularioRegistro.reset();

            // Mantener el rol seleccionado desde el enlace, si corresponde
            const rolURL = new URLSearchParams(
                window.location.search
            ).get("rol");

            if (["cliente", "profesional", "ambos"].includes(rolURL)) {
                document.getElementById("registro-rol").value = rolURL;
            }

            // Dar tiempo para leer el mensaje antes de abrir el login
            window.setTimeout(() => {
                window.location.href = "../page/login.html";
            }, 1200);

        } catch (error) {
            mostrarMensaje(
                "registro-mensaje",
                error.message,
                true
            );
        } finally {
            boton.disabled = false;
            boton.textContent = "Crear mi cuenta";
        }
    });
}

// INICIO DE SESIÓN
if (formularioLogin) {
    formularioLogin.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const boton = formularioLogin.querySelector(
            'button[type="submit"]'
        );

        const correo = document
            .getElementById("login-correo")
            .value.trim();

        const contrasena = document
            .getElementById("login-clave")
            .value;

        boton.disabled = true;
        boton.textContent = "Ingresando...";

        mostrarMensaje("login-mensaje", "");

        try {
            const datos = await solicitarAPI("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    correo,
                    contrasena
                })
            });

            // Guardar la sesión para utilizarla en las siguientes páginas
            localStorage.setItem("worklink_token", datos.token);
            localStorage.setItem(
                "worklink_usuario",
                JSON.stringify(datos.usuario)
            );

            mostrarMensaje(
                "login-mensaje",
                `¡Bienvenido, ${datos.usuario.nombre}! Sesión iniciada.`
            );

            // Por ahora, volveremos a la presentación.
            // Más adelante crearemos la página principal privada.
            window.setTimeout(() => {
                window.location.href = "inicio.html";
            }, 1000);

        } catch (error) {
            mostrarMensaje(
                "login-mensaje",
                error.message,
                true
            );
        } finally {
            boton.disabled = false;
            boton.textContent = "Ingresar a mi cuenta";
        }
    });
}
