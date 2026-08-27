#!/bin/bash
# Keel installer — Ubuntu 22.04/24.04 and Debian 12/13.
# Run from the repo: sudo bash install.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
VERSION="$(cat "$HERE/VERSION" 2>/dev/null || echo 0.1.0)"
export DEBIAN_FRONTEND=noninteractive

KEEL_LOG="${KEEL_LOG:-/var/log/keel-install.log}"
KEEL_PROGRESS="${KEEL_PROGRESS:-/run/keel-install.progress}"
STEP=0

log()  {
  STEP=$((STEP + 1))
  printf '%s\t%s\n' "$STEP" "$*" >"$KEEL_PROGRESS" 2>/dev/null || true
  printf '\n==> %s\n' "$*"
}
die()  { printf 'keel: %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

[ "$(id -u)" -eq 0 ] || die "Run as root (sudo bash install.sh)."
[ -f /etc/os-release ] || die "Need /etc/os-release."
# shellcheck disable=SC1091
. /etc/os-release

case "${ID:-}-${VERSION_ID:-}" in
  ubuntu-22.04|ubuntu-24.04|debian-12|debian-13) ;;
  *)
    die "Supported: Ubuntu 22.04/24.04 and Debian 12/13. Found ${ID:-unknown} ${VERSION_ID:-}."
    ;;
esac

# Quiet TUI: real work runs in the background; this process only draws a bar.
if [ "${KEEL_INNER:-0}" != "1" ] && [ "${KEEL_VERBOSE:-0}" != "1" ]; then
  mkdir -p /var/log /run
  : >"$KEEL_LOG"
  printf '0\tStarting\n' >"$KEEL_PROGRESS"
  export KEEL_INNER=1
  bash "$0" "$@" >>"$KEEL_LOG" 2>&1 &
  worker=$!
  TOTAL=16
  tput civis 2>/dev/null || true
  trap 'tput cnorm 2>/dev/null || true' EXIT
  while kill -0 "$worker" 2>/dev/null; do
    n=0; msg="Working"
    if [ -f "$KEEL_PROGRESS" ]; then
      n="$(cut -f1 "$KEEL_PROGRESS" | tail -1)"
      msg="$(cut -f2- "$KEEL_PROGRESS" | tail -1)"
    fi
    n="${n:-0}"
    [ "$n" -gt "$TOTAL" ] 2>/dev/null && TOTAL="$n"
    pct=$((n * 100 / TOTAL))
    [ "$pct" -gt 100 ] && pct=100
    filled=$((pct / 5))
    bar=""
    i=0
    while [ "$i" -lt 20 ]; do
      if [ "$i" -lt "$filled" ]; then bar="${bar}█"; else bar="${bar}░"; fi
      i=$((i + 1))
    done
    printf '\033[2J\033[H'
    cat <<'LOGO'

    _  __          _
   | |/ /___  ___ | |
   | ' // _ \/ _ \| |
   | . \  __/  __/ | |
   |_|\_\___|\___|_|_|
          hosting panel

LOGO
    printf '   %s  %s%%\n' "$bar" "$pct"
    printf '   %s\n' "$msg"
    sleep 0.4
  done
  set +e
  wait "$worker"
  code=$?
  set -e
  tput cnorm 2>/dev/null || true
  printf '\033[2J\033[H'
  cat <<'LOGO'

    _  __          _
   | |/ /___  ___ | |
   | ' // _ \/ _ \| |
   | . \  __/  __/ | |
   |_|\_\___|\___|_|_|

LOGO
  if [ "$code" -ne 0 ]; then
    printf '   Install failed.\n   Log: %s\n\n' "$KEEL_LOG"
    tail -n 12 "$KEEL_LOG" | sed 's/^/   /'
    exit "$code"
  fi
  if [ -f /var/lib/keel/credentials ]; then
    # shellcheck disable=SC1091
    . /var/lib/keel/credentials
    printf '   Keel is ready.\n\n'
    printf '   URL      %s\n' "${url:-http://server/}"
    printf '   Email    %s\n' "${email:-admin}"
    printf '   Password %s\n\n' "${password:-}"
    printf '   Saved at /var/lib/keel/credentials  (root only)\n\n'
  else
    printf '   Installed. Open http://%s/\n\n' "$(hostname -I | awk '{print $1}')"
  fi
  exit 0
fi

HOSTNAME_FQDN="${KEEL_HOSTNAME:-$(hostname -f 2>/dev/null || hostname)}"
MODULES_CSV="${KEEL_MODULES:-php,node,firewall,ssl,mail,dns}"
PANEL_PORT="${KEEL_PANEL_PORT:-9090}"

log "Keel ${VERSION} on ${PRETTY_NAME}"
log "Hostname ${HOSTNAME_FQDN}"

apt-get update -y
apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg apt-transport-https lsb-release \
  unzip jq rsync ufw fail2ban nginx certbot python3-certbot-nginx \
  unattended-upgrades apt-listchanges \
  build-essential python3

# PHP 8.1–8.4 (Ondřej / Sury)
log "PHP repositories"
if [ "${ID}" = "ubuntu" ]; then
  apt-get install -y --no-install-recommends software-properties-common
  add-apt-repository -y ppa:ondrej/php
else
  curl -fsSLo /tmp/debsuryorg-archive-keyring.deb https://packages.sury.org/debsuryorg-archive-keyring.deb
  dpkg -i /tmp/debsuryorg-archive-keyring.deb
  sh -c "echo 'deb https://packages.sury.org/php/ $(lsb_release -sc) main' > /etc/apt/sources.list.d/php.list"
fi
apt-get update -y

PHP_PKGS=""
for ver in 8.1 8.2 8.3 8.4; do
  PHP_PKGS="$PHP_PKGS php${ver}-fpm php${ver}-cli php${ver}-common php${ver}-curl php${ver}-mbstring php${ver}-xml php${ver}-zip php${ver}-gd php${ver}-intl php${ver}-bcmath php${ver}-opcache php${ver}-sqlite3 php${ver}-mysql php${ver}-readline"
done
# shellcheck disable=SC2086
apt-get install -y --no-install-recommends $PHP_PKGS

# Node 18/20/22 via n
log "Node.js 18, 20, 22"
if [ ! -x /usr/local/bin/n ]; then
  curl -fsSL https://raw.githubusercontent.com/tj/n/master/bin/n -o /usr/local/bin/n
  chmod 0755 /usr/local/bin/n
fi
n 22
n 20
n 18
n 22
ln -sfn /usr/local/bin/node /usr/bin/node
ln -sfn /usr/local/bin/npm /usr/bin/npm

case ",$MODULES_CSV," in
  *,mail,*)
    log "Mail (Postfix + Dovecot)"
    echo "postfix postfix/main_mailer_type select Internet Site" | debconf-set-selections
    echo "postfix postfix/mailname string ${HOSTNAME_FQDN}" | debconf-set-selections
    apt-get install -y --no-install-recommends postfix dovecot-imapd dovecot-core opendkim opendkim-tools
    ;;
esac

case ",$MODULES_CSV," in
  *,dns,*)
    log "DNS (Bind9)"
    apt-get install -y --no-install-recommends bind9 bind9-utils
    ;;
esac

log "Users and directories"
id -u keel >/dev/null 2>&1 || useradd --system --home /var/lib/keel --shell /usr/sbin/nologin keel
id -u keelwww >/dev/null 2>&1 || useradd --system --home /nonexistent --shell /usr/sbin/nologin keelwww
id -u vmail >/dev/null 2>&1 || useradd --system --home /var/mail/keel --shell /usr/sbin/nologin vmail
install -d -m 0750 -o keel -g keel /var/lib/keel /var/lib/keel/pglite /var/lib/keel/apps /var/lib/keel/mail /var/lib/keel/bind /var/lib/keel/logs
install -d -m 0755 /opt/keel /etc/nginx/keel.d /etc/nginx/keel-apps.d
install -d -m 0750 -o vmail -g vmail /var/mail/keel

ADMIN_HOST="$HOSTNAME_FQDN"
case "$ADMIN_HOST" in *.*) ;; *) ADMIN_HOST="${ADMIN_HOST}.local" ;; esac
ADMIN_EMAIL="admin@${ADMIN_HOST}"
ADMIN_PASS="$(openssl rand -hex 8)"
umask 077
cat > /var/lib/keel/bootstrap-admin.json <<JSON
{"email":"${ADMIN_EMAIL}","password":"${ADMIN_PASS}","name":"Admin"}
JSON
cat > /var/lib/keel/admin.env <<ENV
KEEL_ADMIN_EMAIL=${ADMIN_EMAIL}
KEEL_ADMIN_PASSWORD=${ADMIN_PASS}
ENV
cat > /var/lib/keel/credentials <<ENV
url=http://__IP__/
email=${ADMIN_EMAIL}
password=${ADMIN_PASS}
ENV
chown keel:keel /var/lib/keel/bootstrap-admin.json /var/lib/keel/admin.env
chmod 600 /var/lib/keel/bootstrap-admin.json /var/lib/keel/admin.env /var/lib/keel/credentials

log "Copy panel to /opt/keel"
rsync -a --delete \
  --exclude node_modules --exclude .git --exclude .vercel --exclude screenshots \
  --exclude artifacts --exclude installer/install.sh --exclude .output --exclude .nitro \
  "$REPO/" /opt/keel/
install -m 0755 "$HERE/keel-apply" /usr/local/sbin/keel-apply
install -m 0755 "$HERE/keel" /usr/local/sbin/keel
install -m 0644 "$HERE/templates/sudoers" /etc/sudoers.d/keel
chmod 0440 /etc/sudoers.d/keel
visudo -cf /etc/sudoers.d/keel >/dev/null
mkdir -p /usr/local/share/keel
rsync -a "$HERE/templates/" /usr/local/share/keel/templates/
install -m 0644 "$HERE/VERSION" /usr/local/share/keel/VERSION

log "Build panel"
cd /opt/keel
# Build needs devDependencies (vite, nitro). Auth is on (email/password admin).
unset VITE_AUTH_ENABLED
export KEEL_VPS=1
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
if [ -f /opt/keel/.output/server/index.mjs ] && [ "${KEEL_REBUILD:-0}" != "1" ]; then
  log "Panel already built — skip compile (KEEL_REBUILD=1 to force)"
else
  if [ -f package-lock.json ]; then
    npm ci --no-audit --no-fund || npm install --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
  npm run build
fi
# PGlite wasm/data must sit next to the bundled module (usually _libs/).
if [ -f scripts/copy-pglite-assets.mjs ]; then
  node scripts/copy-pglite-assets.mjs
fi
if [ -d /opt/keel/.output/server ]; then
  PGLITE_DIST="$(find /opt/keel/node_modules/@electric-sql/pglite -type d -name dist 2>/dev/null | head -1 || true)"
  if [ -n "$PGLITE_DIST" ] && [ -f "$PGLITE_DIST/pglite.data" ]; then
    mkdir -p /opt/keel/.output/server/_libs /opt/keel/.output/server/chunks
    for f in pglite.wasm pglite.data initdb.wasm initdb.js; do
      if [ -f "$PGLITE_DIST/$f" ]; then
        cp -a "$PGLITE_DIST/$f" /opt/keel/.output/server/
        cp -a "$PGLITE_DIST/$f" /opt/keel/.output/server/_libs/
        cp -a "$PGLITE_DIST/$f" /opt/keel/.output/server/chunks/ || true
      fi
    done
  fi
fi
chown -R keel:keel /var/lib/keel
chown -R keel:keel /opt/keel

log "Nginx panel vhost"
# Distro welcome page wins if it stays enabled (it is also default_server).
rm -f /etc/nginx/sites-enabled/default \
      /etc/nginx/sites-enabled/default.conf \
      /etc/nginx/conf.d/default.conf
find /etc/nginx/sites-enabled -maxdepth 1 -name '*default*' -delete 2>/dev/null || true
install -m 0644 /usr/local/share/keel/templates/nginx-panel.conf /etc/nginx/sites-available/keel-panel.conf
sed -i "s/127.0.0.1:9090/127.0.0.1:${PANEL_PORT}/" /etc/nginx/sites-available/keel-panel.conf
ln -sfn /etc/nginx/sites-available/keel-panel.conf /etc/nginx/sites-enabled/keel-panel.conf
printf 'include /etc/nginx/keel.d/*.conf;\ninclude /etc/nginx/keel-apps.d/*.conf;\n' \
  > /etc/nginx/conf.d/keel-includes.conf
nginx -t

log "systemd"
if [ -f /opt/keel/.output/server/index.mjs ]; then
  EXEC="/usr/bin/node /opt/keel/.output/server/index.mjs"
else
  EXEC="/usr/bin/node /opt/keel/node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${PANEL_PORT}"
fi
PUBLIC_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
sed \
  -e "s/PORT=9090/PORT=${PANEL_PORT}/" \
  -e "s/NITRO_PORT=9090/NITRO_PORT=${PANEL_PORT}/" \
  -e "s|__HOSTNAME__|${HOSTNAME_FQDN}|" \
  -e "s|__PUBLIC_IP__|${PUBLIC_IP}|" \
  -e "s|^ExecStart=.*|ExecStart=${EXEC}|" \
  "$HERE/templates/keel-panel.service" > /etc/systemd/system/keel-panel.service
systemctl daemon-reload
systemctl enable nginx fail2ban keel-panel
systemctl restart keel-panel
# apt starts nginx with the welcome page; enable --now does not reload it.
systemctl reload nginx || systemctl restart nginx

log "Firewall"
ufw --force reset >/dev/null 2>&1 || true
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
case ",$MODULES_CSV," in *,mail,*) ufw allow 25/tcp; ufw allow 587/tcp; ufw allow 993/tcp ;; esac
case ",$MODULES_CSV," in *,dns,*) ufw allow 53 ;; esac
ufw --force enable

log "Unattended upgrades"
echo 'Unattended-Upgrade::Automatic-Reboot "false";' > /etc/apt/apt.conf.d/52keel
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true

log "Fail2ban"
systemctl enable --now fail2ban

# Empty initial state so apply is a no-op until the wizard runs
if [ ! -f /var/lib/keel/state.json ]; then
  cat > /var/lib/keel/state.json <<JSON
{"settings":{"hostname":"${HOSTNAME_FQDN}","isolation":true,"sshPort":22,"autoUpdates":true},"modules":{},"sites":[],"apps":[],"firewall":[],"mailboxes":[],"dns":{"zones":[]}}
JSON
  chown keel:keel /var/lib/keel/state.json
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [ -f /var/lib/keel/credentials ]; then
  sed -i "s|url=http://__IP__/|url=http://${IP:-127.0.0.1}/|" /var/lib/keel/credentials
fi
# Last step: always take port 80 from the distro welcome page and reload nginx.
log "Activate panel on port 80"
/usr/local/sbin/keel fix
sleep 2
if ! systemctl is-active --quiet keel-panel; then
  echo "keel-panel failed to start:"
  journalctl -u keel-panel -n 40 --no-pager || true
  die "panel service is not running"
fi
# First request creates the admin from bootstrap-admin.json
curl -sf -o /dev/null --max-time 8 "http://127.0.0.1:${PANEL_PORT}/login" || true
log "Keel is installed."
