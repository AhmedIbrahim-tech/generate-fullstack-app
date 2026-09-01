import path from 'node:path';
import { runCommand } from '../utils/command.js';
import { copyTemplate, removeFilesMatching, templatesRoot, upsertCsprojProperties, writeFile } from '../utils/filesystem.js';
import { assertDotnetAvailable, detectTargetFramework } from '../utils/dotnet.js';
import { logger } from '../utils/logger.js';

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
  addBackendPackages(options.targetDirectory, backendConfig);
  await overlayBackendTemplates(options, backendConfig);
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

  if (config.authMode !== 'none') {
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

/**
 * @param {object} options
 * @param {object} config
 */
async function overlayBackendTemplates(options, config) {
  const targetDir = options.targetDirectory;
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

  await copyTemplate(path.join(templatesRoot(), 'backend'), targetDir, replacements);

  // Write tailored appsettings.json
  await writeAppSettings(targetDir, pascalName, connectionString, config);

  // Write tailored Infrastructure/DependencyInjection.cs
  await writeInfrastructureDi(targetDir, pascalName, config);

  // Write tailored Application/DependencyInjection.cs
  await writeApplicationDi(targetDir, pascalName, config);

  // Write tailored API/Program.cs
  await writeProgramCs(targetDir, pascalName, config);

  // If Dapper is selected, write IDbConnectionFactory
  if (config.orm === 'dapper' || config.orm === 'efcore-dapper') {
    await writeDapperConnectionFactory(targetDir, pascalName, config);
  }

  // If SignalR is selected, write AppHub
  if (config.realtime === 'signalr') {
    await writeSignalRHub(targetDir, pascalName);
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

  if (config.authMode !== 'none') {
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
async function writeInfrastructureDi(targetDir, pascalName, config) {
  let dbRegistration = '';
  let usings = ['using Microsoft.Extensions.Configuration;', 'using Microsoft.Extensions.DependencyInjection;'];

  if (config.orm === 'efcore' || config.orm === 'efcore-dapper') {
    usings.push('using Microsoft.EntityFrameworkCore;');
    usings.push(`using ${pascalName}.Application.Abstractions.Persistence;`);
    usings.push(`using ${pascalName}.Infrastructure.Persistence;`);

    let efMethod = 'UseSqlServer';
    if (config.database === 'postgresql') efMethod = 'UseNpgsql';
    if (config.database === 'sqlite') efMethod = 'UseSqlite';

    dbRegistration += `
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");

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
    if (config.database === 'postgresql') storageMethod = 'UsePostgreSqlStorage(connectionString)';
    if (config.database === 'sqlite') storageMethod = 'UseMemoryStorage()';

    dbRegistration += `
        services.AddHangfire(config =>
        {
            config.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                  .UseSimpleAssemblyNameTypeSerializer()
                  .UseRecommendedSerializerSettings()
                  .${storageMethod};
        });
        services.AddHangfireServer();
`;
  }

  const distinctUsings = [...new Set(usings)].join('\n');

  const content = `${distinctUsings}

namespace ${pascalName}.Infrastructure;

public static partial class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
${dbRegistration}
        RegisterGeneratedInfrastructure(services, configuration);

        return services;
    }

    static partial void RegisterGeneratedInfrastructure(
        IServiceCollection services,
        IConfiguration configuration);
}
`;

  await writeFile(path.join(targetDir, 'Infrastructure', 'DependencyInjection.cs'), content);
}

/**
 * @param {string} targetDir
 * @param {string} pascalName
 * @param {object} config
 */
async function writeApplicationDi(targetDir, pascalName, config) {
  const usings = ['using FluentValidation;', 'using Microsoft.Extensions.DependencyInjection;'];

  let diBody = '        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);\n';

  if (config.architecture === 'cqrs-mediatr') {
    usings.push('using MediatR;');
    usings.push(`using ${pascalName}.Application.Behaviors;`);
    diBody += `        services.AddMediatR(configuration =>
        {
            configuration.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly);
            configuration.AddOpenBehavior(typeof(ValidationBehavior<,>));
            configuration.AddOpenBehavior(typeof(LoggingBehavior<,>));
        });\n`;
  }

  if (config.mapping === 'automapper') {
    usings.push('using AutoMapper;');
    diBody += '        services.AddAutoMapper(typeof(DependencyInjection).Assembly);\n';
  }

  const distinctUsings = [...new Set(usings)].join('\n');

  const content = `${distinctUsings}

namespace ${pascalName}.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
${diBody}
        return services;
    }
}
`;

  await writeFile(path.join(targetDir, 'Application', 'DependencyInjection.cs'), content);
}

/**
 * @param {string} targetDir
 * @param {string} pascalName
 * @param {object} config
 */
async function writeProgramCs(targetDir, pascalName, config) {
  const usings = [
    `using ${pascalName}.API.ExceptionHandling;`,
    `using ${pascalName}.Application;`,
    `using ${pascalName}.Infrastructure;`,
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

  let signalrService = '';
  let signalrEndpoint = '';
  if (config.realtime === 'signalr') {
    signalrService = 'builder.Services.AddSignalR();\n';
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
builder.Services.AddControllers();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks();
${signalrService}
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000", "http://localhost:5173", "http://localhost:4200"];
builder.Services.AddCors(options =>
{
    options.AddPolicy("Client", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

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
