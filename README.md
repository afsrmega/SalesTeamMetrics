https://afsrmega.github.io/SalesTeamMetrics/

Puedes ingresar a la página de demo y crear miembros, revisar ventas, llevar follow ups, entre otros.

Login de prueba:

User: admin@example.com
Pwd: test


Ingreso como miembro: 

usertest@example.com
pswd: Test


# Horizons Sales Metrics App

Aplicación web para seguimiento de métricas comerciales, administración de equipo, gestión de prospectos/clientes, herramientas de valoración de propiedades y conciliación de ventas.

El proyecto está construido con **React + Vite**, usa **Supabase** para autenticación, base de datos, storage, realtime y Edge Functions, y está diseñado para separar la experiencia de **administradores** y **miembros de ventas**.

---

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Funcionalidades principales](#funcionalidades-principales)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Rutas principales](#rutas-principales)
- [Roles y permisos](#roles-y-permisos)
- [Supabase](#supabase)
- [Instalación local](#instalación-local)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Build y despliegue](#build-y-despliegue)
- [Checklist de pruebas](#checklist-de-pruebas)
- [Notas de seguridad](#notas-de-seguridad)
- [Troubleshooting](#troubleshooting)
- [Roadmap sugerido](#roadmap-sugerido)

---

## Descripción general

**Horizons Sales Metrics App** centraliza el proceso comercial en una sola plataforma:

- Control de ventas por mes y trimestre.
- Seguimiento de metas individuales y de equipo.
- Dashboards para admin y vendedores.
- Gestión de miembros comerciales.
- Registro histórico de ventas.
- Gestión de prospectos, clientes, follow-ups y conversiones.
- Herramientas de valoración de propiedades.
- Identificación de números telefónicos por area code.
- Exportación de reportes a Excel y PowerPoint.
- Personalización visual por usuario.

La aplicación está pensada para equipos comerciales que necesitan medir desempeño, controlar objetivos y mantener trazabilidad sobre oportunidades y clientes.

---

## Funcionalidades principales

### 1. Autenticación

- Login para administradores.
- Login separado para miembros de ventas.
- Manejo de sesión con Supabase Auth.
- Logout con limpieza de sesión local.
- Redirección automática según rol.

### 2. Panel de administrador

Ruta principal:

```txt
/admin
```

Incluye:

- Dashboard principal de ventas.
- Métricas mensuales y trimestrales.
- Filtro por periodo.
- Filtro para incluir o excluir ventas residenciales.
- Configuración de metas globales.
- Configuración de metas por periodo.
- Gestión de equipo comercial.
- Creación y edición de miembros.
- Archivo/restauración de miembros.
- Vinculación de miembros con usuarios de Auth.
- Asignación de contraseña temporal.
- Carga de ventas vía Excel.
- Registro manual de ventas.
- Historial de ventas.
- Invalidación o eliminación lógica de ventas.
- Exportación a Excel.
- Exportación a PowerPoint.
- Panel de auditoría/debug.

### 3. Dashboard de miembro de ventas

Ruta principal:

```txt
/sales-dashboard
```

Incluye:

- Dashboard personal.
- Registro de ventas propias.
- Métricas mensuales y trimestrales.
- Productividad.
- Proyecciones.
- Herramientas.
- Leaderboard.
- Conciliación.
- Cambio de contraseña.
- Personalización de colores.
- Foto de perfil.

### 4. Prospectos

Rutas:

```txt
/admin/prospects
/prospects
```

Incluye:

- Creación de prospectos.
- Edición con historial.
- Filtros avanzados.
- Tags.
- Segmentos guardados.
- Follow-ups vencidos y próximos.
- Calendario de seguimientos.
- Funnel de pipeline.
- Métricas de cobertura.
- Top prospects.
- Marcar como perdido.
- Restaurar prospectos perdidos.
- Eliminar prospectos con razón.
- Conversión de prospecto a cliente.

### 5. Clientes

Rutas:

```txt
/admin/clients
/clients
```

Incluye:

- Vista de clientes convertidos.
- Filtros por owner, canal de conversión, tipo de propiedad y estado.
- Edición con historial.
- Follow-ups de clientes.
- Protocolo de venta.
- Rapport plan.
- Touchpoints.
- Tags y segmentos.
- Reversión de cliente a prospecto.

### 6. Herramientas de propiedad

Disponibles desde:

```txt
/admin
/sales-dashboard
```

Incluye:

- Calculadora de valoración.
- Historial de valoraciones.
- Valoraciones compartidas.
- Calculadora de tax rate con 1, 2 o 3 comparables.
- Extracción de información desde PDF.
- Exportación de resultados cuando aplica.

### 7. Identificador telefónico

Disponible desde el panel admin.

Incluye:

- Limpieza automática de caracteres no numéricos.
- Identificación de estado por area code.
- Manejo de números inválidos.

---

## Stack tecnológico

### Frontend

- React 18
- Vite 7
- React Router DOM
- Tailwind CSS
- Radix UI
- Lucide React
- Framer Motion
- Recharts
- Chart.js
- React Chart.js 2
- React Hook Form
- date-fns

### Backend / BaaS

- Supabase Auth
- Supabase Database
- Supabase Realtime
- Supabase Storage
- Supabase Edge Functions
- Supabase RPC functions

### Exportación y documentos

- ExcelJS
- XLSX
- file-saver
- jsPDF
- html2canvas
- pptxgenjs
- pdfjs-dist

---

## Estructura del proyecto

```txt
.
├── public/
│   ├── robots.txt
│   ├── sitemap.xml
│   └── .htaccess
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── components/
│   │   ├── LoginPage.jsx
│   │   ├── SalesLoginPage.jsx
│   │   ├── MainPage.jsx
│   │   ├── SalesMemberDashboard.jsx
│   │   ├── sales/
│   │   ├── prospects/
│   │   ├── clients/
│   │   ├── property/
│   │   ├── phone/
│   │   └── ui/
│   ├── contexts/
│   │   └── SupabaseAuthContext.jsx
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   └── utils/
├── tools/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── eslint.config.mjs
```

### Carpetas importantes

| Carpeta | Descripción |
|---|---|
| `src/components/sales` | Componentes del dashboard admin, ventas, miembros, métricas, tablas y reportes. |
| `src/components/prospects` | Pipeline, prospectos, follow-ups, segmentos, tags e historial. |
| `src/components/clients` | Clientes, protocolo de venta, rapport plan, historial y reversión. |
| `src/components/property` | Calculadoras de propiedad, valoración, tax rate y resultados. |
| `src/components/phone` | Identificador de número telefónico. |
| `src/contexts` | Contexto de autenticación y estado global de usuario. |
| `src/hooks` | Hooks de métricas, progreso, realtime, colores y datos. |
| `src/lib` | Servicios de Supabase, cálculos, exportaciones y utilidades. |

---

## Rutas principales

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | Público | Login de administrador. |
| `/sales-login` | Público | Login de miembro de ventas. |
| `/admin` | Admin | Dashboard administrativo. |
| `/admin/prospects` | Admin | Gestión global de prospectos. |
| `/admin/clients` | Admin | Gestión global de clientes. |
| `/sales-dashboard` | Sales Member | Dashboard personal del vendedor. |
| `/prospects` | Sales Member | Prospectos propios del vendedor. |
| `/clients` | Sales Member | Clientes propios del vendedor. |

Las rutas están protegidas desde `src/App.jsx` mediante componentes de control:

- `AdminRoute`
- `SalesRoute`
- `PublicRoute`

---

## Roles y permisos

La app trabaja con dos perfiles principales:

### Admin

Puede:

- Acceder al panel `/admin`.
- Ver métricas globales del equipo.
- Crear, editar, archivar y restaurar miembros.
- Vincular usuarios de Auth con miembros comerciales.
- Cambiar contraseñas temporales.
- Ver todos los prospectos y clientes.
- Configurar metas globales y por periodo.
- Exportar reportes.

### Sales Member

Puede:

- Acceder al panel `/sales-dashboard`.
- Ver sus propias métricas.
- Registrar ventas propias.
- Ver sus prospectos.
- Ver sus clientes.
- Usar herramientas comerciales.
- Cambiar su contraseña.
- Personalizar colores y foto de perfil.

La separación de roles se basa en `user_metadata.isSalesMember` y en los registros relacionados en la tabla `sales_team`.

---

## Supabase

La aplicación depende de Supabase para autenticación, base de datos, storage, realtime y funciones backend.

### Cliente Supabase

El cliente principal se encuentra en:

```txt
src/lib/customSupabaseClient.js
```

> Recomendación: antes de publicar el repositorio en GitHub, mover la URL y la anon key a variables de entorno. Aunque la anon key de Supabase puede ser pública si las políticas RLS están bien configuradas, es mejor práctica no dejar credenciales hard-coded en el código.

---

## Tablas utilizadas

La app consulta o modifica las siguientes tablas:

```txt
sales_team
sales_records
goals_by_period
global_settings
global_settings_audit
prospects
prospect_history
prospect_tags
clients
client_history
client_tags
client_touchpoints
tags
saved_segments
commission_plans
valuations
shared_valuations
user_color_preferences
daily_lead_tracking
```

---

## RPC functions utilizadas

La app espera que existan estas funciones RPC en Supabase:

```txt
convert_prospect_to_client
update_prospect_with_history
update_client_with_history
revert_client_to_prospect
delete_prospect_with_reason
log_global_settings_change
```

---

## Edge Functions utilizadas

La app invoca estas Supabase Edge Functions:

```txt
create-member
set-member-password
delete-member
```

Estas funciones son necesarias para operaciones administrativas relacionadas con usuarios de Supabase Auth.

---

## Storage buckets

La app usa el siguiente bucket:

```txt
member-photos
```

Uso principal:

- Foto de perfil de miembros.
- Upload de imágenes desde el dashboard.
- Obtención de URL pública para mostrar avatar/foto.

---

## Instalación local

### 1. Clonar el repositorio

```bash
git clone https://github.com/USUARIO/NOMBRE-DEL-REPO.git
cd NOMBRE-DEL-REPO
```

### 2. Usar la versión recomendada de Node

El proyecto incluye `.nvmrc` con Node 22.

```bash
nvm use
```

Si no tienes esa versión instalada:

```bash
nvm install 22
nvm use 22
```

### 3. Instalar dependencias

```bash
npm install
```

El proyecto incluye `.npmrc` con:

```txt
legacy-peer-deps=true
```

Esto ayuda a evitar conflictos de peer dependencies durante instalación.

### 4. Configurar variables de entorno

Crear un archivo `.env.local` en la raíz:

```bash
cp .env.example .env.local
```

Ejemplo recomendado:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Luego actualizar el cliente Supabase para leer desde `import.meta.env`.

Ejemplo:

```js
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Por defecto, Vite corre en:

```txt
http://localhost:3000
```

---

## Variables de entorno

Variables recomendadas:

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key. |

Archivo sugerido `.env.example`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Importante: no subir `.env.local` al repositorio.

---

## Scripts disponibles

```bash
npm run dev
```

Inicia el servidor local de desarrollo.

```bash
npm run build
```

Genera la versión de producción en la carpeta `dist`.

```bash
npm run preview
```

Sirve localmente el build de producción.

```bash
npm run lint
```

Ejecuta ESLint.

---

## Build y despliegue

### Build local

```bash
npm run build
```

La salida queda en:

```txt
dist/
```

### Preview local del build

```bash
npm run preview
```

---

## Despliegue en GitHub Pages

Si el repositorio se publica como página de usuario u organización:

```txt
https://usuario.github.io/
```

normalmente no necesitas cambiar el `base` de Vite.

Si el repositorio se publica como project page:

```txt
https://usuario.github.io/nombre-del-repo/
```

agrega `base` en `vite.config.js`:

```js
export default defineConfig({
  base: '/nombre-del-repo/',
  // resto de configuración
});
```

Luego puedes usar GitHub Actions o subir el contenido de `dist/` a la rama configurada para Pages.

### Ejemplo de GitHub Actions

Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

En GitHub, configurar los secrets:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## Checklist de pruebas

Antes de publicar una nueva versión:

### Autenticación

- [ ] Login admin funciona.
- [ ] Login sales member funciona.
- [ ] Logout limpia sesión correctamente.
- [ ] Admin no es redirigido al sales dashboard.
- [ ] Sales member no puede entrar a `/admin`.

### Dashboard admin

- [ ] Cargan miembros del equipo.
- [ ] Cargan ventas históricas.
- [ ] Cargan metas globales.
- [ ] Cambiar entre mes y trimestre funciona.
- [ ] Filtros de fecha funcionan.
- [ ] Toggle de residential funciona.
- [ ] Exportar Excel funciona.
- [ ] Exportar PowerPoint funciona.

### Miembros

- [ ] Crear miembro funciona.
- [ ] Editar miembro funciona.
- [ ] Vincular usuario funciona.
- [ ] Cambiar contraseña temporal funciona.
- [ ] Subir foto funciona.
- [ ] Archivar miembro funciona.
- [ ] Restaurar miembro funciona.

### Ventas

- [ ] Crear venta admin funciona.
- [ ] Crear venta desde sales dashboard funciona.
- [ ] Venta aparece en historial.
- [ ] Totales mensuales y trimestrales se recalculan.
- [ ] Invalidar venta funciona.
- [ ] Eliminar venta funciona si aplica.

### Prospects

- [ ] Crear prospect funciona.
- [ ] Editar prospect guarda historial.
- [ ] Filtros funcionan.
- [ ] Tags funcionan.
- [ ] Segmentos guardados funcionan.
- [ ] Follow-ups vencidos/próximos funcionan.
- [ ] Marcar como perdido funciona.
- [ ] Restaurar prospect funciona.
- [ ] Convertir prospecto a cliente funciona.

### Clients

- [ ] Cliente aparece después de conversión.
- [ ] Editar cliente guarda historial.
- [ ] Follow-up de cliente funciona.
- [ ] Protocolo de venta persiste.
- [ ] Rapport plan funciona.
- [ ] Revertir cliente a prospect funciona.

### Herramientas

- [ ] Calculadora de valoración funciona.
- [ ] Historial de valoraciones funciona.
- [ ] Tax rate calculator funciona.
- [ ] Identificador telefónico funciona.
- [ ] Extracción PDF no rompe la app.

### Seguridad

- [ ] RLS en Supabase está activo.
- [ ] Sales member no puede leer registros de otros vendedores.
- [ ] Sales member no puede modificar metas globales.
- [ ] Edge Functions admin requieren autorización.
- [ ] Storage bucket tiene políticas correctas.

---

## Notas de seguridad

Antes de hacer público el repositorio:

1. **Mover credenciales a variables de entorno.**
   - No dejar URL/key directamente en `customSupabaseClient.js`.

2. **Revisar RLS en Supabase.**
   - La seguridad no debe depender solo del frontend.
   - Los vendedores solo deben leer/modificar sus datos.
   - Los admins deben tener permisos ampliados.

3. **Proteger Edge Functions.**
   - `create-member`, `set-member-password` y `delete-member` deben validar que el solicitante sea admin.

4. **No subir archivos `.env.local`.**

5. **No exponer service role key.**
   - La service role key solo debe vivir en Supabase Edge Functions o backend seguro.
   - Nunca debe estar en el frontend.

6. **Revisar datos reales antes de subir capturas o seeds.**
   - Evitar publicar emails, teléfonos o datos de clientes/prospectos reales.

---

## Troubleshooting

### Error: solo el admin puede modificar metas

Revisar:

- Que el usuario tenga rol admin en `sales_team`.
- Que `user_metadata.isSalesMember` no esté marcado como `true` para admins.
- Que las políticas RLS permitan al admin actualizar `goals_by_period` y `global_settings`.
- Que el usuario esté correctamente vinculado por `user_id` o `linked_user_id` según la lógica activa.

### El vendedor entra pero no ve sus datos

Revisar:

- Registro en `sales_team`.
- Relación entre `auth.users.id`, `sales_team.user_id` y `sales_team.linked_user_id`.
- Políticas RLS sobre `sales_records`, `prospects` y `clients`.

### La foto de perfil no carga

Revisar:

- Bucket `member-photos` existe.
- Políticas de storage permiten upload/select.
- La URL pública se genera correctamente.

### Exports no descargan

Revisar:

- Permisos del navegador para descargas.
- Que existan datos en el periodo seleccionado.
- Consola del navegador para errores de `exceljs`, `file-saver`, `pptxgenjs` o `html2canvas`.

### GitHub Pages muestra pantalla blanca

Revisar:

- Configuración `base` en `vite.config.js`.
- Rutas SPA con React Router.
- Que el build haya subido correctamente a `dist`.
- Errores en la consola del navegador.

---

## Roadmap sugerido

- [ ] Agregar `.env.example` oficial.
- [ ] Mover Supabase URL/key a variables de entorno.
- [ ] Agregar scripts o documentación SQL para reconstruir tablas, RPCs y policies.
- [ ] Agregar documentación de Edge Functions.
- [ ] Agregar tests automatizados básicos.
- [ ] Agregar página 404 real.
- [ ] Agregar ruta pública para valoraciones compartidas si se requiere usar `/share/valuation/:id`.
- [ ] Agregar documentación de RLS por tabla.
- [ ] Agregar guía de release/deploy.

---

## Estado del proyecto

Proyecto en desarrollo activo. Antes de usar en producción, validar:

- RLS.
- Edge Functions.
- Storage policies.
- Variables de entorno.
- Usuarios admin.
- Flujos críticos de venta, prospecto y cliente.

---

## Licencia

Este proyecto es de uso interno/proprietario salvo que se indique lo contrario.
