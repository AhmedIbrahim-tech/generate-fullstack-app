# Full-stack app generator

A reusable project + feature + **application module** generator for a **.NET Clean Architecture** API plus a choice of frontend:

- **React + Next.js** (App Router)
- **React + Vite** (SPA + React Router)
- **Angular** (standalone + NgRx)

Current version: **4.0.0**

## Requirements

- **Node.js** ≥ 20
- **.NET SDK** (for ASP.NET Core backends)
- **SQL Server** or **LocalDB** when using `--sql-server`
- Optional: `dotnet ef` tools for migrations (`dotnet tool install -g dotnet-ef`)

## Commands

| Command | Purpose |
| --- | --- |
| `create-fullstack-app` | Scaffold a new full-stack project (V1 / V1.1) |
| `create-fullstack-feature` | Generate CRUD features (V2 / V3 / V4 field + permission hooks) |
| `create-fullstack-module` | Opt into production infrastructure modules (V4) |

---

## How to use

### Option A — From GitHub (recommended)

Run without cloning:

```bash
npx github:AhmedIbrahim-tech/create-fullstack-app MyApp
```

Install globally from GitHub:

```bash
npm install -g github:AhmedIbrahim-tech/create-fullstack-app

create-fullstack-app MyApp
```

Non-interactive example with V4 modules:

```bash
npx github:AhmedIbrahim-tech/create-fullstack-app MyApp --yes ^
  --package-manager npm ^
  --frontend react --react-framework next ^
  --auth --users --permissions --audit --notifications --dashboard
```

(On Bash/zsh, use `\` instead of `^`.)

### Option B — Clone locally

```bash
git clone https://github.com/AhmedIbrahim-tech/create-fullstack-app.git
cd create-fullstack-app
npm install
npm link
```

Then from any folder:

```bash
create-fullstack-app MyCommerce
```

Or without linking:

```bash
node ./bin/create-fullstack-app.js MyCommerce
node ./bin/create-fullstack-feature.js Product
node ./bin/create-fullstack-module.js auth --yes
```

### Typical workflow

```bash
# 1) Create the project
create-fullstack-app MyCommerce
cd MyCommerce

# 2) (Optional) Add more V4 modules later
create-fullstack-module auth --yes
create-fullstack-module users --yes
create-fullstack-module --status

# 3) Generate a business feature
create-fullstack-feature Product --yes ^
  --field "Name:string:required:max=200" ^
  --field "Price:decimal:required"

# 4) Create EF migration (never auto-updates the database)
create-fullstack-module auth --migration
# or:
dotnet ef migrations add AddProductFeature --project Infrastructure --startup-project API
dotnet ef database update --project Infrastructure --startup-project API
```

### Run the generated app

```bash
# Backend
cd MyCommerce
dotnet restore
dotnet run --project API

# Frontend (separate terminal)
cd MyCommerce/Client
npm install
npm run dev
```

Default local URLs:

| Frontend | URL |
| --- | --- |
| Next.js | http://localhost:3000 |
| Vite | http://localhost:5173 |
| Angular | http://localhost:4200 |
| API | http://localhost:5000 (or launchSettings / `ASPNETCORE_URLS`) |

If auth is enabled, set a JWT signing key for Development/Production:

```bash
# PowerShell
$env:Jwt__SigningKey = "development-only-signing-key-change-me-32b"

# Bash
export Jwt__SigningKey="development-only-signing-key-change-me-32b"
```

---

## Supported frontends

| Frontend | State | HTTP | Forms | Routing |
| --- | --- | --- | --- | --- |
| React + Next | Redux Toolkit | Axios + server fetch | RHF + Zod | App Router |
| React + Vite | Redux Toolkit | Axios | RHF + Zod | React Router |
| Angular | NgRx | HttpClient | Reactive Forms | Angular Router |

React async thunks live under `src/modules/<feature>/slices/thunks/` (never a sibling `thunks/` folder).

## V4 — Production application modules

Opt-in modules (never forced):

| Module | Depends on | What it generates |
| --- | --- | --- |
| `auth` | — | Identity + JWT access tokens (memory) + HttpOnly refresh cookies (hash + rotation) |
| `users` | auth | Admin user search / create / update / roles |
| `permissions` | auth | `Feature.Action` permissions + dynamic policies |
| `audit` | — | Audit trail with sensitive-field redaction |
| `notifications` | auth | In-app notifications with ownership enforcement |
| `localization` | — | Domain content languages (`Language`, Accept-Language) |
| `rich-text` | — | Structured TipTap JSON documents + safe renderer |
| `dashboard` | — | Shared dashboard UI + widget registry |

```bash
create-fullstack-module --list
create-fullstack-module --status
create-fullstack-module auth --dry-run
create-fullstack-module notifications --yes
create-fullstack-module auth --migration   # creates EF migration only — never runs database update
```

### Authentication security model

| Token | Storage | Notes |
| --- | --- | --- |
| Access token | Runtime memory only (Redux / NgRx) | Short-lived JWT. **Never** `localStorage` / `sessionStorage`. |
| Refresh token | HttpOnly cookie | DB stores **hash only**. Rotation + reuse rejection. **Never** returned in JSON. |

Production requires HTTPS for Secure refresh cookies. Signing key comes from `Jwt__SigningKey` (never commit a production secret).

### Project creation flags (V4)

```bash
create-fullstack-app MyApp --yes ^
  --frontend react --react-framework next ^
  --auth --users --permissions --audit --notifications --dashboard
```

Also available: `--domain-localization`, `--rich-text`.

Interactive creation asks Authentication / Users / Permissions / Audit / Notifications / Localization / Rich text / Dashboard as opt-in prompts.

Manifest (`.fullstack-app.json`) is authoritative for module enablement.

## Feature Generator

`create-fullstack-feature` reads `.fullstack-app.json` and chooses the correct React+Next, React+Vite, or Angular strategy.

### Field kinds

| Kind | Examples |
| --- | --- |
| Scalar | string, int, long, decimal, double, boolean, Guid, DateTime, DateTimeOffset |
| Rich text (V4) | `Content:richText:required` → structured JSON document |
| Enum | `ProductStatus: Draft, Active, Archived` |
| Relationship | many-to-one, one-to-many, one-to-one, many-to-many |
| File / Image | single or multiple via `IFileStorageService` |

When the permissions module is enabled, `--permissions` registers `Products.View|Create|Update|Delete|Restore` in the generator-owned registry.

### Example: Product

```bash
create-fullstack-feature Category --yes --field "Name:string:required:max=150"
create-fullstack-feature Tag --yes --field "Name:string:required:max=100"
create-fullstack-feature Product --yes --surface both ^
  --field "Name:string:required:max=200" ^
  --field "Price:decimal:required:min=0" ^
  --field "Category:relationship:target=Category:type=many-to-one:required:display=Name" ^
  --field "Tags:relationship:target=Tag:type=many-to-many:display=Name" ^
  --field "Status:enum:name=ProductStatus:values=Draft|Active|Archived:required"
```

## Architecture guarantees

- Clean Architecture + CQRS (MediatR), FluentValidation, Result → ProblemDetails
- `IApplicationDbContext` (no Generic Repository)
- Soft delete + restore + RowVersion
- React: modules with `slices/thunks/`
- Angular: NgRx + HttpClient + Reactive Forms + guards
- Domain localization ≠ UI localization

## Scripts

```bash
npm run lint
npm run test:unit
npm run smoke
npm run smoke:v3
npm run smoke:v4
```

## Out of scope (V5+)

OAuth social login, 2FA, passkeys, SignalR real-time notifications, SMTP providers, SMS, multi-tenancy, billing, Redis, message brokers, Docker/K8s automation, GraphQL, microservices.
