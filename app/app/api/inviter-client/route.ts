import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Route serveur : crée le compte d'un client et le rattache à un dossier.
// Utilise la clé service_role (jamais exposée au navigateur) après avoir
// vérifié que l'appelant est bien DAF du dossier visé.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  if (!URL || !SERVICE) {
    return NextResponse.json({ error: 'Backend non configuré côté serveur.' }, { status: 500 });
  }
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. Authentifier l'appelant via son token.
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: caller, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !caller.user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  // 2. Valider l'entrée.
  let body: { dossierId?: string; email?: string; motDePasse?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }
  const dossierId = body.dossierId?.trim();
  const email = body.email?.trim().toLowerCase();
  const motDePasse = body.motDePasse ?? '';
  if (!dossierId || !email || motDePasse.length < 8) {
    return NextResponse.json({ error: 'Email et mot de passe (8 caractères min.) requis.' }, { status: 400 });
  }

  // 3. L'appelant doit être DAF du dossier.
  const { data: membre } = await admin
    .from('dossier_membres')
    .select('role')
    .eq('dossier_id', dossierId)
    .eq('user_id', caller.user.id)
    .eq('role', 'daf')
    .maybeSingle();
  if (!membre) {
    return NextResponse.json({ error: 'Accès refusé à ce dossier.' }, { status: 403 });
  }

  // 4. Créer le compte client (ou le retrouver s'il existe déjà).
  let clientId: string | undefined;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
  });
  if (created?.user) {
    clientId = created.user.id;
  } else if (createErr) {
    // déjà existant : le retrouver par email
    const { data: liste } = await admin.auth.admin.listUsers();
    clientId = liste?.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (!clientId) {
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }
  }

  // 5. Rattacher au dossier en tant que client.
  const { error: memErr } = await admin
    .from('dossier_membres')
    .upsert({ dossier_id: dossierId, user_id: clientId, role: 'client' }, { onConflict: 'dossier_id,user_id' });
  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, nouveau: Boolean(created?.user) });
}
