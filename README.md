# Sycamore — Practical Assessment

This repository contains the practical assessment implementation for the Sycamore Backend Engineer exercise.

**What this README contains:**
- **Quick start**: install, env, run, and test commands.
- **Assessment tasks**: overview of the Idempotent Wallet and Interest Accumulator.
- **Design notes**: idempotency, concurrency control, and math precision.


**Prerequisites**
- Node.js (v18+ recommended)
- pnpm (or npm/yarn)
- PostgreSQL (local or docker)
- Redis (optional; required for idempotency cache if configured)

**Quick Start**

1. Install dependencies

```bash
pnpm install
```

2. Copy environment variables

```bash
cp .env.example .env
# Edit .env to match your local DB/Redis settings
```

Example `.env` variables (common):

- `DATABASE_URL=postgres://postgres:postgres@localhost:5432/sycamore_dev`
- `REDIS_URL=redis://localhost:6379`
- `PORT=3000`
- `IDEMPOTENCY_CACHE=redis` # optional

3. Run database migrations

If you have `sequelize-cli` installed via devDependencies:

```bash
npx sequelize db:migrate --env development
```

Or via Docker compose (recommended for easy setup):

```bash
docker compose up -d postgres redis
# then run migrations inside app container or locally using DATABASE_URL
```

4. Start in dev mode

```bash
pnpm start:dev
```

5. Run tests

```bash
pnpm test
pnpm test:cov  # optional coverage
```

**Project Structure (high level)**
- `src/` — application source
- `src/controllers` — HTTP controllers (e.g., wallet endpoints)
- `src/services` — domain services (wallet logic, interest calc)
- `src/common/dto` — DTOs used across controllers
- `database/migrations` — Sequelize migrations
- `test/` — unit and integration tests

**Assessment Tasks (what to review)**

1) The Idempotent Wallet
- Endpoint: `POST /wallets/:id/transfer`
- Requirements implemented:
  - Create a `TransactionLog` entry in `PENDING` state before attempting the transfer.
  - Use an `idempotencyKey` header (`X-Idempotency-Key`) to deduplicate repeated requests.
  - Protect critical sections with row-level locking (Sequelize `SELECT ... FOR UPDATE`) to prevent double-spending.
  - Commit both debit and credit ledgers in a single DB transaction. On failure, the transaction rolls back and `TransactionLog` is updated accordingly.

Implementation notes:
- Idempotency behavior: when a request with an existing idempotency key has a `COMPLETED` TransactionLog, return the prior result and do not re-run the transfer.
- If a `PENDING` log exists for the same key, the request will wait/retry or return the current `PENDING` state depending on the configured strategy.

2) The Interest Accumulator
- Service that computes daily interest using a fixed annual percentage rate (default: 27.5% p.a.).
- Uses `decimal.js` to avoid floating-point precision issues.
- Interest formula (daily): let the annual rate be $r_{annual}$, then daily rate $r_{daily}=\\frac{r_{annual}}{365}$. Daily interest over $d$ days on principal $P$ is:

$$
\\text{interest} = P \\times r_{daily} \\times d
$$

- Leap-year handling: when precise day-count is required, the service counts actual days between dates and applies per-day computation; tests include leap-year cases.

**Key Files to Review**
- [src/controllers/wallet.controller.ts](src/controllers/wallet.controller.ts)
- [src/services/wallet.service.ts](src/services/wallet.service.ts)
- [src/utils/money-math.util.ts](src/utils/money-math.util.ts)
- [database/migrations](database/migrations)
- [src/common/dto](src/common/dto)

**Design & Reasoning (short)**

- Idempotency: store an authoritative record (`TransactionLog`) keyed by `idempotencyKey`. This ensures a deterministic response for repeated requests and makes retries safe.
- Atomicity: perform debit and credit within a single database transaction and use row-level locks on the wallets involved to avoid race conditions.
- Precision: use `decimal.js` for financial math and avoid `Number` arithmetic for money. Tests validate edge cases and rounding behavior.
- Observability: `TransactionLog` status transitions (PENDING → COMPLETED/FAILED) provide traceability for auditing and debugging.

**How to verify locally (short checklist)**
- Start Postgres + Redis (or ensure connections configured in `.env`).
- Run migrations.
- Start the server.
- Use `curl` or Postman to exercise endpoints. Example transfer:

```bash
curl -X POST http://localhost:3000/wallets/<from-wallet-id>/transfer \\
  -H "X-Idempotency-Key: my-unique-key" \\
  -H "Content-Type: application/json" \\
  -d '{"toWalletId":"<to-wallet-id>","amount":"100.00"}'
```

If you re-send the same request with the same `X-Idempotency-Key`, the service returns the original result and does not create duplicate ledger entries.

**Testing guidance**
- Unit tests are written with Jest. Run `pnpm test`.
- Focus tests:
  - `src/utils/money-math.util.spec.ts` — math correctness including leap-year scenarios.
  - Service-level tests for idempotency and transfer error handling.




