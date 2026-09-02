#!/usr/bin/env bash
#
# Déploiement fiable de NAVISCOP sur le VPS de Michael.
#
# Pourquoi ce script : l'IP du VPS est parfois bloquée en accès anonyme par GitHub,
# donc `git pull` échoue par intermittence ("could not read Username"). On ne dépend
# donc PAS du pull : on transfère un bundle git par SSH (toujours fiable), puis on
# build et on swap le conteneur. Aucun secret ne quitte la machine (la clé anon et la
# service_role sont lues sur le VPS ; l'env runtime de l'ancien conteneur est préservé).
#
# Usage : depuis la racine du repo, `bash deploy-vps.sh`
set -euo pipefail

VPS=root@31.97.69.111
APP=/opt/naviscop-app
SUPA_URL=https://srv1842768.hstgr.cloud

echo "==> Vérifications locales (typecheck + tests moteur)"
( cd finance-engine && node --test >/dev/null 2>&1 && echo "    moteur OK" ) || { echo "    ÉCHEC tests moteur"; exit 1; }
( cd app && node_modules/.bin/tsc.CMD --noEmit ) && echo "    typecheck OK" || { echo "    ÉCHEC typecheck"; exit 1; }

BUNDLE=$(mktemp -t naviscop-XXXXXX).bundle
echo "==> Bundle git (main) -> $BUNDLE"
git bundle create "$BUNDLE" main >/dev/null

echo "==> Transfert du bundle vers le VPS"
scp -o StrictHostKeyChecking=no "$BUNDLE" "$VPS:/tmp/naviscop.bundle" >/dev/null
rm -f "$BUNDLE"

echo "==> Fetch + build + swap sur le VPS"
ssh -o StrictHostKeyChecking=no "$VPS" bash -s <<EOF
set -euo pipefail
cd $APP
git fetch /tmp/naviscop.bundle main
git reset --hard FETCH_HEAD
echo "    commit : \$(git log --oneline -1)"

# On extrait la clé anon par grep (sourcer le .env échoue sous set -e : il contient des lignes non-shell).
ANON=\$(grep -E '^ANON_KEY=' /opt/naviscop-supabase/.env | head -1 | cut -d= -f2-)
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=$SUPA_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="\$ANON" \
  -t naviscop-app:new . >/dev/null
echo "    build OK"

CUR=\$(docker inspect naviscop-app --format '{{.Image}}')
docker tag "\$CUR" naviscop-app:rollback
docker inspect naviscop-app --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E '^(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|ASSISTANT_MODEL|ANTHROPIC_API_KEY)=' > /tmp/naviscop.env
docker stop naviscop-app >/dev/null && docker rm naviscop-app >/dev/null
docker tag naviscop-app:new naviscop-app:latest
docker run -d --name naviscop-app --restart unless-stopped -p 127.0.0.1:3000:3000 --env-file /tmp/naviscop.env naviscop-app:latest >/dev/null
rm -f /tmp/naviscop.env /tmp/naviscop.bundle

sleep 9
echo "    HTTP local : \$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000)"
echo "    HTTPS      : \$(curl -s -o /dev/null -w '%{http_code}' $SUPA_URL)"
echo "    statut     : \$(docker ps --filter name=naviscop-app --format '{{.Status}}')"
EOF

echo "==> Déploiement terminé. Rollback dispo : docker tag naviscop-app:rollback naviscop-app:latest && recréer le conteneur."
