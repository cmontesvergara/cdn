(function () {
    // 2️⃣ Evita cargar el widget dos veces
    if (window.SSOWidget) return;

    const script = document.currentScript;
    const scriptSrc = script ? script.src : "";

    // Obtenemos la URL base del CDN dinámicamente
    const cdnBaseUrl = scriptSrc ? new URL(scriptSrc).origin : "https://cdn.bigso.co";

    // 1️⃣ Lee configuración del <script>
    const config = {
        appId: script?.dataset.appId || "",
        theme: script?.dataset.theme || "light",
        callbackUrl: script?.dataset.callbackUrl || "/auth/callback"
    };

    // 3️⃣ Descarga CSS (opcional si usamos Shadow DOM completo, pero lo incluimos por patrón)
    function loadCSS() {
        if (document.querySelector(`link[href="${cdnBaseUrl}/sso/widget/embedded-login.widget.css"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `${cdnBaseUrl}/sso/widget/embedded-login.widget.css`;
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

        // Botón de cerrar visible al cubrir la pantalla
        const closeBtn = document.createElement("button");
        closeBtn.className = "sso-close-btn";
        closeBtn.innerHTML = "&times;";
        closeBtn.setAttribute("aria-label", "Cerrar modal");
        closeBtn.addEventListener("click", () => close());
        overlay.appendChild(closeBtn);

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
            @media (max-width: 480px), (max-height: 480px) {
                .sso-frame {
                    width: 100%;
                    height: 100%;
                    border-radius: 0;
                }
            }
            .sso-close-btn {
                position: absolute;
                top: 12px;
                right: 12px;
                width: 32px;
                height: 32px;
                background: rgba(0, 0, 0, 0.4);
                color: white;
                border: none;
                border-radius: 50%;
                font-size: 24px;
                line-height: 1;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000000;
                transition: background 0.2s;
            }
            .sso-close-btn:hover {
                background: rgba(0, 0, 0, 0.8);
            }
            .sso-overlay.sso-closing {
                animation: fadeOut 0.2s ease forwards;
            }
            .sso-overlay.sso-closing .sso-frame {
                animation: slideDown 0.2s ease forwards;
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes slideDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(20px); opacity: 0; } }
        `;

        shadow.appendChild(style);
        shadow.appendChild(overlay);
        document.body.appendChild(host);
    }

    function init() {
        // loadCSS(); // Descomentar si requieres CSS global
        createOverlay();

        // 7️⃣ Comunicación segura iframe ↔ página (Estándar v1.0)
        window.addEventListener("message", (event) => {
            // Validar origen en un entorno real. Aquí deberías validar que event.origin 
            // sea exactamente la URL del SSO configurada.
            const ssoOrigin = new URL('https://sso.bigso.co').origin;
            // Para desarrollo local se puede ajustar, pero en prod debe ser estricto
            if (event.origin !== ssoOrigin && event.origin !== "http://localhost:4200") return;

            // Validaciones estructurales del estándar
            const data = event.data;
            if (!data || typeof data !== "object") return;
            if (data.v !== "1.0" || data.source !== "@bigso/sso-iframe") return;

            switch (data.type) {
                case "sso-close":
                    close();
                    break;
                case "sso-success":
                    // El SSO pasa el authorization code (base64)
                    const codeBase64 = data.payload?.codeBase64 || "";
                    console.log("[SSO Widget] Código de autorización recibido (Base64)");
                    
                    if (codeBase64) {
                        try {
                            const authCode = atob(codeBase64);
                            const callbackPath = config.callbackUrl || "/auth/callback";
                            console.log(`[SSO Widget] Redirigiendo a callback interno con code: ${authCode}`);
                            window.location.href = `${callbackPath}?code=${authCode}`;
                        } catch (e) {
                            console.error("[SSO Widget] Error decodificando el authorization code", e);
                        }
                    }

                    close();
                    break;
                case "sso-ready":
                    console.log("[SSO Widget] Iframe cargado y listo");
                    break;
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
            //const ssoFrontendUrl = "http://localhost:4200/auth/sign-in";
            const ssoFrontendUrl = "https://sso.bigso.co/auth/sign-in";
            const currentUrl = encodeURIComponent(window.location.href);
            iframe.src = `${ssoFrontendUrl}?app_id=${config.appId}&theme=${config.theme}&embedded=true&redirect_uri=${currentUrl}`;

            overlay.appendChild(iframe);
        }

        overlay.style.display = "flex";
    }

    function close() {
        if (overlay && overlay.style.display !== "none") {
            overlay.classList.add("sso-closing");
            
            // Esperamos a que la animación de fadeOut termine (200ms)
            setTimeout(() => {
                overlay.style.display = "none";
                overlay.classList.remove("sso-closing");
            }, 200);
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
