#!/bin/bash
# Security and installer-script checks. Run as root in the test container.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INS="$ROOT/installer"
fail() { printf 'FAIL %s\n' "$*" >&2; exit 1; }
pass() { printf 'ok   %s\n' "$*"; }

echo "== syntax"
python3 -m py_compile "$INS/keel-files" "$INS/keel-backup"
bash -n "$INS/keel-apply"
bash -n "$INS/keel"
bash -n "$INS/install.sh"
pass "python/bash syntax"

echo "== sudoers"
grep -q 'NOPASSWD: /usr/local/sbin/keel-backup run \*' "$INS/templates/sudoers" \
  || fail "sudoers must pin keel-backup run/cron"
grep -q 'NOPASSWD: /usr/local/sbin/keel-backup cron' "$INS/templates/sudoers" \
  || fail "sudoers must pin keel-backup cron"
pass "sudoers pins backup argv"

echo "== keel-files jail"
id -u s_demo >/dev/null 2>&1 || useradd --home /home/s_demo --create-home --shell /usr/sbin/nologin s_demo
mkdir -p /home/s_demo/www/css
printf 'secret\n' >/home/s_demo/www/index.php
printf 'nope\n' >/etc/keel-jail-secret
chown -R s_demo:s_demo /home/s_demo
chmod 750 /home/s_demo /home/s_demo/www

list_json="$(printf '%s' '{"op":"list","root":"/home/s_demo/www","rel":"/"}' | python3 "$INS/keel-files")"
echo "$list_json" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("ok") is True; names={e["name"] for e in d["entries"]}; assert "index.php" in names'
pass "list jail"

if printf '%s' '{"op":"read","root":"/home/s_demo/www","rel":"../../etc/keel-jail-secret"}' | python3 "$INS/keel-files" >/tmp/keel-files.out 2>/tmp/keel-files.err; then
  if python3 -c 'import json; d=json.load(open("/tmp/keel-files.out")); raise SystemExit(0 if d.get("ok") is False else 1)'; then
    pass "escape via .. rejected"
  else
    fail "path escape succeeded"
  fi
else
  pass "escape via .. rejected (nonzero)"
fi

if printf '%s' '{"op":"read","root":"/etc","rel":"/passwd"}' | python3 "$INS/keel-files" >/tmp/keel-files.out 2>/tmp/keel-files.err; then
  python3 -c 'import json; d=json.load(open("/tmp/keel-files.out")); assert d.get("ok") is False' \
    || fail "non-jail root was allowed"
  pass "non-jail root rejected"
else
  pass "non-jail root rejected (nonzero)"
fi

echo "== keel-backup path jail"
mkdir -p /var/lib/keel /tmp/keel-b
export KEEL_STATE=/tmp/keel-state.json
export KEEL_BACKUP_ROOT=/tmp/keel-b
cat >"$KEEL_STATE" <<'JSON'
{
  "modules": {},
  "sites": [{"domain":"evil.test","systemUser":"../../../../etc"}],
  "apps": [],
  "backups": [{"id":1,"name":"t","scope":"all","enabled":true,"retain":3,"includeMail":false}]
}
JSON
python3 "$INS/keel-backup" run 1 >/tmp/keel-b1.json
python3 - <<'PY'
import json, tarfile, glob
d = json.load(open("/tmp/keel-b1.json"))
assert d.get("localOk") is True, d
assert str(d.get("localPath") or "").startswith("/tmp/keel-b"), d
paths = glob.glob("/tmp/keel-b/*/*.tar.gz")
assert paths, "no archive"
with tarfile.open(paths[0], "r:gz") as t:
    names = t.getnames()
assert not any("passwd" in n.split("/")[-1] and "etc" in n for n in names), names
PY
pass "backup refuses /etc via systemUser traversal"

# A real jail user should be included
id -u s_ok >/dev/null 2>&1 || useradd --home /home/s_ok --create-home --shell /usr/sbin/nologin s_ok
mkdir -p /home/s_ok/www
echo 'ok' >/home/s_ok/www/index.php
chown -R s_ok:s_ok /home/s_ok
cat >"$KEEL_STATE" <<'JSON'
{
  "modules": {},
  "sites": [{"domain":"ok.test","systemUser":"s_ok"}],
  "apps": [],
  "backups": [{"id":2,"name":"ok","scope":"all","enabled":true,"retain":3,"includeMail":false}]
}
JSON
python3 "$INS/keel-backup" run 2 >/tmp/keel-b2.json
python3 - <<'PY'
import json, tarfile, glob
d=json.load(open("/tmp/keel-b2.json"))
assert d.get("localOk") is True
paths=glob.glob("/tmp/keel-b/2-ok/*.tar.gz")
assert paths
with tarfile.open(paths[0],"r:gz") as t:
    names=t.getnames()
assert any("index.php" in n for n in names), names
PY
pass "backup includes real site jail"

echo "== keel-apply dry-run"
command -v nginx >/dev/null || { echo "skip apply (no nginx)"; exit 0; }
mkdir -p /usr/local/share/keel/templates /var/lib/keel
cp -a "$INS/templates/." /usr/local/share/keel/templates/
export KEEL_STATE=/tmp/keel-apply-state.json
export KEEL_TEMPLATES=/usr/local/share/keel/templates
cat >"$KEEL_STATE" <<'JSON'
{
  "settings": {"hostname":"panel.test","isolation":true,"sshPort":22,"autoUpdates":true},
  "modules": {"php":true,"node":false,"firewall":false,"mail":false,"dns":false,"ssl":false,"redis":false,"backups":false},
  "sites": [],
  "apps": [],
  "firewall": [],
  "mailboxes": [],
  "cron": [],
  "backups": [],
  "dns": {"zones": []}
}
JSON
bash "$INS/keel-apply" --dry-run >/tmp/keel-apply.out
grep -q 'keel-apply: applying' /tmp/keel-apply.out || fail "apply dry-run did not run"
pass "keel-apply --dry-run"

echo "== all installer security tests passed"
