FROM public.ecr.aws/nginx/nginx:stable-alpine

# Eliminar configuración predeterminada de NGINX
RUN rm -rf /usr/share/nginx/html/*

# Copiar todo el contenido de la carpeta public al directorio de Nginx, manteniendo su estructura
COPY public/ /usr/share/nginx/html/

# Copiar configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Comando para ejecutar Nginx
CMD ["nginx", "-g", "daemon off;"]
