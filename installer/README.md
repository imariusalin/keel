# Keel installer

Tiny hosting panel for Ubuntu 22.04/24.04 and Debian 12/13.

## Install (about five minutes)

On a **fresh VPS as root**:

```bash
git clone https://github.com/imariusalin/keel.git
cd keel
sudo bash install.sh
```

The script installs nginx, PHP-FPM 8.1–8.4, Node 18/20/22, UFW, Fail2ban, and (optionally) Postfix/Dovecot and Bind. It builds this panel, puts it behind nginx, and locks incoming traffic to SSH/HTTP/HTTPS plus mail/DNS if those modules are on.

Then open `http://<server-ip>/` and finish hostname, modules, isolation.

## What happens when you click in the panel

The panel writes `/var/lib/keel/state.json` and runs `sudo keel apply`:

- **Sites** — system user, home jail, dedicated PHP-FPM pool, nginx vhost, optional Let’s Encrypt
- **Node apps** — unprivileged systemd unit + reverse proxy
- **Firewall** — UFW, default deny (22/80/443 always stay open)
- **Mail** — Postfix virtual mailboxes
- **DNS** — Bind master zones

Managed files live under `/etc/nginx/keel.d`, `/etc/nginx/keel-apps.d`, and `/etc/php/*/fpm/pool.d/keel-*`. Distro defaults are left alone.

## Commands

```bash
sudo keel apply          # rewrite the stack from panel state
sudo keel apply --dry-run
sudo keel doctor
sudo keel status
```

## Layout

| Path | Role |
|---|---|
| `/opt/keel` | panel code |
| `/var/lib/keel` | database + state |
| `/usr/local/sbin/keel-apply` | apply engine |
| `/home/<site-user>/www` | site files |

Sites never run as root. Each site is its own Unix user.

## Notes

- Run on a **new** machine. The installer resets UFW.
- Port 22 is always left open.
- `.example`, `.local`, and `.test` domains skip Let’s Encrypt.
