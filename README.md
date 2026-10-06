# Juan Embeds, plugin para Kino

Un plugin para la app de video Kino que reproduce el stream de cualquier reproductor incrustado
(embed) cuyo enlace agregues en Ajustes. Cada embed se muestra como un canal con el nombre que le
pongas, en el Inicio de Kino, en la pestaña En vivo o en las dos. Es un solo manifiesto y un solo
archivo de JavaScript, sin paso de compilación.

## Qué hace

| Capacidad | Cómo |
| --- | --- |
| `home` | Una fila "En vivo" con un canal por cada embed de la lista, en el orden en que los agregaste. Si eliges "Solo en En vivo", no aporta filas. |
| `channels` | La pestaña En vivo de Kino: una categoría "Embeds" con un canal por embed, numerados según su posición en la lista. Si eliges "Solo en Inicio", no aporta categorías. |
| `resolve` | Abre el enlace del embed en el **navegador oculto** de Kino (`kino.browser.capture`), deja que la página ejecute sus propios scripts y devuelve la primera petición de video que hizo (los manifiestos HLS/DASH van antes que los MP4), con los mismos headers y cookies que llevaba la página. |

El `ref` de cada canal es su `id`, y `resolve` busca el enlace en tus ajustes en el momento de
reproducir, así que un cambio en la lista se aplica sin reinstalar nada.

## Tus embeds (Configurar)

En Ajustes ▸ Plugins ▸ Juan Embeds ▸ Configurar:

| Ajuste | Para qué sirve |
| --- | --- |
| **Embeds** | Lista de hasta 30 entradas, con el botón "Agregar". Cada entrada tiene **Nombre** (opcional) y **Enlace del embed** (obligatorio). Sin nombre, el canal se llama "Embed 2", "Embed 3", etc., según su posición. |
| **Dónde mostrar los canales** | "Solo en Inicio", "Solo en En vivo" o "En los dos" (por defecto). |

Mientras la lista esté vacía, Kino muestra "Falta configurar" y no llama al plugin.

Detalles:

- **Ids estables.** El `id` de cada canal sale de una huella de su enlace, no de su posición, así que
  reordenar la lista no rompe favoritos ni recientes. Si pones el mismo enlace dos veces, el
  segundo recibe un sufijo (`-2`) para que Kino no lo descarte por repetido.
- **Entradas vacías.** Una entrada sin enlace se ignora.
- **Solo `https`.** La captura exige una página pública y `https`. Un enlace `http` aparece en la lista
  pero falla al reproducir con "no disponible".
- Cambiar cualquier ajuste cierra el sandbox del plugin y borra sus filas de Inicio guardadas. Kino
  guarda las categorías y canales de En vivo durante una hora, así que un cambio de "dónde mostrar"
  puede tardar en verse allí.

## Permisos y hosts

El manifiesto declara `"hosts": []`: los enlaces que escribe la persona cuentan como los únicos hosts
a los que llega el plugin. Además declara:

| Campo | Para qué |
| --- | --- |
| `"browser": true` | Permite abrir páginas ocultas con `kino.browser.capture` (apiVersion 6, Kino 0.9.50 o más nuevo). |
| `"streamHosts": "any"` | El video que encuentra la página puede estar en cualquier servidor público. |
| `"liveStreamHosts": "any"` | Lo mismo para el stream de un canal en vivo (necesita la capacidad `channels`). |

Por eso Kino muestra **en rojo** varias líneas antes de instalar (por ejemplo, que puede abrir
páginas web ocultas para encontrar el video y reproducir video desde cualquier servidor), y vuelve a
pedir aprobación en una actualización que agregue alguna. La página inicial que abre el plugin es siempre
la que tú escribiste; después puede cargar scripts y video desde cualquier servidor público, pero nunca
desde la red de tu casa.

## Límites

Lo que el navegador oculto no puede hacer, según la guía de Kino:

- **No resuelve captchas.** Si la página pide "confirma que eres humano" (CAPTCHA, Turnstile,
  hCaptcha…), la captura termina de inmediato con `blocked` y el canal no reproduce.
- **No reproduce lo cifrado dentro de la página.** El plugin entrega la URL del stream al reproductor de
  Kino. Si el embed descifra el video con su propio código (por ejemplo, con WASM) y no solo firma la
  URL, el reproductor de Kino recibirá datos que no sabe abrir.
- **No sirve para DRM, ni para sitios que piden login ajeno.** Un plugin solo puede llegar a lo que
  la persona igual podría ver.
- **Una sola página oculta a la vez** en toda la app. Cada captura espera hasta 22 s, y la llamada
  completa a `resolve` tiene un máximo de 75 s.
- Algunas cajas de TV no tienen WebView (`browser_unavailable`), y el kit de pruebas de Node tampoco: la
  captura solo se puede probar en un celular con Kino.
- Si el stream se corta, Kino vuelve a llamar a `resolve` a los 2, 4 y 8 s antes de rendirse.

Cada embed puede comportarse distinto: unos pueden funcionar y otros no.

## Instalar en Kino

En Kino abre Ajustes ▸ Plugins y escribe la dirección de este repositorio:

```
JuanDEVYT/<nombre-de-este-repositorio>
```

Kino lee `kino-plugin.json` y `plugin.js` de la raíz del repositorio, muestra lo que el plugin podrá
hacer y pide aprobación antes de ejecutar nada. Después, entra a Configurar y agrega tus embeds.

El ícono (`icono.png`) tiene que estar en la raíz, ser un PNG cuadrado de máximo 128 KB y estar
referenciado en el manifiesto como `"icon": "icono.png"`, sin `./` al principio.

## Desarrollo

La documentación oficial está en <https://kinotvapp.github.io/kino-plugins/>. Las páginas que más
importan para este plugin:

- [Manifiesto](https://kinotvapp.github.io/kino-plugins/manifest/): campos, ajustes de tipo `list` y `select`, `hosts`.
- [Contrato](https://kinotvapp.github.io/kino-plugins/contract/): lo que devuelven `home`, `resolve` y el `Stream`.
- [Navegador oculto](https://kinotvapp.github.io/kino-plugins/browser/): `kino.browser.capture`, tiempos y errores (`blocked`, `timeout`, `busy`, `browser_unavailable`).
- [Canales en vivo](https://kinotvapp.github.io/kino-plugins/live-channels/): `liveCategories`, `liveChannels` y `liveStreamHosts`.

Para validar el manifiesto en tu computador (Node 18 o más nuevo, con la carpeta `sdk/` de la
plantilla de la que partiste):

```
node sdk/validate.mjs .
```

Cada cambio en el plugin necesita subir `version` en `kino-plugin.json`: Kino solo instala una
actualización si el número es mayor. No cambies el `id` (`juan-embeds`) cuando ya haya gente que lo
instaló, porque Kino lo trataría como otro plugin.

## Sobre el contenido

Este plugin no aloja ni distribuye video: solo abre los enlaces que tú escribes y entrega al
reproductor de Kino lo que esa página pide. Lo que se reproduzca depende de cada fuente y de los
derechos que tengas sobre ella. Úsalo solo con embeds a los que tengas derecho a acceder.
