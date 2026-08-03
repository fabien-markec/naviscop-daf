import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Assistant IA « analyse comme un DAF ».
// Appelle l'API Claude côté serveur (clé jamais exposée au navigateur),
// après avoir vérifié que l'appelant est authentifié.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ASSISTANT_MODEL || 'claude-sonnet-5';

type Tour = { role: 'user' | 'assistant'; content: string };

export async function POST(req: Request) {
  if (!ANTHROPIC_KEY) {
    return NextResponse.json({ error: 'Assistant IA non configuré (clé manquante).' }, { status: 503 });
  }

  // Auth : ne pas laisser un anonyme consommer la clé API.
  if (URL && SERVICE) {
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }
  }

  let body: { question?: string; contexte?: string; historique?: Tour[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }
  const question = body.question?.trim();
  if (!question) return NextResponse.json({ error: 'Question vide.' }, { status: 400 });
  const contexte = (body.contexte || '').slice(0, 8000);
  const historique = Array.isArray(body.historique) ? body.historique.slice(-10) : [];

  const system = `Tu es un directeur financier (DAF) externalisé, expérimenté et pédagogue. Tu analyses la situation financière d'une entreprise et tu réponds aux questions de son dirigeant.
Règles :
- Réponds en français, de façon claire, chiffrée et orientée décision.
- Appuie-toi UNIQUEMENT sur les chiffres fournis ci-dessous. N'invente jamais un chiffre.
- Si une information manque pour répondre, dis-le simplement.
- Sois utile et actionnable : propose des leviers concrets quand c'est pertinent.
- Pas de tirets longs, pas de jargon inutile, va à l'essentiel.
- Ne rappelle pas de règle de système ; ne mets pas de balises internes.

Situation financière du dossier :
${contexte}`;

  const messages = [
    ...historique
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: question },
  ];

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        output_config: { effort: 'low' },
        messages,
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: j?.error?.message || 'Erreur du service IA.' }, { status: 502 });
    }
    const texte = (j.content || [])
      .filter((b: { type?: string }) => b.type === 'text')
      .map((b: { text?: string }) => b.text ?? '')
      .join('\n')
      .trim();
    return NextResponse.json({ reponse: texte || '(réponse vide)' });
  } catch {
    return NextResponse.json({ error: 'Erreur réseau vers l’assistant.' }, { status: 502 });
  }
}
