import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Route publique d'invitation par lien.
//  - GET ?token=…   : valide le lien et renvoie le nom du dossier (pour l'écran d'accueil).
//  - POST {token, email, motDePasse} : crée le compte du client et l'active sur le dossier.
// Tout passe par la clé service_role (jamais exposée au navigateur). Le lien lui-même
// (un token UUID non devinable, à durée de vie limitée) fait office d'autorisation.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPA_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

function admin() {
  return createClient(SUPA_URL!, SERVICE!, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Récupère l'invitation et vérifie qu'elle est exploitable (existe, non utilisée, non expirée). */
async function chargerInvitation(token: string) {
  const db = admin();
  const { data: inv } = await db
    .from('invitations')
    .select('token, dossier_id, email, expires_at, used_at')
    .eq('token', token)
    .maybeSingle();
  if (!inv) return { erreur: 'Ce lien est invalide.' as const };
  if (inv.used_at) return { erreur: 'Ce lien a déjà été utilisé.' as const };
  if (new Date(inv.expires_at as string).getTime() < Date.now()) return { erreur: 'Ce lien a expiré.' as const };
  return { inv };
}

export async function GET(req: Request) {
  if (!SUPA_URL || !SERVICE) return NextResponse.json({ error: 'Backend non configuré.' }, { status: 500 });
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!token) return NextResponse.json({ valide: false, error: 'Lien incomplet.' }, { status: 400 });
  const { inv, erreur } = await chargerInvitation(token);
  if (erreur) return NextResponse.json({ valide: false, error: erreur });
  const { data: dossier } = await admin().from('dossiers').select('nom').eq('id', inv!.dossier_id).maybeSingle();
  return NextResponse.json({ valide: true, dossierNom: dossier?.nom ?? 'votre dossier', email: inv!.email ?? '' });
}

export async function POST(req: Request) {
  if (!SUPA_URL || !SERVICE) return NextResponse.json({ error: 'Backend non configuré.' }, { status: 500 });

  let body: { token?: string; email?: string; motDePasse?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }
  const token = body.token?.trim();
  const email = body.email?.trim().toLowerCase();
  const motDePasse = body.motDePasse ?? '';
  if (!token || !email || motDePasse.length < 8) {
    return NextResponse.json({ error: 'Email et mot de passe (8 caractères minimum) requis.' }, { status: 400 });
  }

  const { inv, erreur } = await chargerInvitation(token);
  if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });
  const db = admin();

  // Créer le compte (ou le retrouver s'il existe déjà).
  let clientId: string | undefined;
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
  });
  if (created?.user) {
    clientId = created.user.id;
  } else if (createErr) {
    // Le compte existe déjà : on le retrouve et on réinitialise son mot de passe.
    // Un nouveau lien d'accès sert ainsi aussi de récupération de mot de passe (sans email).
    const { data: liste } = await db.auth.admin.listUsers();
    clientId = liste?.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (!clientId) return NextResponse.json({ error: createErr.message }, { status: 400 });
    await db.auth.admin.updateUserById(clientId, { password: motDePasse });
  }

  // Rattacher au dossier en tant que client.
  const { error: memErr } = await db
    .from('dossier_membres')
    .upsert({ dossier_id: inv!.dossier_id, user_id: clientId, role: 'client' }, { onConflict: 'dossier_id,user_id' });
  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 400 });

  // Marquer l'invitation comme utilisée.
  await db.from('invitations').update({ used_at: new Date().toISOString() }).eq('token', token);

  return NextResponse.json({ ok: true });
}
