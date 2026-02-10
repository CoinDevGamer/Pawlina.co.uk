# Production Checklist

This project can run a small ecommerce store safely if these are completed.

## 1) Secrets and Env

- Use `server/.env.example` and `client/.env.production.example` as templates.
- Never commit real `.env` files.
- Rotate all previously exposed credentials:
  - JWT secret
  - Stripe secret key
  - Stripe webhook secret
  - SMTP password
  - Admin password
- Set strong production env values in your host dashboard.

## 2) Database Persistence

- Set `DB_PATH` to a persistent volume path in production.
- Keep `AUTO_SEED=false` in production.
- Verify app restart does not reset inventory.

## 3) Backups

- Run backup command on a schedule (daily recommended):
  - `npm run server:backup`
- Optional env:
  - `DB_BACKUP_DIR` (backup folder)
  - `DB_BACKUP_KEEP` (number of backups to retain, default 14)

## 4) Monitoring and Health

- Use uptime checks against:
  - `/api/health`
  - `/api/ready`
- Capture server logs and `server/logs/errors.log`.
- Alert on repeated 5xx responses.

## 5) Payments

- Use live Stripe keys only in production environment variables.
- Verify webhook delivery status in Stripe dashboard.
- Test complete payment flow end-to-end in live mode with low-value test product.

## 6) Pre-Deploy Checks

- Run: `npm run ci:check`
- Confirm admin add/edit/remove works.
- Confirm checkout + order creation + admin order updates.
- Confirm policy pages are reachable:
  - `/privacy`
  - `/terms`
  - `/cookies`
  - `/returns`
