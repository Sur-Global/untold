# Pipeline de trabajo — UNTOLD

Última actualización: 2026-10-23

## Hecho esta semana
- Banners publicitarios del homepage (antes de Videos y después de Píldoras) — se cambian en Admin → **Advertising**.
- Sección **Lo más reciente** en el homepage (tarjeta de editorial + lista de lo último).
- **Números** de la revista (Admin → **Issues**, archivo público en `/issues`; cada tarjeta lleva directo a la página del editorial, que muestra el texto, los artículos del número y la tarjeta de quien firma; las direcciones `/issues/<año>/<mes>` redirigen allí): creados de marzo 2025 a septiembre 2026 (16 números, sin enero 2026), con sus editoriales y artículos. Se muestran solo por mes y año. Falta **enero 2026**: pendiente el enlace del boletín.
- **Página de Creadores** (`/creators`): buscador, orden A–Z / más contenido / más recientes, filtros de país y tema, letras. En el menú dentro de «Explorar» y en el pie, bajo «Páginas» (y «Números» bajo «Contenido»), cada lista en orden alfabético.
- Perfiles de creadores traducidos a mano a inglés, portugués y francés (biografía y texto del botón); etiquetas con nombre en los 6 idiomas; país de origen (uno o dos) y país donde vive (uno, se ve en el idioma del lector) separados.
- Editoriales fuera de /articles (automático) y en una sección «Editoriales» al final de la página del creador; la foto del autor lleva a su perfil; «También te puede interesar» bajo cada contenido; menú de compartir con redes sociales y vista previa al compartir enlaces; leyenda de colocación del admin plegable.

## Próxima semana (recordar a Elsie el lunes 2026-10-26)
1. **Escribir el manual de uso de la plataforma** para editores (empezar por: crear un número, marcar un editorial, subir un banner, publicar y colocar contenido ★ ⌂ ↑).
2. **Entrenar a los editores** con ese manual.
3. **Cuando estén entrenados:** darles acceso a la pestaña **Issues** para que creen números ellos mismos (hoy solo la ve la administradora; el cambio es poner `adminOnly: false` en `components/admin/AdminTabs.tsx`, y los permisos de base de datos ya los permiten).

## Siguiente
- **Enero 2026:** crear en cuanto llegue el enlace del boletín; probablemente incluye «Resistir es acuerpar», «¿Y ahora, cómo innovamos?», la entrevista a Álex Hernández y «La sociedad del cansancio» (hoy sin número).
- Que el traductor automático también traduzca los pies de foto.
- Pendientes de configuración (Sender, Vercel, claves): ver `docs/pending-setup-steps.md`.

## Cómo crear un número (para el manual)
Atajo: al editar el artículo que será el editorial (solo lo ven editores y administradores) hay un cuadro **«Número de la revista»** con el botón «Crear un número con este editorial», que abre el formulario con ese artículo ya elegido como editorial.

1. Escribe el **editorial** como un artículo normal (Crear → Artículo), firmado por quien lo escribe, y publícalo.
2. Publica o ubica los artículos del número como siempre.
3. Admin → **Issues** → **New issue**. Elige el mes (los números se identifican solo por mes y año; hay uno por mes).
4. En la lista, marca **Editorial** en el editorial y **In this issue** en cada artículo del número (se puede buscar por título o autor).
5. Marca **Published** y pulsa **Save issue**. El homepage muestra el editorial del número más reciente publicado y, a su lado, **los artículos de ese número** (los que marcaste en el paso 4). Un número en borrador (por ejemplo diciembre 2026, ya creado con «Nombrar lo borrado») no se ve en la web hasta que lo publiques.
   Los editoriales **no salen en /articles** (ni en búsquedas ni etiquetas): viven en los Números y en la sección **Editoriales** (al final) de la página de quien los firma. Esto es automático en cuanto un artículo se marca como editorial.
En la web cada número se muestra con el mes grande y el año pequeño (Septiembre 2026).
