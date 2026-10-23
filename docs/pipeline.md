# Pipeline de trabajo — UNTOLD

Última actualización: 2026-10-23

## Hecho esta semana
- Banners publicitarios del homepage (antes de Videos y después de Píldoras) — se cambian en Admin → **Advertising**.
- Sección **Lo más reciente** en el homepage (tarjeta de editorial + lista de lo último).
- **Números** de la revista (Admin → **Issues**, archivo público en `/issues`): creados de marzo 2025 a septiembre 2026 (16 números, sin enero 2026), con sus editoriales y artículos. Se muestran solo por mes y año. Falta **enero 2026**: pendiente el enlace del boletín.
- **Página de Creadores** (`/creators`): buscador, orden A–Z / más contenido / más recientes, filtros de país y tema, letras. En el menú dentro de «Explorar» y en el pie bajo «Contenido → Comunidad».

## Próxima semana (recordar a Elsie el lunes 2026-10-26)
1. **Escribir el manual de uso de la plataforma** para editores (empezar por: crear un número, marcar un editorial, subir un banner, publicar y colocar contenido ★ ⌂ ↑).
2. **Entrenar a los editores** con ese manual.
3. **Cuando estén entrenados:** darles acceso a la pestaña **Issues** para que creen números ellos mismos (hoy solo la ve la administradora; el cambio es poner `adminOnly: false` en `components/admin/AdminTabs.tsx`, y los permisos de base de datos ya los permiten).

## Siguiente
- **Países de los creadores:** el campo «País» ya existe en el perfil (solo 5 tienen país); proponer países a partir de las biografías para que Elsie los revise.
- **Enero 2026:** crear en cuanto llegue el enlace del boletín; probablemente incluye «Resistir es acuerpar», «¿Y ahora, cómo innovamos?», la entrevista a Álex Hernández y «La sociedad del cansancio» (hoy sin número).
- Que el traductor automático también traduzca los pies de foto.
- Pendientes de configuración (Sender, Vercel, claves): ver `docs/pending-setup-steps.md`.

## Cómo crear un número (para el manual)
1. Escribe el **editorial** como un artículo normal (Crear → Artículo), firmado por quien lo escribe, y publícalo.
2. Publica o ubica los artículos del número como siempre.
3. Admin → **Issues** → **New issue**. Elige el mes (los números se identifican solo por mes y año; hay uno por mes).
4. En la lista, marca **Editorial** en el editorial y **In this issue** en cada artículo del número (se puede buscar por título o autor).
5. Marca **Published** y pulsa **Save issue**. El homepage muestra el editorial del número más reciente.
En la web cada número se muestra con el mes grande y el año pequeño (Septiembre 2026).
