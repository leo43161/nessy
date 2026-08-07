import type { NextConfig } from "next";

/**
 * Carpeta del dominio donde se sirve la app: "/nessy" en producción.
 *
 * Sin esto, el HTML del export referencia los assets como `/_next/...`, o sea
 * desde la RAÍZ del dominio, y servido en una subcarpeta apunta al proyecto
 * equivocado: la página carga en blanco.
 *
 * Sale de una variable de entorno para que `npm run dev` siga en la raíz de
 * localhost.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath || undefined,
  // Sin esto Next sube por el árbol buscando lockfiles y termina eligiendo
  // el de C:\Users\Usuario como raíz del workspace.
  turbopack: { root: __dirname },

  // Export estático: `next build` deja HTML/CSS/JS en out/ y no queda ningún
  // proceso Node corriendo. Todo el backend es la API externa.
  //
  // Lo que esto prohíbe (y por eso el proyecto no usa nada de esto):
  // proxy.ts, route handlers, server actions, cookies()/headers(),
  // rewrites/redirects/headers de config, ISR y next/image con el loader
  // por defecto.
  output: "export",

  // El deploy es a Apache (cPanel), igual que la API. Con trailingSlash cada
  // ruta sale como `cobros/index.html`, que Apache sirve solo por
  // DirectoryIndex. Sin esto sale `cobros.html` y `/cobros` da 404.
  trailingSlash: true,
};

export default nextConfig;
