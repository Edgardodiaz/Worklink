
/* =========================================
   WORKLINK | GESTOR DE TEMAS
   ========================================= */

(() => {
    const CLAVE_TEMA = "worklink_tema";

    function aplicarTema(tema) {
        const temaValido = tema === "oscuro" ? "oscuro" : "claro";

        document.documentElement.setAttribute("data-tema", temaValido);

        const boton = document.getElementById("boton-tema");

        if (boton) {
            const oscuro = temaValido === "oscuro";

            boton.textContent = oscuro ? "☀️ Modo claro" : "🌙 Modo oscuro";
            boton.setAttribute(
                "aria-label",
                oscuro ? "Activar modo claro" : "Activar modo oscuro"
            );
            boton.setAttribute("aria-pressed", String(oscuro));
        }
    }

    function iniciarTema() {
        let temaGuardado = "claro";

        try {
            temaGuardado = localStorage.getItem(CLAVE_TEMA) || "claro";
        } catch (error) {
            console.warn("No se pudo leer la preferencia del tema.");
        }

        aplicarTema(temaGuardado);

        // Crear el botón compartido automáticamente.
        if (!document.getElementById("boton-tema")) {
            const boton = document.createElement("button");

            boton.id = "boton-tema";
            boton.type = "button";
            boton.textContent = "🌙 Modo oscuro";
            boton.title = "Cambiar apariencia";

            boton.addEventListener("click", () => {
                const temaActual =
                    document.documentElement.getAttribute("data-tema");

                const nuevoTema =
                    temaActual === "oscuro" ? "claro" : "oscuro";

                aplicarTema(nuevoTema);

                try {
                    localStorage.setItem(CLAVE_TEMA, nuevoTema);
                } catch (error) {
                    console.warn("No se pudo guardar la preferencia del tema.");
                }
            });

            document.body.appendChild(boton);
            aplicarTema(temaGuardado);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciarTema);
    } else {
        iniciarTema();
    }
})();
