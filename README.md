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
    cobros/         Cobros del día: ranking, filtros, registro 1-click, estado de cuenta
    clientes/       Clientes: datos, estado de cuenta, referentes, notas
    notas/          Notas por cliente (crear / editar / eliminar)
    estadisticas/   Ranking de cobradores + desempeño personal + numerales
components/
  ui/               shadcn/ui
  cobros|clientes|notas|layout|shared|providers/
services/           Capa de API (axios) + backend mock (imita la DB real)
store/              Redux Toolkit (auth, ui, cobros, clientes, notas, estadisticas)
types/              Modelos de datos (alineados a SQL_21-7)
lib/                Helpers (formato, sesión, estados, estado de cuenta, constantes)
proxy.ts            Guard de rutas por cookie de sesión
```

## Modelo de datos

Los tipos en `types/index.ts` reflejan el esquema real de la DB (`SQL_21-7`):
Clientes, Referentes, Cobradores (persona base), Telefonos (polimórfica, N por entidad),
Localidades, Cuenta/Roles, Cuenta_Corriente → Plan_de_pagos → Pagos_por_realizar /
Pagos_realizados, Notas y Advertencias_y_retrasos.

- **Estados de pago:** `Pendiente`, `Pagado`, `Adelanto`, `Recargo`, `Incomunicado`.
  El "Vencido" no se guarda: se deriva de un pendiente con fecha pasada.
- **Fuera de rango:** un cobro registrado por un cobrador distinto al asignado (asistencia)
  se marca `dentroRango = false` para que el admin lo vea.

## Funcionalidades de la vista Cobrador

- **Cobros del día:** banner de ranking/desempeño (rojo si es el último), filtros por
  localidad + buscador + "ver todos los cobradores" (modo asistencia), registro con un click
  (pagado / adelanto / recargo / incomunicado) y envío del estado de cuenta al cliente
  (WhatsApp / copiar / imprimir).
- **Clientes:** datos personales, estado de cuenta, WhatsApp multi-teléfono (elige el número),
  referentes (cards), notas (crear / editar / eliminar).
- **Estadísticas:** ranking de cobradores (efectividad + dinero), desempeño personal
  (efectividad, completitud, asistencias 6 meses) y numerales (promedio diario, dinero perdido).

## Notas de diseño

- La **fecha de trabajo** se elige desde el header del tab Cobros (botón "Cambiar") y persiste entre sesiones.
- El **estado de cuenta** se genera en `lib/estado-cuenta.ts` y se comparte como texto (WhatsApp / copiar / imprimir).
