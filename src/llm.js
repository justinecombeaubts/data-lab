const API_URL = process.env.LLM_API_URL || "https://ollama.com/v1/chat/completions";
const MODEL = process.env.LLM_MODEL || "gpt-oss:120b";
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const DELAYS = [2000, 6000, 15000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Appelle le modèle (API compatible OpenAI, Ollama par défaut).
 * Réessaie après 2 s, 6 s puis 15 s si le service est saturé (quota ou surcharge).
 */
export async function callLLM(system, user) {
  if (!process.env.OLLAMA_API_KEY) throw new Error("Clé manquante : définis OLLAMA_API_KEY (secret GitHub ou fichier .env)");
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    }
    const body = (await res.text()).slice(0, 300);
    if (!RETRYABLE.has(res.status) || attempt >= DELAYS.length) throw new Error(`API ${res.status} : ${body}`);
    console.warn(`   ↻ API ${res.status}, nouvel essai dans ${DELAYS[attempt] / 1000} s`);
    await sleep(DELAYS[attempt]);
  }
}
