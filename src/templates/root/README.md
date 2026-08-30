# __DISPLAY_NAME__

Generated with the full-stack starter CLI.

## Structure

- `API/` — ASP.NET Core host
- `Application/` — use cases, MediatR, validation, result types
- `Domain/` — entities and domain types
- `Infrastructure/` — EF Core, authentication stubs
- `Client/` — Next.js App Router frontend
- `__PASCAL_NAME__.slnx` — solution file

There is no `Backend/` parent folder. The .NET projects live at the repository root.

## Requirements

- .NET SDK
- Node.js 20+
- SQL Server (when using the default database provider)

## Run the API

```bash
dotnet restore
dotnet build
dotnet run --project API
```

The API listens on `http://localhost:5000` in the default launch profile.

## Run the client

```bash
cd Client
cp .env.example .env.local
npm install
npm run dev
```

Copy `.env.example` using your package manager's equivalent if you are not on a Unix shell:

- Windows PowerShell: `Copy-Item .env.example .env.local`

### Environment variables

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Browser and client-side API base URL |
| `API_INTERNAL_URL` | Server Component / server-only API base URL |

`server-api.ts` uses `API_INTERNAL_URL` first, then falls back to `NEXT_PUBLIC_API_URL`.

## Frontend architecture

Feature code lives in `Client/src/modules/<feature>/`.

Async thunks live **under the slice folder**:

```text
src/modules/users/slices/thunks/
```

Not:

```text
src/modules/users/thunks/
```

Data flow:

Page/View → controller hook → `dispatch(asyncThunk)` → module service → shared `apiClient` → backend

Do not call Axios from page components or slice reducers.

## Localization

Cookie-based locale (no `/en` or `/ar` URL prefixes by default). Set the `locale` cookie to `en` or `ar`.
