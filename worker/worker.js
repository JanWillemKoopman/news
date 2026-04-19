export default {
  async fetch(request, env) {
    const allowedOrigins = [
      "https://janwillemkoopman.github.io",
      "http://localhost:8000",
      "http://127.0.0.1:8000",
    ];

    const origin = request.headers.get("Origin") ?? "";
    const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    const corsHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (!allowedOrigins.includes(origin)) {
      return json({ error: "Forbidden origin" }, 403, corsHeaders);
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, corsHeaders);
    }

    if (!env.GEMINI_API_KEY) {
      return json({ error: "Server misconfigured: GEMINI_API_KEY missing" }, 500, corsHeaders);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, corsHeaders);
    }

    const { vehicle, fuel } = payload ?? {};
    if (!vehicle) {
      return json({ error: "Missing vehicle data" }, 400, corsHeaders);
    }

    const prompt =
      "Je krijgt RDW open-data van een Nederlands voertuig. " +
      "Schrijf een korte, natuurlijke samenvatting in het Nederlands (4-6 zinnen) " +
      "die merk, model, bouwjaar, kleur, brandstof, milieuklasse, APK-vervaldatum " +
      "en opvallende specs noemt waar relevant. Gebruik geen bullets, gewoon vloeiende tekst.\n\n" +
      "Voertuig:\n" + JSON.stringify(vehicle, null, 2) +
      (fuel ? "\n\nBrandstof/milieu:\n" + JSON.stringify(fuel, null, 2) : "");

    const geminiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      encodeURIComponent(env.GEMINI_API_KEY);

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return json({ error: "Gemini API fout", detail: errText }, 502, corsHeaders);
    }

    const data = await geminiRes.json();
    const summary =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
      "Geen samenvatting beschikbaar.";

    return json({ summary }, 200, corsHeaders);
  },
};

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
