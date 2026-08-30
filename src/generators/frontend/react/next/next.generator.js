import path from 'node:path';
import { promises as fs } from 'node:fs';
import { runCommand } from '../../../../utils/command.js';
import { add, getCreateNextAppPackageManagerFlag, packageManagerUserAgent } from '../../../../utils/package-manager.js';
import { copyTemplate, pathExists, templatesRoot, writeFile, writeFileIfMissing } from '../../../../utils/filesystem.js';
import { logger } from '../../../../utils/logger.js';
import { CLIENT_STAGING_NAME, promoteStagingClient } from '../../client-setup.js';
import { installReactCommonPackages, overlayReactCommon } from '../react-common.generator.js';

/**
 * @param {object} options
 */
export async function generateNextFrontend(options) {
  const packageManagerFlag = getCreateNextAppPackageManagerFlag(options.packageManager);

  runCommand(
    'npx',
    [
      '--yes',
      'create-next-app@latest',
      CLIENT_STAGING_NAME,
      '--ts',
      '--tailwind',
      '--eslint',
      '--app',
      '--src-dir',
      '--import-alias',
      '@/*',
      '--empty',
      '--yes',
      '--disable-git',
      packageManagerFlag,
    ],
    {
      cwd: options.targetDirectory,
      step: 'Create Next.js client',
      env: {
        ...process.env,
        CI: '1',
        npm_config_user_agent: packageManagerUserAgent(options.packageManager),
      },
    },
  );

  const clientDir = await promoteStagingClient(options.targetDirectory, options.folderName);
  logger.success('Next.js client created');

  installReactCommonPackages({ clientDir, packageManager: options.packageManager });
  if (options.localization) {
    add(options.packageManager, ['next-intl'], {
      cwd: clientDir,
      step: 'Install next-intl',
    });
  }
  logger.success('Frontend dependencies installed');

  await overlayReactCommon({
    clientDir,
    packageManager: options.packageManager,
    replacements: options.replacements,
  });
  await copyTemplate(
    path.join(templatesRoot(), 'frontend', 'react', 'next'),
    clientDir,
    options.replacements,
  );

  await writeFileIfMissing(path.join(clientDir, 'src', 'app', 'globals.css'), '@import "tailwindcss";\n');

  const defaultPage = path.join(clientDir, 'src', 'app', 'page.tsx');
  if (await pathExists(defaultPage)) {
    await fs.unlink(defaultPage);
  }

  if (!options.dashboard) {
    await fs.rm(path.join(clientDir, 'src', 'app', '(dashboard)'), { recursive: true, force: true });
  }

  if (options.localization) {
    await writeNextIntlConfig(clientDir);
  } else {
    await fs.rm(path.join(clientDir, 'src', 'i18n'), { recursive: true, force: true });
    await writePlainLayout(clientDir, options.replacements);
    await writePlainHomePage(clientDir, options.replacements);
  }
}

async function writeNextIntlConfig(clientDir) {
  const configPathTs = path.join(clientDir, 'next.config.ts');
  const configPathMjs = path.join(clientDir, 'next.config.mjs');
  const configPathJs = path.join(clientDir, 'next.config.js');

  await writeFile(
    configPathTs,
    `import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
`,
  );

  if (await pathExists(configPathMjs)) {
    await fs.unlink(configPathMjs);
  }
  if (await pathExists(configPathJs)) {
    await fs.unlink(configPathJs);
  }
}

async function writePlainLayout(clientDir, replacements) {
  await writeFile(
    path.join(clientDir, 'src', 'app', 'layout.tsx'),
    `import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "${replacements.__DISPLAY_NAME__}",
  description: "${replacements.__DISPLAY_NAME__} web application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
`,
  );
}

async function writePlainHomePage(clientDir, replacements) {
  await writeFile(
    path.join(clientDir, 'src', 'app', '(website)', 'page.tsx'),
    `export default function HomePage() {
  return (
    <main>
      <h1>${replacements.__DISPLAY_NAME__}</h1>
      <p>Full-stack starter for web applications.</p>
    </main>
  );
}
`,
  );
}
