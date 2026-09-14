# Self-hosting flogg

Runs as three containers (`docker-compose.yml`): `app` (Express API + built React SPA),
`db` (Postgres 16), and `tunnel` (cloudflared → `flogg.shelbyklein.com`).

- **Host:** Beelink (`ssh beelink`), project at `~/flogg`, secrets in `~/flogg/.env` (see `.env.example`).
- **Tunnel:** Cloudflare tunnel `flogg` (remotely managed), ingress `flogg.shelbyklein.com → http://app:3000`.
- **Local access on the Beelink:** http://localhost:3010
- **Data:** Docker volumes `flogg_pgdata` and `flogg_uploads`.

## Auth
Built-in email + password accounts (replaced Replit-managed Clerk). The first account
registered becomes admin. Set `ALLOW_SIGNUPS=false` in `.env` to close registration.

## Deploy
```bash
./deploy.sh
```

## Backup
```bash
ssh beelink 'cd ~/flogg && docker compose exec -T db pg_dump -U flogg flogg' > flogg-$(date +%F).sql
```
