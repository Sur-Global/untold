# Pipeline de trabajo — UNTOLD

Última actualización: 2026-10-23

## Hecho esta semana
- Banners publicitarios del homepage (antes de Videos y después de Píldoras) — se cambian en Admin → **Advertising**.
- Sección **Lo más reciente** en el homepage (tarjeta de editorial + lista de lo último).
- **Números** de la revista (Admin → **Issues**, archivo público en `/issues`): creados el V, VI y VII de 2026 con sus editoriales y artículos.

## Próxima semana (recordar a Elsie el lunes 2026-10-26)
1. **Escribir el manual de uso de la plataforma** para editores (empezar por: crear un número, marcar un editorial, subir un banner, publicar y colocar contenido ★ ⌂ ↑).
2. **Entrenar a los editores** con ese manual.
3. **Cuando estén entrenados:** darles acceso a la pestaña **Issues** para que creen números ellos mismos (hoy solo la ve la administradora; el cambio es poner `adminOnly: false` en `components/admin/AdminTabs.tsx`, y los permisos de base de datos ya los permiten).

## Siguiente
- **Página de Creadores** (menú superior + pie): decidir nombre, dónde va en el menú y filtros (ver opciones en la conversación). Para filtrar por país hace falta un campo «país» en los perfiles.
- Crear los números anteriores (I–IV de 2026), si quieren tenerlos en el archivo.
- Que el traductor automático también traduzca los pies de foto.
- Pendientes de configuración (Sender, Vercel, claves): ver `docs/pending-setup-steps.md`.

## Cómo crear un número (para el manual)
1. Escribe el **editorial** como un artículo normal (Crear → Artículo), firmado por quien lo escribe, y publícalo.
2. Publica o ubica los artículos del número como siempre.
3. Admin → **Issues** → **New issue**. Pon el número (se muestra en romanos: 5 = V) y el mes.
4. En la lista, marca **Editorial** en el editorial y **In this issue** en cada artículo del número (se puede buscar por título o autor).
5. Marca **Published** y pulsa **Save issue**. El homepage muestra el editorial del número más reciente.
Los números empiezan de nuevo cada año (2026 – V).
