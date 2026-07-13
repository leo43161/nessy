# GestorCobros — App del Cobrador

Sistema de cobro de financiación: informa al cobrador a quién, cuánto y dónde cobrar cada día, permite registrar cobros/cargos/pagos, notificar demoras por WhatsApp, tomar notas por cliente y ver el estado del día en un dashboard.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Redux Toolkit** para estado global (`store/`)
- **shadcn/ui** + Tailwind CSS v4 para UI (tema claro/oscuro, oscuro por defecto)
- **axios** para el consumo de API (`services/api.ts`)

## Correr el proyecto

```bash
npm install
npm run dev
```

Mientras la API está en desarrollo, la app usa un **backend mock** (`services/mock/db.ts`) que genera datos de demo relativos al día actual y los persiste en `localStorage`.

**Usuarios de demo:** `marcos`, `luis` o `diego` — cualquier contraseña.

## Conectar la API real

1. Crear `.env.local`:

   ```env
   NEXT_PUBLIC_API_URL=https://api.tudominio.com
   NEXT_PUBLIC_USE_MOCK=false
   ```

2. Los contratos de datos esperados están en `types/index.ts` y los endpoints que consume cada servicio en `services/*.service.ts` (rama no-mock de cada función).

## Autenticación

- Login con JWT: el token se guarda en **cookie** (la lee `proxy.ts` para proteger rutas) y en **localStorage** (lo adjunta axios como `Authorization: Bearer`).
- Si el token expira o la API devuelve `401`, la sesión se limpia y se vuelve a `/login`.

## Estructura

```
app/
  login/            Pantalla de login
  (app)/            Shell autenticado (navbar + tabs)
    cobros/         Cobros del día: resumen, filtros, detalle, estados
    clientes/       Clientes del cobrador: balance, cargos, pagos, alta
    notas/          Notas por cliente
    estadisticas/   Dashboard del día
components/
  ui/               shadcn/ui
  cobros|clientes|notas|layout|shared|providers/
services/           Capa de API (axios) + backend mock
store/              Redux Toolkit (auth, ui, cobros, clientes, notas)
types/              Modelos de datos
lib/                Helpers (formato, sesión, estados, constantes)
proxy.ts            Guard de rutas por cookie de sesión
```

## Notas de diseño

- La **fecha de trabajo** se elige desde el header del tab Cobros (botón "Cambiar") y persiste entre sesiones.
- Los modales de balance/cargo/pago/nota se comparten entre Cobros y Clientes (`hooks/use-cliente-flow.tsx`).
