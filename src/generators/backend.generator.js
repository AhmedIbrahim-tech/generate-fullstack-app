import path from 'node:path';
import { runCommand } from '../utils/command.js';
import { copyTemplate, removeFilesMatching, templatesRoot, upsertCsprojProperties } from '../utils/filesystem.js';
import { assertDotnetAvailable, detectTargetFramework } from '../utils/dotnet.js';
import { logger } from '../utils/logger.js';

const PROJECTS = [
  { folder: 'Domain', template: 'classlib', log: 'Domain created' },
  { folder: 'Application', template: 'classlib', log: 'Application created' },
  { folder: 'Infrastructure', template: 'classlib', log: 'Infrastructure created' },
  { folder: 'API', template: 'webapi', log: 'API created' },
];

/**
 * @param {{ targetDirectory: string, pascalName: string, replacements: Record<string, string>, sqlServer: boolean, auth: boolean }} options
 */
export async function generateBackend(options) {
  assertDotnetAvailable();
  const targetFramework = detectTargetFramework();

  for (const project of PROJECTS) {
    const args = [
      'new',
      project.template,
      '--name',
      project.folder,
      '--output',
      project.folder,
      '--framework',
      targetFramework,
      '--force',
    ];

    if (project.template === 'webapi') {
      args.push('--use-controllers', '--no-openapi', '--auth', 'None');
    }

    args.push('--no-restore');

    runCommand('dotnet', args, {
      cwd: options.targetDirectory,
      step: `Create ${project.folder} project`,
    });

    await upsertCsprojProperties(path.join(options.targetDirectory, project.folder, `${project.folder}.csproj`), {
      RootNamespace: `${options.pascalName}.${project.folder}`,
      AssemblyName: `${options.pascalName}.${project.folder}`,
    });

    await removeFilesMatching(path.join(options.targetDirectory, project.folder), (filePath) => {
      const base = path.basename(filePath);
      return base === 'WeatherForecast.cs' || base === 'WeatherForecastController.cs' || base === 'Class1.cs';
    });

    logger.success(project.log);
  }

  addProjectReferences(options.targetDirectory);
  addBackendPackages(options);
  await overlayBackendTemplates(options);
}

/**
 * @param {string} cwd
 */
function addProjectReferences(cwd) {
  runCommand(
    'dotnet',
    ['add', path.join('Application', 'Application.csproj'), 'reference', path.join('Domain', 'Domain.csproj')],
    { cwd, step: 'Reference Application → Domain' },
  );

  runCommand(
    'dotnet',
    [
      'add',
      path.join('Infrastructure', 'Infrastructure.csproj'),
      'reference',
      path.join('Application', 'Application.csproj'),
      path.join('Domain', 'Domain.csproj'),
    ],
    { cwd, step: 'Reference Infrastructure → Application, Domain' },
  );

  runCommand(
    'dotnet',
    [
      'add',
      path.join('API', 'API.csproj'),
      'reference',
      path.join('Application', 'Application.csproj'),
      path.join('Infrastructure', 'Infrastructure.csproj'),
    ],
    { cwd, step: 'Reference API → Application, Infrastructure' },
  );
}

/**
 * @param {{ targetDirectory: string, sqlServer: boolean, auth: boolean }} options
 */
function addBackendPackages(options) {
  const cwd = options.targetDirectory;

  addPackages(cwd, path.join('Application', 'Application.csproj'), [
    'MediatR',
    'FluentValidation',
    'FluentValidation.DependencyInjectionExtensions',
    'Microsoft.EntityFrameworkCore',
    'Microsoft.Extensions.Logging.Abstractions',
    'Microsoft.Extensions.DependencyInjection.Abstractions',
  ]);

  const infrastructurePackages = [
    'Microsoft.EntityFrameworkCore.Design',
    'Microsoft.Extensions.Configuration.Abstractions',
    'Microsoft.Extensions.DependencyInjection.Abstractions',
  ];

  if (options.sqlServer) {
    infrastructurePackages.push('Microsoft.EntityFrameworkCore.SqlServer');
  }

  if (options.auth) {
    infrastructurePackages.push('Microsoft.AspNetCore.Identity.EntityFrameworkCore');
  }

  addPackages(cwd, path.join('Infrastructure', 'Infrastructure.csproj'), infrastructurePackages);

  const apiPackages = ['Serilog.AspNetCore', 'Swashbuckle.AspNetCore'];
  if (options.auth) {
    apiPackages.push('Microsoft.AspNetCore.Authentication.JwtBearer');
  }

  addPackages(cwd, path.join('API', 'API.csproj'), apiPackages);
}

/**
 * @param {string} cwd
 * @param {string} csproj
 * @param {string[]} packages
 */
function addPackages(cwd, csproj, packages) {
  for (const packageName of packages) {
    runCommand('dotnet', ['add', csproj, 'package', packageName, '--no-restore'], {
      cwd,
      step: `Add package ${packageName}`,
    });
  }
}

/**
 * @param {{ targetDirectory: string, replacements: Record<string, string>, sqlServer: boolean, auth: boolean }} options
 */
async function overlayBackendTemplates(options) {
  const replacements = {
    ...options.replacements,
    __SQL_SERVER_REGISTRATION__: options.sqlServer
      ? `        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");

        services.AddDbContext<ApplicationDbContext>((serviceProvider, options) =>
        {
            options.UseSqlServer(connectionString);
            options.AddInterceptors(serviceProvider.GetServices<Microsoft.EntityFrameworkCore.Diagnostics.ISaveChangesInterceptor>());
        });`
      : `        services.AddDbContext<ApplicationDbContext>((serviceProvider, options) =>
        {
            options.AddInterceptors(serviceProvider.GetServices<Microsoft.EntityFrameworkCore.Diagnostics.ISaveChangesInterceptor>());
            throw new InvalidOperationException(
                "No database provider was selected. Re-run the generator with SQL Server enabled, or register a provider in Infrastructure DependencyInjection.");
        });`,
    __SQL_SERVER_USING__: options.sqlServer ? 'using Microsoft.EntityFrameworkCore;\n' : 'using Microsoft.EntityFrameworkCore;\n',
  };

  await copyTemplate(path.join(templatesRoot(), 'backend'), options.targetDirectory, replacements);
}
