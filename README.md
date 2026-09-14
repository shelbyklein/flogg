# flogg

A mobile-friendly 3D printing change log. Record the filament and print settings you used, attach photos, and compare what changed from one print to the next.

- Filament timelines with setting diffs between log entries
- Grouped print settings (retraction, quality, strength, speed)
- Photo capture and cropping
- Printer management
- Multi-user with an admin panel
- Dark and light themes

## Stack

pnpm monorepo: React + Vite frontend (`artifacts/filament-log`), Express 5 API (`artifacts/api-server`), PostgreSQL + Drizzle ORM (`lib/db`).

## Self-hosting

```bash
cp .env.example .env   # set POSTGRES_PASSWORD (and TUNNEL_TOKEN if you use Cloudflare Tunnel)
docker compose up -d --build
```

The app is then available at http://localhost:3010. The first account you register becomes the admin. See [DEPLOY.md](DEPLOY.md) for details. If you don't use Cloudflare Tunnel, remove the `tunnel` service from `docker-compose.yml`.

## License

flogg is **source-available** under the [PolyForm Noncommercial License 1.0.0](LICENSE.md).

You're welcome to copy, modify, fork and self-host it for any **noncommercial** purpose, such as personal use, hobby projects, study, or use by nonprofits and schools. Share your changes under the same terms and keep the `Required Notice` line.

**Commercial use needs separate permission.** That includes selling it, offering it as a paid or ad-supported service, or using it inside a business. Open an issue to ask.

### Name and logo

The license covers the code. It does not grant rights to the **flogg** name or logo. If you publish a fork, please give it a different name and branding.
