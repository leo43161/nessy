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
npm run dev      # puerto 5151, para poder correr junto a nessy-admin (5252)
npm run check    # chequea services/mapear.ts y lib/status.ts
```

**Un solo backend: la API real.** El mock que había se borró — no existe `services/mock/`
ni se lee `USE_MOCK`.

`.env.local`:

```env
NEXT_PUBLIC_API_URL=https://tucucompras.com.ar/fv1
```

> Sin sufijo `/api`: `api` es un controlador más de la API, por eso el ping es `/api/ping`.

### `basePath` — obligatorio para el build de producción

La app se despliega a `/public_html/nessy/`, así que necesita
`NEXT_PUBLIC_BASE_PATH=/nessy` al buildear. **Sin eso el HTML pide los assets a la raíz del
dominio y la página carga en blanco.** Como queda en el mismo origen que la API, en
producción no hay CORS de por medio.

### Nombres de la base ↔ nombres de la app

`services/mapear.ts` es el **único** lugar donde conviven las dos convenciones
(`Nombre_completo` ↔ `nombreCompleto`). Tiene su chequeo en `npm run check`.

## Autenticación

- Login con JWT: el token se guarda en **cookie** (la lee `proxy.ts` para proteger rutas) y en **localStorage** (lo adjunta axios como `Authorization: Bearer`).
- Si el token expira o la API devuelve `401`, la sesión se limpia y se vuelve a `/login`.

## Estructura

```
app/
  login/            Pantalla de login
  (app)/            Shell autenticado (navbar + tabs)
    cobros/         Cobros del día: ranking, filtros, registro 1-click, estado de cuenta
    clientes/       Clientes: datos, estado de cuenta, referentes, notas
    notas/          Notas por cliente (crear / editar / eliminar)
    estadisticas/   Ranking de cobradores + desempeño personal + numerales
components/
  ui/               shadcn/ui
  cobros|clientes|notas|layout|shared|providers/
services/           Capa de API (axios) + mapear.ts (traducción de nombres)
store/              Redux Toolkit (auth, ui, cobros, clientes, notas, estadisticas)
types/              Modelos de datos (alineados al dump de a0101073_finanz1)
lib/                Helpers (formato, sesión, estados, estado de cuenta, geo, PDF)
proxy.ts            Guard de rutas por cookie de sesión
```

## Modelo de datos

Los tipos en `types/index.ts` reflejan el esquema real de la DB
(`sql/a0101073_finanz1.sql`): Clientes, Referentes, Cobradores (persona base), Telefonos
(polimórfica, N por entidad), Localidades, Cuenta/Roles, Cuenta_Corriente → Plan_de_pagos →
Pagos_por_realizar / Pagos_realizados, Notas y Advertencias_y_retrasos.

- **Estados de cuota:** solo `Pendiente`, `Pagado` y `Atrasado` — los de la base (decisión
  N.4). El "Vencido" **no se guarda**: se deriva de un pendiente con fecha pasada
  (`esVencido()` en `lib/status.ts`).
  `Incomunicado` es una **advertencia** (`POST /advertencias`), no un estado de cuota;
  `Adelanto` y `Recargo` se deducen del cobro y de las advertencias.
- **`Dentro_Rango` es geográfico**, no tiene que ver con quién cobró: los SP de cobro lo
  marcan en 1 si el cobro se hizo a **≤ 2 km del domicilio del cliente**. Por eso la app
  manda `lat`/`lon` (`lib/geo.ts`). Si el navegador niega la ubicación el cobro **se
  registra igual**, con `Dentro_Rango = 0` y `sin_ubicacion: true` en la respuesta.
- **Cobro parcial y método de pago** son casos reales: el registro pide monto y
  `id_metodo_de_pago`, y si el monto es menor al esperado la API llama a `sp_PagoParcial`,
  que crea una cuota nueva por la diferencia.

## Funcionalidades de la vista Cobrador

- **Cobros del día:** banner de ranking/desempeño (rojo si es el último), filtros por
  localidad + buscador + "ver todos los cobradores" (modo asistencia), registro del cobro
  (monto + método de pago, con la ubicación adjunta) y envío del estado de cuenta al cliente
  (WhatsApp / copiar / imprimir / PDF).
- **Clientes:** datos personales, estado de cuenta, WhatsApp multi-teléfono (elige el número),
  referentes (cards), notas (crear / editar / eliminar).
- **Estadísticas:** ranking de cobradores (efectividad + dinero), desempeño personal
  (efectividad, completitud, asistencias 6 meses) y numerales (promedio diario, dinero perdido).

## Notas de diseño

- La **fecha de trabajo** se elige desde el header del tab Cobros (botón "Cambiar") y persiste entre sesiones.
- El **estado de cuenta** se genera en `lib/estado-cuenta.ts` y se comparte como texto (WhatsApp / copiar / imprimir) o como PDF (`lib/pdf/estado-cuenta-pdf.tsx`).
