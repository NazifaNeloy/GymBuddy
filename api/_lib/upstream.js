// Calls to Supabase (as the signed-in user) and to Gemini.

/** Verify the user's access token with Supabase Auth. Returns the user or null. */
export async function getSupabaseUser({ supabaseUrl, supabaseKey, token, fetchImpl = fetch }) {
  const res = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id ? user : null;
}

/** Built-in exercises, read with the user's token so RLS applies. */
export async function fetchBuiltInExercises({ supabaseUrl, supabaseKey, token, fetchImpl = fetch }) {
  const url = `${supabaseUrl}/rest/v1/exercises?select=id,slug,name,primary_muscle,equipment,tracking&user_id=is.null&deleted_at=is.null`;
  const res = await fetchImpl(url, { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Supabase exercises request failed (${res.status})`);
  return res.json();
}

/** Ask Gemini for JSON matching `schema`. Returns the parsed object. */
export async function generateJson({ apiKey, model, prompt, schema, fetchImpl = fetch, timeoutMs = 25_000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.4 },
      }),
    });
    if (res.status === 429) {
      const err = new Error('Gemini quota reached');
      err.status = 429;
      throw err;
    }
    if (!res.ok) throw new Error(`Gemini request failed (${res.status})`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}
