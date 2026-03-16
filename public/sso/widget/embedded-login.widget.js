(function () {
    // 2️⃣ Evita cargar el widget dos veces
    if (window.SSOWidget) return;

    const script = document.currentScript;
    const scriptSrc = script ? script.src : "";

    // Obtenemos la URL base del CDN dinámicamente
    const baseUrl = scriptSrc ? new URL(scriptSrc).origin : "https://cdn.bigso.co";

    // 1️⃣ Lee configuración del <script>
    const config = {
        appId: script?.dataset.appId || "",
        theme: script?.dataset.theme || "light"
    };

    // 3️⃣ Descarga CSS (opcional si usamos Shadow DOM completo, pero lo incluimos por patrón)
    function loadCSS() {
        if (document.querySelector(`link[href="${baseUrl}/sso/widget/embedded-login.widget.css"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `${baseUrl}/sso/widget/embedded-login.widget.css`;
        document.head.appendChild(link);
    }

    let overlay;
    let iframe;
    let host;

    function createOverlay() {
        // 4️⃣ Crea un Shadow DOM para aislar estilos
        host = document.createElement("div");
        host.id = "sso-widget-host";

        const shadow = host.attachShadow({ mode: "open" });

        // 5️⃣ Crea el overlay
        overlay = document.createElement("div");
        overlay.className = "sso-overlay";

        // Cerrar al hacer click fuera del iframe (en el overlay)
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) {
                close();
            }
        });

        // Estilos encapsulados para el Shadow DOM
        const style = document.createElement("style");
        style.textContent = `
            .sso-overlay {
                position: fixed;
                inset: 0;
                display: none;
                justify-content: center;
                align-items: center;
                background: rgba(0, 0, 0, 0.6);
                z-index: 999999;
                backdrop-filter: blur(4px);
                animation: fadeIn 0.2s ease;
            }
            .sso-frame {
                width: 370px;
                height: 350px;
                border: none;
                border-radius: 16px;
                background: var(--card-bg, #fff);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.3s ease;
            }
            @media (max-width: 480px) {
                .sso-frame {
                    width: 100%;
                    height: 100%;
                    border-radius: 0;
                }
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `;

        shadow.appendChild(style);
        shadow.appendChild(overlay);
        document.body.appendChild(host);
    }

    function init() {
        // loadCSS(); // Descomentar si requieres CSS global
        createOverlay();

        // 7️⃣ Comunicación iframe ↔ página
        window.addEventListener("message", (event) => {
            // Validar origen en un entorno real
            // if (event.origin !== "https://app.midominio.com") return;

            if (event.data?.type === "close-widget") {
                close();
            }

            if (event.data?.type === "sso-success") {
                console.log("SSO Autenticado exitosamente", event.data.payload);
                close();
                // Emitir evento para que el cliente (Ordamy, etc.) lo escuche
                window.dispatchEvent(new CustomEvent('sso-login-success', { detail: event.data.payload }));
            }
        });
    }

    function open() {
        if (!host) init();

        // 10️⃣ Carga lazy: el iframe se crea y carga solo al abrir
        if (!iframe) {
            iframe = document.createElement("iframe");
            iframe.className = "sso-frame";

            // 6️⃣ Carga el iframe pasando parámetros (aquí usarías la URL del SSO Frontend real)
            const ssoFrontendUrl = "http://localhost:4200/auth/sign-in";
            //const ssoFrontendUrl = "https://sso.bigso.co/auth/sign-in";
            iframe.src = `${ssoFrontendUrl}?appId=${config.appId}&theme=${config.theme}&embedded=true`;

            overlay.appendChild(iframe);
        }

        overlay.style.display = "flex";
    }

    function close() {
        if (overlay) {
            overlay.style.display = "none";
        }
    }

    window.SSOWidget = {
        init,
        open,
        close
    };

    // Inicializar contenedor base al cargar si se desea, 
    // pero evitamos cargar el iframe hasta que se llame a open()
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            // createOverlay(); // Pre-construir DOM oculto es opcional
        });
    }

})();
