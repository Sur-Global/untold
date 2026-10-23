# Guía paso a paso: Sender, Vercel y Supabase

Escrita el 2026-10-23 para Elsie. Cada bloque dice **para qué sirve**, **cuánto tarda** y los **clics exactos**.
Si algo no se ve igual en la pantalla (estos servicios cambian sus menús), manda una captura y lo ajustamos.

Orden recomendado: **1 → 2 → 3 → 4**. Los bloques 1 y 2 son los más importantes.

---

## 0. Qué significa "claves expuestas en un chat"

Una **clave** (o *token*) es una contraseña que usa la web para hablar con otro servicio, sin persona de por medio.
Hay tres que se compartieron en una conversación en algún momento:

- **El token de Sender** (permite enviar correos y tocar la lista de suscriptores).
- **La clave `service_role` de Supabase** (permite leer y cambiar *toda* la base de datos, saltándose las protecciones).
- **El secreto JWT de Supabase** (con él se pueden fabricar sesiones de usuario falsas).

Lo que se pega en un chat puede quedar guardado en el historial. No significa que alguien lo haya usado, pero la práctica segura es
**cambiarlas por claves nuevas** ("rotar") y borrar las viejas. Es como cambiar la cerradura después de haber prestado una llave.
Las claves nuevas se ponen **solo** en Vercel (y en el `.env.local` de quien programa), **nunca en un chat**.

Hazlo después de los bloques 1 y 2 (así el token nuevo de Sender se usa de una vez). La rotación de Supabase es el paso más delicado:
hazla con calma, en un momento de poco tráfico, y **avísame para acompañarte** (ver bloque 4).

---

## 1. Sender: token nuevo, remitente y lista

**Para qué:** que el formulario de newsletter de la web agregue a la gente a la lista **UNTOLD**, y que lleguen los correos de aviso al equipo.
**Tiempo:** 15 minutos (más la espera de unas horas si hay que verificar el dominio).

1. Entra a Sender (app.sender.net) con tu usuario.
2. **Token nuevo:** menú *Settings* → *API access tokens* → *Create new token*. Ponle un nombre (por ejemplo "UNTOLD web") y **copia el valor** a un lugar seguro (se muestra una sola vez). No lo pegues en ningún chat.
3. **La lista que recibe suscriptores:** *Subscribers* → *Groups*. Abre la lista **UNTOLD** y mira la dirección del navegador: el código corto que aparece (por ejemplo `e0Ep3v`) es el **ID de la lista**. Anótalo. (El formulario que me indicaste, `stats.sender.net/forms/bkRwZr/view`, es el formulario de esa misma lista.)
4. **Remitente verificado:** *Settings* → *Domains* (o *Sender identities*). Añade el correo desde el que quieres que salgan los avisos, por ejemplo `no-reply@surglobal.io` o `hola@untold.ink`. Sender te pedirá confirmar el correo y, para el dominio, **añadir unos registros DNS** (SPF y DKIM). Eso se hace donde tengas el dominio (GoDaddy, Namecheap, Cloudflare…): copia los registros que Sender muestra y pégalos tal cual en "DNS". Cuando Sender marque el dominio como *Verified*, está listo. Si no sabes dónde está el dominio, dime cuál es y te digo cómo hacerlo.
5. **Correos transaccionales:** en *Settings* revisa que tu plan permita enviar "transactional emails". Si no aparece, avísame y buscamos otra opción.
6. **Borra el token viejo** (el que se compartió en el chat) en *API access tokens*, **solo después** de completar el bloque 2.

## 2. Vercel: poner las claves nuevas

**Para qué:** la web lee esos valores para hablar con Sender. Sin esto el formulario usa el formulario alternativo de Sender y los avisos por correo no salen.
**Tiempo:** 10 minutos.

1. Entra a vercel.com → proyecto **untold** → *Settings* → *Environment Variables*.
2. Para cada fila de esta tabla pulsa *Add New*, escribe el nombre y el valor, deja marcado **Production** y guarda:

| Nombre | Valor |
|---|---|
| `SENDER_API_TOKEN` | el token nuevo del bloque 1 (paso 2) |
| `SENDER_GROUP_IDS` | el ID de la lista UNTOLD (paso 3), por ejemplo `e0Ep3v` |
| `NOTIFY_FROM_EMAIL` | el correo verificado del bloque 1 (paso 4) |
| `NOTIFY_FROM_NAME` | `UNTOLD` (opcional) |
| `CRON_SECRET` | una contraseña larga inventada (30+ caracteres, mezcla de letras y números; sirve cualquier generador de contraseñas). **Es nueva**: la usa el trabajo diario que manda los recordatorios de perfil incompleto |

3. Comprueba que `NEXT_PUBLIC_SITE_URL` ya existe y vale `https://untold-six.vercel.app` (o el dominio definitivo cuando lo tengamos). Ya la verifiqué: hoy está bien.
4. *Deployments* → el último → los tres puntos (⋯) → **Redeploy**. Espera a que diga *Ready*.
5. **Pruebas:**
   - En la web, abre el formulario "Suscríbete" con un correo de prueba tuyo. Debe aparecer en Sender, dentro de la lista UNTOLD. Luego bórralo de Sender.
   - Entra con una cuenta de miembro normal, publica una píldora marcando "enviar para destacar": debe llegar un correo a elsie@surglobal.io y aparecer en *Admin → Requests*.
   - Si algo no llega, en Vercel → *Logs* busca líneas que empiecen por `[notify]` y mándame lo que digan.
6. Ahora sí: vuelve a Sender y **borra el token viejo**.

## 3. Supabase: correo propio (SMTP)

**Qué es y por qué:** cuando alguien se registra, o dice "olvidé mi contraseña", Supabase manda un correo con un enlace. Por defecto lo
manda desde **su propio servidor de pruebas**: permite muy pocos correos por hora para todo el proyecto, sale con un remitente genérico
y a menudo cae en spam. Con tráfico real, la gente no recibiría su enlace.
**SMTP** es simplemente el "usuario y contraseña de un servidor de correo". Si le damos a Supabase el de **nuestro** servicio (Sender),
los correos salen con **nuestro** remitente (por ejemplo "UNTOLD <no-reply@…>"), llegan mejor y no hay límite ridículo.
**Tiempo:** 15 minutos. Requiere haber verificado el dominio del remitente (bloque 1, paso 4).

1. En Sender busca las credenciales SMTP: *Settings* → *SMTP* (a veces dentro de *API & SMTP*). Copia: **servidor (host)**, **puerto** (587 suele ser el correcto), **usuario** y **contraseña**. Si tu plan de Sender no ofrece SMTP, dímelo: usamos un servicio gratuito como Resend o Brevo y te doy los mismos pasos.
2. En supabase.com → proyecto de UNTOLD → *Authentication* → *Emails* → pestaña **SMTP Settings** → activa **Enable custom SMTP**.
3. Rellena: *Sender email* (el correo verificado), *Sender name* (`UNTOLD`), *Host*, *Port*, *Username*, *Password*. Guarda.
4. **Prueba:** en una ventana privada, regístrate con un correo tuyo nuevo. El correo de confirmación debe llegar en menos de un minuto, con remitente UNTOLD. Haz lo mismo con "olvidé mi contraseña".
5. (Opcional, después) En *Authentication → Emails → Templates* se pueden traducir los textos de esos correos. Dímelo y los preparo en español, inglés, portugués y francés.

## 4. Rotar las claves de Supabase (con cuidado)

**Cuándo:** después de los bloques 1–3, en un momento tranquilo. **Mejor conmigo conectado**, porque al cambiar estas claves la web deja de funcionar hasta que se actualizan en Vercel (unos minutos).

1. Supabase → *Project Settings* → *API Keys* (o *JWT Keys*). Genera una **nueva clave secreta / service_role** y/o rota el **JWT secret**. Ten en cuenta que rotar el JWT secret **cierra la sesión de todas las personas** y cambia también la clave pública (anon).
2. Copia las nuevas: la clave pública (*anon / publishable*) y la secreta (*service_role / secret*).
3. En Vercel → *Environment Variables* actualiza `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` (y `SUPABASE_JWT_SECRET` si existe) → **Redeploy**.
4. Avísame para actualizar el archivo local `.env.local`, y comprobar que todo funciona.
5. Cuando todo esté bien, la clave vieja ya quedó inutilizada (la rotación la invalida).
6. El **token personal** `SUPABASE_ACCESS_TOKEN` (el que me permite aplicar cambios a la base de datos desde mi lado) también es una clave: puedes **revocarlo** en supabase.com → *Account → Access Tokens* cuando no lo necesitemos, y crear otro cuando haga falta.

---

## Lista corta de comprobación

- [ ] Token nuevo de Sender creado y copiado
- [ ] ID de la lista UNTOLD anotado
- [ ] Correo remitente verificado (SPF/DKIM)
- [ ] Variables en Vercel (5) + Redeploy
- [ ] Prueba de suscripción OK y contacto de prueba borrado
- [ ] Token viejo de Sender borrado
- [ ] SMTP propio en Supabase + prueba de registro
- [ ] Claves de Supabase rotadas (con mi ayuda) y token personal revocado
