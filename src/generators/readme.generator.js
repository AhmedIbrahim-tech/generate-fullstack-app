import path from 'node:path';
import { writeFile } from '../utils/filesystem.js';
import { describeFrontend } from '../models/frontend.js';
import { readPackageMeta } from '../cli/arguments.js';

/**
 * @param {object} options
 */
export async function writeGeneratedReadme(options) {
  const pm = options.packageManager;
  const installCmd = pm === 'yarn' ? 'yarn' : `${pm} install`;
  const devCmd = pm === 'yarn' ? 'yarn dev' : `${pm} run dev`;
  const frontend = options.frontend;
  const sections = [];

  sections.push(`# ${options.displayName}`, '', `Generated with the full-stack starter CLI.`, '');

  sections.push('## Structure', '');
  if (options.backend) {
    sections.push(
      '- `API/` — ASP.NET Core host',
      '- `Application/` — use cases, MediatR, validation, result types',
      '- `Domain/` — entities and domain types',
      '- `Infrastructure/` — EF Core, authentication stubs',
    );
  }
  if (frontend.enabled) {
    sections.push(`- \`Client/\` — ${describeFrontend(frontend)} frontend`);
  }
  if (options.backend) {
    sections.push(`- \`${options.pascalName}.slnx\` — solution file`);
    sections.push('', 'There is no `Backend/` parent folder. The .NET projects live at the repository root.');
  }
  sections.push('');

  sections.push('## Requirements', '', '- Node.js 20+');
  if (options.backend) {
    sections.push('- .NET SDK', '- SQL Server (when using the default database provider)');
  }
  sections.push('');

  if (options.backend) {
    sections.push(
      '## Run the API',
      '',
      '```bash',
      'dotnet restore',
      'dotnet build',
      'dotnet run --project API',
      '```',
      '',
      'The API listens on `http://localhost:5000` in the default launch profile.',
      '',
      '### CORS',
      '',
      'Allowed origins are configured in `API/appsettings.json` under `Cors:AllowedOrigins`.',
      'Development defaults include:',
      '',
      '- Next.js: `http://localhost:3000`',
      '- Vite: `http://localhost:5173`',
      '- Angular: `http://localhost:4200`',
      '',
    );
  }

  if (frontend.enabled) {
    sections.push(
      '## Run the client',
      '',
      '```bash',
      'cd Client',
      installCmd,
      devCmd,
      '```',
      '',
    );

    if (frontend.library === 'react' && frontend.framework === 'next') {
      sections.push(
        'Copy `Client/.env.example` to `Client/.env.local`.',
        '',
        '| Name | Purpose |',
        '| --- | --- |',
        '| `NEXT_PUBLIC_API_URL` | Browser Axios client |',
        '| `API_INTERNAL_URL` | Server Components (`server-api.ts`) |',
        '',
        '`server-api.ts` uses `API_INTERNAL_URL` first, then `NEXT_PUBLIC_API_URL`.',
        '',
        'Public SEO pages may use Server Components and `server-api.ts`.',
        'Do not use Redux async thunks for server rendering.',
        'Interactive and dashboard state continues through Redux Toolkit.',
        '',
        '## Frontend architecture',
        '',
        'Feature code lives in `Client/src/modules/<feature>/`.',
        '',
        'Async thunks live **under the slice folder**:',
        '',
        '```text',
        'src/modules/users/slices/thunks/',
        '```',
        '',
        'Not:',
        '',
        '```text',
        'src/modules/users/thunks/',
        '```',
        '',
        'Data flow: Page → controller hook → `dispatch(asyncThunk)` → module service → `apiClient` → backend.',
        '',
        options.localization
          ? 'Localization uses next-intl with a `locale` cookie (`en` | `ar`). There are no `/en` or `/ar` URL prefixes by default.'
          : '',
        '',
      );
    }

    if (frontend.library === 'react' && frontend.framework === 'vite') {
      sections.push(
        'Copy `Client/.env.example` to `Client/.env`.',
        '',
        '| Name | Purpose |',
        '| --- | --- |',
        '| `VITE_API_URL` | Browser Axios client (`import.meta.env.VITE_API_URL`) |',
        '',
        'This is a client-side SPA. There is no `server-api.ts` and no Next.js Server Components.',
        '',
        '## Frontend architecture',
        '',
        'Routing uses React Router layouts for website, auth, and dashboard.',
        '',
        'Feature code lives in `Client/src/modules/<feature>/`.',
        '',
        'Async thunks live **under the slice folder**:',
        '',
        '```text',
        'src/modules/users/slices/thunks/',
        '```',
        '',
        'Not:',
        '',
        '```text',
        'src/modules/users/thunks/',
        '```',
        '',
        'Data flow: Page → controller hook → `dispatch(asyncThunk)` → module service → `apiClient` → backend.',
        '',
        options.localization
          ? 'Localization uses i18next/react-i18next with a `locale` cookie (`en` | `ar`) and RTL/LTR document direction.'
          : '',
        '',
      );
    }

    if (frontend.library === 'angular') {
      sections.push(
        'API base URL is configured in `Client/src/app/core/config/app-config.ts` (`apiUrl`).',
        '',
        'Typical Angular dev origin: `http://localhost:4200`.',
        '',
        '## Frontend architecture',
        '',
        'Angular uses standalone components, the Angular router, and NgRx.',
        '',
        'Feature state lives under:',
        '',
        '```text',
        'src/app/features/<feature>/store/',
        '  actions',
        '  reducer',
        '  effects',
        '  selectors',
        '```',
        '',
        'Angular does **not** use Redux Toolkit or async thunks.',
        '',
        'Data flow: Page → dispatch NgRx action → effect → feature service → HttpClient → backend.',
        '',
        'Toasts use a small `ToastService` plus `ToastHostComponent` (no Sonner).',
        '',
        options.localization
          ? 'Localization uses a cookie-based `I18nService` with English and Arabic messages and RTL/LTR document direction. There are no `/en` or `/ar` URL prefixes by default.'
          : '',
        '',
      );
    }
  }

  const pkg = readPackageMeta();
  sections.push('', `Generator version: ${pkg.version}`, '');

  await writeFile(path.join(options.targetDirectory, 'README.md'), sections.filter((line) => line !== undefined).join('\n'));
}
