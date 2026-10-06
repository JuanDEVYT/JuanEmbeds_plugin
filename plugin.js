// Juan Embeds: reproduce el stream de embeds cuyos enlaces pone la persona en Ajustes.

function donde() {
  const d = kino.config.get("donde");
  return d === "home" || d === "live" ? d : "ambos";
}

// id estable a partir de la URL (no cambia si la persona reordena la lista).
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// Lista normalizada: [{ id, nombre, url }], sin entradas vacías ni ids repetidos.
function embeds() {
  const raw = kino.config.get("embeds");
  if (!Array.isArray(raw)) return [];
  const vistos = {};
  const out = [];
  raw.forEach((e, i) => {
    const url = String((e && e.url) || "").trim();
    if (!url) return;
    let id = "e" + hash(url);
    if (vistos[id]) {
      vistos[id] += 1;
      id = id + "-" + vistos[id];
    } else {
      vistos[id] = 1;
    }
    const nombre = String((e && e.nombre) || "").trim() || "Embed " + (i + 1);
    out.push({ id, nombre, url });
  });
  return out;
}

// Fila en Inicio (ítems kind: "live", apiVersion 6).
export async function home() {
  if (donde() === "live") return [];
  const lista = embeds();
  if (lista.length === 0) return [];
  return [
    {
      id: "en-vivo",
      title: "En vivo",
      items: lista.map((e) => ({ id: e.id, ref: e.id, title: e.nombre, kind: "live" })),
    },
  ];
}

// Pestaña En vivo (capacidad "channels").
export async function liveCategories() {
  if (donde() === "home") return [];
  return [{ id: "embeds", title: "Embeds" }];
}

export async function liveChannels({ categoryId }) {
  if (donde() === "home" || categoryId !== "embeds") return { items: [] };
  return {
    items: embeds().map((e, i) => ({
      id: e.id,
      title: e.nombre,
      number: i + 1,
      categoryId: "embeds",
      ref: e.id,
    })),
  };
}

// El ref es el id del embed: se busca su enlace en los ajustes al reproducir.
export async function resolve(ref) {
  const e = embeds().find((x) => x.id === ref);
  if (!e) {
    await null; // nunca lances antes del primer await (Kino 0.9.49 y anteriores)
    throw kino.error("not_found", "ese embed ya no está en los ajustes");
  }
  if (!e.url.startsWith("https://")) {
    await null;
    throw kino.error("unavailable", "el enlace del embed no es https");
  }

  let page;
  try {
    page = await kino.browser.capture(e.url, { timeoutMs: 22000 });
  } catch (err) {
    if (err && err.code === "blocked") {
      throw kino.error("unavailable", "blocked: el reproductor pide verificación");
    }
    if (err && err.code === "timeout") {
      throw kino.error("unavailable", "timeout: no apareció ninguna petición de video");
    }
    if (err && err.code === "browser_unavailable") {
      throw kino.error("unavailable", "este dispositivo no tiene navegador oculto");
    }
    throw err;
  }

  const media = page && page.media ? page.media : [];
  if (media.length === 0) {
    throw kino.error("not_found", "la página no pidió ningún video");
  }

  const [first] = media; // manifiestos (HLS/DASH) primero
  return { url: first.url, headers: first.headers };
}
