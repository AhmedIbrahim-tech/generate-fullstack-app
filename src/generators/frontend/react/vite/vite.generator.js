import path from 'node:path';
import { promises as fs } from 'node:fs';
import { runCommand } from '../../../../utils/command.js';
import { add, addDev, install, packageManagerUserAgent } from '../../../../utils/package-manager.js';
import { copyTemplate, pathExists, templatesRoot, writeFile } from '../../../../utils/filesystem.js';
import { logger } from '../../../../utils/logger.js';
import { STAGING_DIR_NAME, promoteStagingClient } from '../../client-setup.js';
import { installReactCommonPackages, overlayReactCommon } from '../react-common.generator.js';

/**
 * @param {object} options
 */
export async function generateViteFrontend(options) {
  const frontend = options.frontend ?? {};
  const isTs = frontend.language !== 'javascript';
  const isTailwind = frontend.styling !== 'bootstrap';
  const templateName = isTs ? 'react-ts' : 'react';
  const frontendDir = options.frontendDirectory ?? (options.paths?.frontend
    ? (options.paths.frontend === '.' ? options.targetDirectory : path.join(options.targetDirectory, options.paths.frontend))
    : options.targetDirectory);

  runCommand(
    'npx',
    [
      '--yes',
      'create-vite@latest',
      STAGING_DIR_NAME,
      '--template',
      templateName,
      '--no-interactive',
      '--eslint',
    ],
    {
      cwd: options.targetDirectory,
      step: 'Create Vite client',
      env: {
        ...process.env,
        CI: '1',
        npm_config_user_agent: packageManagerUserAgent(options.packageManager),
      },
    },
  );

  const clientDir = await promoteStagingClient(options.targetDirectory, frontendDir, options.folderName);
  logger.success('Vite client created');

  if (!(await pathExists(path.join(clientDir, 'node_modules')))) {
    install(options.packageManager, {
      cwd: clientDir,
      step: 'Install Vite scaffolding dependencies',
    });
  }

  installReactCommonPackages({ clientDir, packageManager: options.packageManager, frontend });

  add(options.packageManager, ['react-router-dom'], {
    cwd: clientDir,
    step: 'Install React Router',
  });

  if (isTailwind) {
    addDev(options.packageManager, ['tailwindcss', '@tailwindcss/vite'], {
      cwd: clientDir,
      step: 'Install Tailwind for Vite',
    });
  }

  if (frontend.localization ?? options.localization) {
    add(options.packageManager, ['i18next', 'react-i18next'], {
      cwd: clientDir,
      step: 'Install react-i18next',
    });
  }

  logger.success('Frontend dependencies installed');

  await overlayReactCommon({
    clientDir,
    packageManager: options.packageManager,
    replacements: options.replacements,
    frontend,
  });

  await copyTemplate(
    path.join(templatesRoot(), 'frontend', 'react', 'vite'),
    clientDir,
    options.replacements,
  );

  if (isTailwind) {
    await ensureTailwindCss(clientDir);
  } else {
    await ensureBootstrapCss(clientDir);
  }

  if (isTs) {
    await ensureTsconfigPaths(clientDir);
  }

  const defaultApp = path.join(clientDir, 'src', 'App.tsx');
  if (await pathExists(defaultApp)) {
    await fs.unlink(defaultApp);
  }
  const defaultAppCss = path.join(clientDir, 'src', 'App.css');
  if (await pathExists(defaultAppCss)) {
    await fs.unlink(defaultAppCss);
  }

  if (!(frontend.localization ?? options.localization)) {
    await fs.rm(path.join(clientDir, 'src', 'i18n'), { recursive: true, force: true });
    await writePlainViteHome(clientDir, options.replacements);
    await stripI18nImport(clientDir);
  }
}

async function ensureTailwindCss(clientDir) {
  const cssPath = path.join(clientDir, 'src', 'index.css');
  const current = (await pathExists(cssPath)) ? await fs.readFile(cssPath, 'utf8') : '';
  if (!current.includes('tailwindcss')) {
    await writeFile(cssPath, `@import "tailwindcss";\n${current}`);
  }
}

async function ensureBootstrapCss(clientDir) {
  const cssPath = path.join(clientDir, 'src', 'index.css');
  await writeFile(cssPath, '@import "bootstrap/dist/css/bootstrap.min.css";\n\nbody { margin: 0; padding: 0; }\n');
}

async function ensureTsconfigPaths(clientDir) {
  for (const fileName of ['tsconfig.app.json', 'tsconfig.json']) {
    const filePath = path.join(clientDir, fileName);
    if (!(await pathExists(filePath))) {
      continue;
    }

    const raw = await fs.readFile(filePath, 'utf8');
    const tsconfig = JSON.parse(stripJsonc(raw));
    tsconfig.compilerOptions = tsconfig.compilerOptions ?? {};
    tsconfig.compilerOptions.baseUrl = tsconfig.compilerOptions.baseUrl ?? '.';
    tsconfig.compilerOptions.paths = {
      ...(tsconfig.compilerOptions.paths ?? {}),
      '@/*': ['./src/*'],
    };
    tsconfig.compilerOptions.resolveJsonModule = true;
    tsconfig.compilerOptions.ignoreDeprecations =
      tsconfig.compilerOptions.ignoreDeprecations ?? '6.0';
    await fs.writeFile(filePath, `${JSON.stringify(tsconfig, null, 2)}\n`, 'utf8');
  }
}

/**
 * Strip // comments and trailing commas so Vite/TS JSONC configs parse.
 * @param {string} text
 */
function stripJsonc(text) {
  return text
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*([}\]])/g, '$1');
}

async function writePlainViteHome(clientDir, replacements) {
  await writeFile(
    path.join(clientDir, 'src', 'app', 'pages', 'HomePage.tsx'),
    `import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-160px)] max-w-4xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
        ${replacements.__DISPLAY_NAME__}
      </h1>
      <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        Clean, scalable full-stack application built with production-ready architecture.
      </p>
      <div className="flex gap-4">
        <Link className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900" to="/examples">
          Example Module
        </Link>
        <Link className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300" to="/dashboard">
          Dashboard
        </Link>
      </div>
    </main>
  );
}
`,
  );
}

async function stripI18nImport(clientDir) {
  const mainPath = path.join(clientDir, 'src', 'main.tsx');
  if (!(await pathExists(mainPath))) {
    return;
  }

  const contents = await fs.readFile(mainPath, 'utf8');
  await fs.writeFile(mainPath, contents.replace('import "@/i18n";\n', ''), 'utf8');
}
