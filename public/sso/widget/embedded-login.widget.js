/*
 * overlay.js
 * Script para montar la funcionalidad de CDN en el frontend
 */

console.log("Overlay JS cargado desde el CDN");

// Ejemplo de funcionalidad:
class CustomOverlay {
    constructor(config) {
        this.config = config || {};
    }

    init() {
        console.log("Inicializando Overlay...", this.config);
        // Lógica del script aquí
    }
}

window.CustomOverlay = CustomOverlay;
