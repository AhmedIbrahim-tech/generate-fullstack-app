import path from 'node:path';
import { promises as fs } from 'node:fs';
import { runCommand } from '../utils/command.js';
import { copyTemplate, ensureDir, pathExists, removeFilesMatching, templatesRoot, upsertCsprojProperties, writeFile } from '../utils/filesystem.js';
import { assertDotnetAvailable, detectTargetFramework } from '../utils/dotnet.js';
import { logger } from '../utils/logger.js';
import { assertBackendCompatibility, shouldGenerateIdentityArtifacts } from '../models/backend.js';
import {
  renderApplicationServiceExtensions,
  renderApiServiceExtensions,
} from '../feature-generator/backend/clean-architecture.js';

const PROJECTS = [
  { folder: 'Domain', template: 'classlib', log: 'Domain created' },
  { folder: 'Application', template: 'classlib', log: 'Application created' },
  { folder: 'Infrastructure', template: 'classlib', log: 'Infrastructure created' },
  { folder: 'API', template: 'webapi', log: 'API created' },
];

/**
 * @param {object} options
 */
export async function generateBackend(options) {
  assertDotnetAvailable();
  const targetFramework = detectTargetFramework();
  const backend = typeof options.backend === 'object' ? options.backend : {};
  const backendDir = options.backendDirectory ?? (options.paths?.backend
    ? (options.paths.backend === '.' ? options.targetDirectory : path.join(options.targetDirectory, options.paths.backend))
    : options.targetDirectory);

  await ensureDir(backendDir);

  const architecture = backend.architecture ?? options.architecture ?? 'cqrs-mediatr';
  const mapping = backend.mapping ?? options.mapping ?? 'manual';
  const orm = backend.orm ?? options.orm ?? 'efcore';
  const database = backend.database ?? options.database ?? (options.sqlServer === false ? 'sqlite' : 'sqlserver');
  const logging = backend.logging ?? options.logging ?? 'serilog';
  const backgroundJobs = backend.backgroundJobs ?? options.backgroundJobs ?? 'none';
  const realtime = backend.realtime ?? options.realtime ?? 'none';
  const authMode = backend.authentication ?? options.authMode ?? (options.auth ? 'identity-jwt' : 'none');

  const backendConfig = {
    architecture,
    mapping,
    orm,
    database,
    logging,
    backgroundJobs,
    realtime,
    authMode,
  };

  assertBackendCompatibility({ orm, authentication: authMode });

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
      cwd: backendDir,
      step: `Create ${project.folder} project`,
    });

    await upsertCsprojProperties(path.join(backendDir, project.folder, `${project.folder}.csproj`), {
      RootNamespace: `${options.pascalName}.${project.folder}`,
      AssemblyName: `${options.pascalName}.${project.folder}`,
    });

    await removeFilesMatching(path.join(backendDir, project.folder), (filePath) => {
      const base = path.basename(filePath);
      return base === 'WeatherForecast.cs' || base === 'WeatherForecastController.cs' || base === 'Class1.cs';
    });

    logger.success(project.log);
  }

  addProjectReferences(backendDir);
  addBackendPackages(backendDir, backendConfig);
  await overlayBackendTemplates(options, backendConfig, backendDir);
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
 * @param {string} cwd
 * @param {object} config
 */
function addBackendPackages(cwd, config) {
  // 1. Application Layer Packages
  const applicationPackages = [
    'FluentValidation',
    'FluentValidation.DependencyInjectionExtensions',
    'Microsoft.Extensions.Logging.Abstractions',
    'Microsoft.Extensions.DependencyInjection.Abstractions',
  ];

  if (config.architecture === 'cqrs-mediatr') {
    applicationPackages.push('MediatR');
  }

  if (config.mapping === 'automapper') {
    applicationPackages.push('AutoMapper');
  }

  if (config.orm === 'efcore' || config.orm === 'efcore-dapper') {
    applicationPackages.push('Microsoft.EntityFrameworkCore');
  }

  addPackages(cwd, path.join('Application', 'Application.csproj'), applicationPackages);

  // 2. Infrastructure Layer Packages
  const infrastructurePackages = [
    'Microsoft.Extensions.Configuration.Abstractions',
    'Microsoft.Extensions.DependencyInjection.Abstractions',
  ];

  if (config.orm === 'efcore' || config.orm === 'efcore-dapper') {
    infrastructurePackages.push('Microsoft.EntityFrameworkCore.Design');

    if (config.database === 'sqlserver') {
      infrastructurePackages.push('Microsoft.EntityFrameworkCore.SqlServer');
    } else if (config.database === 'postgresql') {
      infrastructurePackages.push('Npgsql.EntityFrameworkCore.PostgreSQL');
    } else if (config.database === 'sqlite') {
      infrastructurePackages.push('Microsoft.EntityFrameworkCore.Sqlite');
    }
  }

  if (config.orm === 'dapper' || config.orm === 'efcore-dapper') {
    infrastructurePackages.push('Dapper');

    if (config.database === 'sqlserver') {
      infrastructurePackages.push('Microsoft.Data.SqlClient');
    } else if (config.database === 'postgresql') {
      infrastructurePackages.push('Npgsql');
    } else if (config.database === 'sqlite') {
      infrastructurePackages.push('Microsoft.Data.Sqlite');
    }
  }

  if (shouldGenerateIdentityArtifacts(config.authMode) && config.orm !== 'dapper') {
    infrastructurePackages.push('Microsoft.AspNetCore.Identity.EntityFrameworkCore');
  }

  if (config.backgroundJobs === 'hangfire') {
    infrastructurePackages.push('Hangfire.Core', 'Hangfire.AspNetCore');
    if (config.database === 'sqlserver') {
      infrastructurePackages.push('Hangfire.SqlServer');
    } else if (config.database === 'postgresql') {
      infrastructurePackages.push('Hangfire.PostgreSql');
    } else {
      infrastructurePackages.push('Hangfire.MemoryStorage');
    }
  }

  addPackages(cwd, path.join('Infrastructure', 'Infrastructure.csproj'), infrastructurePackages);

  // 3. API Layer Packages
  const apiPackages = ['Swashbuckle.AspNetCore'];

  if (config.logging === 'serilog') {
    apiPackages.push('Serilog.AspNetCore');
  }

  if (config.authMode === 'identity-jwt') {
    apiPackages.push('Microsoft.AspNetCore.Authentication.JwtBearer', 'System.IdentityModel.Tokens.Jwt');
  }

  if (config.backgroundJobs === 'hangfire') {
    apiPackages.push('Hangfire.AspNetCore');
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

async function removeObsoleteArchitectureFiles(backendDir) {
  const obsolete = [
    path.join('API', 'Routing', 'Router.cs'),
    path.join('API', 'ExceptionHandling', 'GlobalExceptionHandler.cs'),
    path.join('API', 'Endpoints', 'ApiControllerBase.cs'),
    path.join('API', 'Controllers', 'WeatherForecastController.cs'),
    path.join('Application', 'DependencyInjection.cs'),
    path.join('Infrastructure', 'DependencyInjection.cs'),
    path.join('Infrastructure', 'DependencyInjection.Generated.g.cs'),
    path.join('Infrastructure', 'DependencyInjection.Modules.g.cs'),
  ];

  for (const relative of obsolete) {
    const absolute = path.join(backendDir, relative);
    if (await pathExists(absolute)) {
      await fs.unlink(absolute);
    }
  }

  for (const relativeDir of [
    path.join('API', 'Endpoints'),
    path.join('API', 'Routing'),
    path.join('API', 'ExceptionHandling'),
  ]) {
    const absolute = path.join(backendDir, relativeDir);
    try {
      const entries = await fs.readdir(absolute);
      if (entries.length === 0) {
        await fs.rmdir(absolute);
      }
    } catch {
      // Folder absent or not empty.
    }
  }
}

/**
 * @param {object} options
 * @param {object} config
 * @param {string} backendDir
 */
async function overlayBackendTemplates(options, config, backendDir) {
  const pascalName = options.pascalName;

  // Connection strings based on database
  let connectionString = `Server=localhost;Database=${pascalName};Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True`;
  if (config.database === 'sqlserver') {
    connectionString = `Server=(localdb)\\\\mssqllocaldb;Database=${pascalName}Db;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True`;
  } else if (config.database === 'postgresql') {
    connectionString = `Host=localhost;Port=5432;Database=${pascalName}Db;Username=postgres;Password=postgres`;
  } else if (config.database === 'sqlite') {
    connectionString = `Data Source=${pascalName}.db`;
  }

  const replacements = {
    ...options.replacements,
    __CONNECTION_STRING__: connectionString,
  };

  await copyTemplate(path.join(templatesRoot(), 'backend'), backendDir, replacements);
  await removeObsoleteArchitectureFiles(backendDir);
  await removeFilesMatching(path.join(backendDir, 'API', 'Endpoints'), () => true);
  await ensureDir(path.join(backendDir, 'API', 'Filters'));
  await ensureDir(path.join(backendDir, 'API', 'Attributes'));

  if (config.architecture === 'services') {
    await removeFilesMatching(path.join(backendDir, 'Application', 'Behaviors'), () => true);
  }

  if (config.orm === 'dapper') {
    await removeFilesMatching(path.join(backendDir, 'Infrastructure', 'Persistence'), (filePath) => {
      const base = path.basename(filePath);
      return base === 'ApplicationDbContext.cs' || base.startsWith('ApplicationDbContext.');
    });
    await removeFilesMatching(
      path.join(backendDir, 'Application', 'Abstractions', 'Persistence'),
      (filePath) => path.basename(filePath).startsWith('IApplicationDbContext'),
    );
  }

  if (!shouldGenerateIdentityArtifacts(config.authMode)) {
    await removeFilesMatching(path.join(backendDir, 'Infrastructure', 'Authentication'), () => true);
  }

  // Write tailored appsettings.json
  await writeAppSettings(backendDir, pascalName, connectionString, config);

  await writeInfrastructureDi(backendDir, pascalName, config);
  await writeApplicationDi(backendDir, pascalName, config);
  await writeApiDi(backendDir, pascalName, config);
  await writeProgramCs(backendDir, pascalName, config);

  // If Dapper is selected, write IDbConnectionFactory
  if (config.orm === 'dapper' || config.orm === 'efcore-dapper') {
    await writeDapperConnectionFactory(backendDir, pascalName, config);
  }

  // If SignalR is selected, write AppHub
  if (config.realtime === 'signalr') {
    await writeSignalRHub(backendDir, pascalName);
  }
}

/**
 * @param {string} targetDir
 * @param {string} pascalName
 * @param {string} connectionString
 * @param {object} config
 */
async function writeAppSettings(targetDir, pascalName, connectionString, config) {
  const appSettings = {
    ConnectionStrings: {
      DefaultConnection: connectionString.replace(/\\\\/g, '\\'),
    },
    Cors: {
      AllowedOrigins: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:4200',
      ],
    },
    AllowedHosts: '*',
  };

  if (config.logging === 'serilog') {
    appSettings.Serilog = {
      MinimumLevel: {
        Default: 'Information',
        Override: {
          Microsoft: 'Warning',
          'Microsoft.AspNetCore': 'Warning',
        },
      },
    };
  }

  if (shouldGenerateIdentityArtifacts(config.authMode)) {
    appSettings.Auth = {
      SeedAdmin: {
        Enabled: false,
        Email: 'admin@example.com',
        Password: '',
      },
    };
  }

  await writeFile(
    path.join(targetDir, 'API', 'appsettings.json'),
    `${JSON.stringify(appSettings, null, 2)}\n`,
  );

  const devSettings = {
    ConnectionStrings: {
      DefaultConnection: connectionString.replace(/\\\\/g, '\\'),
    },
  };

  if (config.logging === 'serilog') {
    devSettings.Serilog = {
      MinimumLevel: {
        Default: 'Debug',
        Override: {
          Microsoft: 'Information',
          'Microsoft.AspNetCore': 'Information',
        },
      },
    };
  }

  await writeFile(
    path.join(targetDir, 'API', 'appsettings.Development.json'),
    `${JSON.stringify(devSettings, null, 2)}\n`,
  );
}

/**
 * @param {string} targetDir
 * @param {string} pascalName
 * @param {object} config
 */
/**
 * @param {string} pascalName
 * @param {object} config
 */
export function renderInfrastructureDi(pascalName, config) {
  let dbRegistration = '';
  let usings = ['using Microsoft.Extensions.Configuration;', 'using Microsoft.Extensions.DependencyInjection;'];

  const needsConnectionString =
    config.orm === 'efcore' ||
    config.orm === 'efcore-dapper' ||
    (config.backgroundJobs === 'hangfire' && config.database !== 'sqlite');

  if (needsConnectionString) {
    dbRegistration += `
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");
`;
  }

  if (config.orm === 'efcore' || config.orm === 'efcore-dapper') {
    usings.push('using Microsoft.EntityFrameworkCore;');
    usings.push(`using ${pascalName}.Application.Abstractions.Persistence;`);
    usings.push(`using ${pascalName}.Infrastructure.Persistence;`);

    let efMethod = 'UseSqlServer';
    if (config.database === 'postgresql') efMethod = 'UseNpgsql';
    if (config.database === 'sqlite') efMethod = 'UseSqlite';

    dbRegistration += `
        services.AddDbContext<ApplicationDbContext>((serviceProvider, options) =>
        {
            options.${efMethod}(connectionString);
            options.AddInterceptors(serviceProvider.GetServices<Microsoft.EntityFrameworkCore.Diagnostics.ISaveChangesInterceptor>());
        });

        services.AddScoped<IApplicationDbContext>(provider =>
            provider.GetRequiredService<ApplicationDbContext>());
`;
  }

  if (config.orm === 'dapper' || config.orm === 'efcore-dapper') {
    usings.push(`using ${pascalName}.Application.Abstractions.Persistence;`);
    usings.push(`using ${pascalName}.Infrastructure.Persistence;`);
    dbRegistration += `
        services.AddScoped<IDbConnectionFactory, DbConnectionFactory>();
`;
  }

  if (config.backgroundJobs === 'hangfire') {
    usings.push('using Hangfire;');
    let storageMethod = 'UseSqlServerStorage(connectionString)';
    if (config.database === 'postgresql') {
      usings.push('using Hangfire.PostgreSql;');
      storageMethod = 'UsePostgreSqlStorage(connectionString)';
    }
    if (config.database === 'sqlite') {
      usings.push('using Hangfire.MemoryStorage;');
      storageMethod = 'UseMemoryStorage()';
    }

    dbRegistration += `
        services.AddHangfire(hangfire =>
        {
            hangfire.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                  .UseSimpleAssemblyNameTypeSerializer()
                  .UseRecommendedSerializerSettings()
                  .${storageMethod};
        });
        services.AddHangfireServer();
`;
  }

  dbRegistration += `
        RegisterFeatureInfrastructure(services, configuration);
`;

  const distinctUsings = [...new Set(usings)].join('\n');

  return `${distinctUsings}

namespace ${pascalName}.Infrastructure.DependencyInjection;

public static class InfrastructureServiceExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
${dbRegistration}
        return services;
    }

    static void RegisterFeatureInfrastructure(
        IServiceCollection services,
        IConfiguration configuration)
    {
        // Feature generator appends optional infrastructure registrations here.
    }
}
`;
}

/**
 * @param {string} targetDir
 * @param {string} pascalName
 * @param {object} config
 */
async function writeInfrastructureDi(targetDir, pascalName, config) {
  await writeFile(
    path.join(targetDir, 'Infrastructure', 'DependencyInjection', 'InfrastructureServiceExtensions.cs'),
    renderInfrastructureDi(pascalName, config),
  );
}

/**
 * @param {string} targetDir
 * @param {string} pascalName
 * @param {object} config
 */
async function writeApplicationDi(targetDir, pascalName, config) {
  const content = renderApplicationServiceExtensions(pascalName, {
    servicesArchitecture: config.architecture === 'services',
    mapping: config.mapping,
  });
  await writeFile(
    path.join(targetDir, 'Application', 'DependencyInjection', 'ApplicationServiceExtensions.cs'),
    content,
  );
}

/**
 * @param {string} targetDir
 * @param {string} pascalName
 * @param {object} config
 */
async function writeApiDi(targetDir, pascalName, config) {
  let extra = '';
  if (config.realtime === 'signalr') {
    extra = '        services.AddSignalR();\n';
  }
  await writeFile(
    path.join(targetDir, 'API', 'DependencyInjection', 'ApiServiceExtensions.cs'),
    renderApiServiceExtensions(pascalName, { extraRegistrations: extra }),
  );
}

/**
 * @param {string} targetDir
 * @param {string} pascalName
 * @param {object} config
 */
async function writeProgramCs(targetDir, pascalName, config) {
  const usings = [
    `using ${pascalName}.API.DependencyInjection;`,
    `using ${pascalName}.Application.DependencyInjection;`,
    `using ${pascalName}.Infrastructure.DependencyInjection;`,
  ];

  if (config.logging === 'serilog') {
    usings.push('using Serilog;');
  }

  let serilogBuilder = '';
  let serilogMiddleware = '';
  if (config.logging === 'serilog') {
    serilogBuilder = `
builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console();
});
`;
    serilogMiddleware = 'app.UseSerilogRequestLogging();\n';
  }

  let signalrEndpoint = '';
  if (config.realtime === 'signalr') {
    signalrEndpoint = `app.MapHub<${pascalName}.API.Hubs.AppHub>("/hubs/app");\n`;
  }

  let hangfireEndpoint = '';
  if (config.backgroundJobs === 'hangfire') {
    usings.push('using Hangfire;');
    hangfireEndpoint = 'app.UseHangfireDashboard("/hangfire");\n';
  }

  const distinctUsings = [...new Set(usings)].join('\n');

  const content = `${distinctUsings}

var builder = WebApplication.CreateBuilder(args);
${serilogBuilder}
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApiServices(builder.Configuration);

var app = builder.Build();

app.UseExceptionHandler();
${serilogMiddleware}
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("Client");
app.MapHealthChecks("/health");
${hangfireEndpoint}${signalrEndpoint}app.MapControllers();
app.Run();
`;

  await writeFile(path.join(targetDir, 'API', 'Program.cs'), content);
}

/**
 * @param {string} targetDir
 * @param {string} pascalName
 * @param {object} config
 */
async function writeDapperConnectionFactory(targetDir, pascalName, config) {
  // Interface in Application
  const iface = `using System.Data;

namespace ${pascalName}.Application.Abstractions.Persistence;

public interface IDbConnectionFactory
{
    IDbConnection CreateConnection();
}
`;
  await writeFile(path.join(targetDir, 'Application', 'Abstractions', 'Persistence', 'IDbConnectionFactory.cs'), iface);

  // Implementation in Infrastructure
  let connectionClass = 'SqlConnection';
  let connectionUsing = 'using Microsoft.Data.SqlClient;';
  if (config.database === 'postgresql') {
    connectionClass = 'NpgsqlConnection';
    connectionUsing = 'using Npgsql;';
  } else if (config.database === 'sqlite') {
    connectionClass = 'SqliteConnection';
    connectionUsing = 'using Microsoft.Data.Sqlite;';
  }

  const impl = `using System.Data;
using Microsoft.Extensions.Configuration;
using ${pascalName}.Application.Abstractions.Persistence;
${connectionUsing}

namespace ${pascalName}.Infrastructure.Persistence;

public class DbConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public DbConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");
    }

    public IDbConnection CreateConnection()
    {
        return new ${connectionClass}(_connectionString);
    }
}
`;
  await writeFile(path.join(targetDir, 'Infrastructure', 'Persistence', 'DbConnectionFactory.cs'), impl);
}

/**
 * @param {string} targetDir
 * @param {string} pascalName
 */
async function writeSignalRHub(targetDir, pascalName) {
  const hub = `using Microsoft.AspNetCore.SignalR;

namespace ${pascalName}.API.Hubs;

public class AppHub : Hub
{
    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }
}
`;
  await writeFile(path.join(targetDir, 'API', 'Hubs', 'AppHub.cs'), hub);
}
