import path from 'node:path';
import { promises as fs } from 'node:fs';
import { runCommand } from '../../../utils/command.js';
import { add, addDev } from '../../../utils/package-manager.js';
import { copyTemplate, pathExists, templatesRoot, writeFile } from '../../../utils/filesystem.js';
import { logger } from '../../../utils/logger.js';
import { CLIENT_STAGING_NAME, promoteStagingClient } from '../client-setup.js';

/**
 * @param {object} options
 */
export async function generateAngularFrontend(options) {
  runCommand(
    'npx',
    [
      '--yes',
      '-p',
      '@angular/cli@20',
      'ng',
      'new',
      CLIENT_STAGING_NAME,
      '--routing',
      '--style',
      'css',
      '--ssr=false',
      '--skip-git',
      '--skip-tests',
      '--strict',
      '--defaults',
      '--package-manager',
      options.packageManager,
    ],
    {
      cwd: options.targetDirectory,
      step: 'Create Angular client',
      env: {
        ...process.env,
        CI: '1',
        NG_CLI_ANALYTICS: 'false',
      },
    },
  );

  const clientDir = await promoteStagingClient(options.targetDirectory, options.folderName);
  logger.success('Angular client created');

  add(options.packageManager, ['@ngrx/store@20', '@ngrx/effects@20', '@ngrx/store-devtools@20'], {
    cwd: clientDir,
    step: 'Install NgRx',
  });
  addDev(options.packageManager, ['tailwindcss', '@tailwindcss/postcss', 'postcss'], {
    cwd: clientDir,
    step: 'Install Tailwind for Angular',
  });
  logger.success('Frontend dependencies installed');

  await copyTemplate(
    path.join(templatesRoot(), 'frontend', 'angular'),
    clientDir,
    options.replacements,
  );

  const postcssRc = path.join(clientDir, '.postcssrc.json');
  const postcssConfig = path.join(clientDir, 'postcss.config.json');
  if (await pathExists(postcssConfig) && !(await pathExists(postcssRc))) {
    await fs.copyFile(postcssConfig, postcssRc);
  }

  await writeAngularAppConfig(clientDir);
  await ensureAngularStyles(clientDir);
  await removeAngularCliBoilerplate(clientDir);

  if (!options.dashboard) {
    await fs.rm(path.join(clientDir, 'src', 'app', 'layouts', 'dashboard-layout'), {
      recursive: true,
      force: true,
    });
    await fs.rm(path.join(clientDir, 'src', 'app', 'features', 'dashboard'), {
      recursive: true,
      force: true,
    });
    await writeAngularRoutesWithoutDashboard(clientDir);
  }

  logger.success('Angular starter architecture generated');
}

async function writeAngularAppConfig(clientDir) {
  const packageJsonPath = path.join(clientDir, 'package.json');
  const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  const hasZone = Boolean(pkg.dependencies?.['zone.js'] || pkg.devDependencies?.['zone.js']);
  const changeDetectionImport = hasZone
    ? 'provideZoneChangeDetection'
    : 'provideZonelessChangeDetection';
  const changeDetectionProvider = hasZone
    ? 'provideZoneChangeDetection({ eventCoalescing: true })'
    : 'provideZonelessChangeDetection()';

  await writeFile(
    path.join(clientDir, 'src', 'app', 'app.config.ts'),
    `import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { ApplicationConfig, ${changeDetectionImport} } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideEffects } from "@ngrx/effects";
import { provideStore } from "@ngrx/store";
import { provideStoreDevtools } from "@ngrx/store-devtools";
import { routes } from "./app.routes";
import { apiInterceptor } from "./core/interceptors/api.interceptor";
import { ExampleEffects } from "./features/example/store/example.effects";
import { exampleReducer } from "./features/example/store/example.reducer";

export const appConfig: ApplicationConfig = {
  providers: [
    ${changeDetectionProvider},
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor])),
    provideStore({ example: exampleReducer }),
    provideEffects([ExampleEffects]),
    provideStoreDevtools({ maxAge: 25 }),
  ],
};
`,
  );
}

async function ensureAngularStyles(clientDir) {
  const angularJsonPath = path.join(clientDir, 'angular.json');
  if (!(await pathExists(angularJsonPath))) {
    return;
  }

  const angularJson = JSON.parse(await fs.readFile(angularJsonPath, 'utf8'));
  const projectName = Object.keys(angularJson.projects ?? {})[0];
  if (!projectName) {
    return;
  }

  const buildOptions = angularJson.projects[projectName]?.architect?.build?.options;
  if (!buildOptions) {
    return;
  }

  const styles = Array.isArray(buildOptions.styles) ? buildOptions.styles : [];
  if (!styles.includes('src/styles.css')) {
    buildOptions.styles = ['src/styles.css', ...styles];
    await fs.writeFile(angularJsonPath, `${JSON.stringify(angularJson, null, 2)}\n`, 'utf8');
  }
}

async function removeAngularCliBoilerplate(clientDir) {
  const appDir = path.join(clientDir, 'src', 'app');
  const leftovers = [
    'app.ts',
    'app.html',
    'app.css',
    'app.spec.ts',
    'app.component.spec.ts',
    'ng-welcome-component.ts',
  ];
  for (const name of leftovers) {
    const fullPath = path.join(appDir, name);
    if (await pathExists(fullPath)) {
      await fs.unlink(fullPath);
    }
  }
}

async function writeAngularRoutesWithoutDashboard(clientDir) {
  await writeFile(
    path.join(clientDir, 'src', 'app', 'app.routes.ts'),
    `import { Routes } from "@angular/router";
import { AuthLayoutComponent } from "./layouts/auth-layout/auth-layout.component";
import { WebsiteLayoutComponent } from "./layouts/website-layout/website-layout.component";
import { HomePageComponent } from "./features/home/home.page";
import { LoginPageComponent } from "./features/auth/login.page";
import { RegisterPageComponent } from "./features/auth/register.page";

export const routes: Routes = [
  {
    path: "",
    component: WebsiteLayoutComponent,
    children: [
      { path: "", component: HomePageComponent },
      {
        path: "examples",
        loadChildren: () => import("./features/example/example.routes").then((m) => m.exampleRoutes),
      },
    ],
  },
  {
    path: "",
    component: AuthLayoutComponent,
    children: [
      { path: "login", component: LoginPageComponent },
      { path: "register", component: RegisterPageComponent },
    ],
  },
];
`,
  );
}
