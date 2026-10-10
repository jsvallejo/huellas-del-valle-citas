// Función de Vercel: recibe la solicitud de la página y la reenvía al webhook de Make.
// La URL del webhook NO está en el código: se lee de la variable de entorno MAKE_WEBHOOK_URL.

const CAMPOS = ["propietario", "correo", "mascota", "especie", "servicio", "fecha", "hora"];

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ estado: "ERROR", mensaje: "Método no permitido" });
  }

  const url = process.env.MAKE_WEBHOOK_URL;
  if (!url) {
    return res.status(500).json({ estado: "ERROR", mensaje: "Falta configurar MAKE_WEBHOOK_URL en Vercel" });
  }

  // Vercel entrega el cuerpo ya interpretado (objeto) o como texto, según el tipo de contenido.
  const cuerpo = typeof req.body === "string"
    ? Object.fromEntries(new URLSearchParams(req.body))
    : (req.body || {});

  // Solo se reenvían los 7 campos esperados, sin espacios sobrantes y con un largo máximo.
  const datos = new URLSearchParams();
  for (const campo of CAMPOS) {
    const valor = String(cuerpo[campo] ?? "").trim();
    if (!valor) {
      return res.status(400).json({ estado: "ERROR", mensaje: `Falta el campo ${campo}` });
    }
    datos.append(campo, valor.slice(0, 200));
  }

  try {
    const respuesta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: datos.toString(),
      signal: AbortSignal.timeout(9000),
    });
    const texto = await respuesta.text();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(respuesta.ok ? 200 : 502).send(texto);
  } catch (error) {
    return res.status(504).json({ estado: "ERROR", mensaje: "El sistema de agendamiento no respondió a tiempo" });
  }
};
