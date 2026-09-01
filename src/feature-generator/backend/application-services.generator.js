import { getBackendFilePath } from '../../utils/project-paths.js';
import { canBeLookupTarget, lookupDisplayMember, renderLookupHandler } from './lookup.generator.js';
import {
  collectUsings,
  dapperReadRepositoryName,
  extractHandleAsMethod,
  stripMediatRFromType,
  usesDapper,
  usesEfCore,
} from './architecture.js';
import { isAutoMapper } from '../feature-profile.js';
import {
  planApplicationFiles,
  renderCreateHandler,
  renderDeleteHandler,
  renderGetByIdHandler,
  renderRestoreHandler,
  renderSearchHandler,
  renderUpdateHandler,
} from './application.generator.js';

/**
 * Plan Application-layer files for architecture = "services".
 *
 * @param {object} config
 */
export function planServiceApplicationFiles(config) {
  const { pluralName } = config.feature;
  const base = (...segments) =>
    getBackendFilePath(config, 'Application', 'Features', pluralName, ...segments);

  const cqrsFiles = planApplicationFiles(config);
  const withoutHandlers = cqrsFiles
    .filter((file) => !file.relativePath.includes('Handler.cs'))
    .map((file) => ({
      ...file,
      contents: file.relativePath.endsWith('Validator.cs')
        ? file.contents
        : stripMediatRFromType(file.contents),
    }));

  return [
    ...withoutHandlers,
    {
      relativePath: base('Services', `I${pluralName}Service.cs`),
      contents: renderServiceInterface(config),
    },
    {
      relativePath: base('Services', `${pluralName}Service.cs`),
      contents: renderServiceImplementation(config),
    },
  ];
}

/**
 * Registry update that registers I{Plural}Service in Application DI.
 * @param {object} config
 */
export function planApplicationServiceRegistry(config) {
  const { pluralName } = config.feature;
  const ns = config.projectName;
  const relativePath = getBackendFilePath(
    config,
    'Application',
    'DependencyInjection.Generated.g.cs',
  );

  return {
    relativePath,
    update: (existing) => upsertServiceRegistration(existing, ns, pluralName),
  };
}

/**
 * @param {object} config
 */
function renderServiceInterface(config) {
  const { singularName, pluralName } = config.feature;
  const ns = config.projectName;
  const ops = config.operations;
  const methods = [];

  if (ops.search) {
    methods.push(
      `    Task<Result<PaginationResult<${singularName}Dto>>> SearchAsync(Search${pluralName}Query query, CancellationToken cancellationToken);`,
    );
  }
  if (canBeLookupTarget(config)) {
    methods.push(
      `    Task<Result<IReadOnlyList<LookupItemDto>>> LookupAsync(Lookup${pluralName}Query query, CancellationToken cancellationToken);`,
    );
  }
  if (ops.getById) {
    methods.push(
      `    Task<Result<${singularName}Dto>> GetByIdAsync(Get${singularName}ByIdQuery query, CancellationToken cancellationToken);`,
    );
  }
  if (ops.create) {
    methods.push(
      `    Task<Result<${singularName}Dto>> CreateAsync(Create${singularName}Command command, CancellationToken cancellationToken);`,
    );
  }
  if (ops.update) {
    methods.push(
      `    Task<Result<${singularName}Dto>> UpdateAsync(Update${singularName}Command command, CancellationToken cancellationToken);`,
    );
  }
  if (ops.delete) {
    methods.push(
      `    Task<Result> DeleteAsync(Delete${singularName}Command command, CancellationToken cancellationToken);`,
    );
  }
  if (ops.restore) {
    methods.push(
      `    Task<Result<${singularName}Dto>> RestoreAsync(Restore${singularName}Command command, CancellationToken cancellationToken);`,
    );
  }

  const usings = [
    `using ${ns}.Application.Common.Results;`,
    `using ${ns}.Application.Features.${pluralName}.Common;`,
  ];
  if (ops.search) {
    usings.push(`using ${ns}.Application.Common.Models;`);
    usings.push(`using ${ns}.Application.Features.${pluralName}.Search;`);
  }
  if (canBeLookupTarget(config)) {
    usings.push(`using ${ns}.Application.Common.Models;`);
    usings.push(`using ${ns}.Application.Features.${pluralName}.Lookup;`);
  }
  if (ops.getById) usings.push(`using ${ns}.Application.Features.${pluralName}.GetById;`);
  if (ops.create) usings.push(`using ${ns}.Application.Features.${pluralName}.Create;`);
  if (ops.update) usings.push(`using ${ns}.Application.Features.${pluralName}.Update;`);
  if (ops.delete) usings.push(`using ${ns}.Application.Features.${pluralName}.Delete;`);
  if (ops.restore) usings.push(`using ${ns}.Application.Features.${pluralName}.Restore;`);

  const uniqueUsings = [...new Set(usings)].join('\n');

  return `${uniqueUsings}

namespace ${ns}.Application.Features.${pluralName}.Services;

public interface I${pluralName}Service
{
${methods.join('\n')}
}
`;
}

/**
 * @param {object} config
 */
function renderServiceImplementation(config) {
  const { pluralName } = config.feature;
  const ns = config.projectName;
  const ops = config.operations;

  /** @type {string[]} */
  const handlerSources = [];
  /** @type {string[]} */
  const methods = [];

  if (ops.search) {
    const source = renderSearchHandler(config);
    handlerSources.push(source);
    methods.push(wrapValidatedMethod(extractHandleAsMethod(source, 'SearchAsync'), 'request'));
  }
  if (canBeLookupTarget(config)) {
    const display = lookupDisplayMember(config);
    const source = renderLookupHandler(config, display);
    handlerSources.push(source);
    methods.push(extractHandleAsMethod(source, 'LookupAsync'));
  }
  if (ops.getById) {
    const source = renderGetByIdHandler(config);
    handlerSources.push(source);
    methods.push(extractHandleAsMethod(source, 'GetByIdAsync'));
  }
  if (ops.create) {
    const source = renderCreateHandler(config);
    handlerSources.push(source);
    methods.push(wrapValidatedMethod(extractHandleAsMethod(source, 'CreateAsync'), 'request'));
  }
  if (ops.update) {
    const source = renderUpdateHandler(config);
    handlerSources.push(source);
    methods.push(wrapValidatedMethod(extractHandleAsMethod(source, 'UpdateAsync'), 'request'));
  }
  if (ops.delete) {
    const source = renderDeleteHandler(config);
    handlerSources.push(source);
    methods.push(extractHandleAsMethod(source, 'DeleteAsync'));
  }
  if (ops.restore) {
    const source = renderRestoreHandler(config);
    handlerSources.push(source);
    methods.push(extractHandleAsMethod(source, 'RestoreAsync'));
  }

  const extraUsings = [
    'using FluentValidation;',
    'using Microsoft.Extensions.DependencyInjection;',
    `using ${ns}.Application.Common.Exceptions;`,
    `using ${ns}.Application.Abstractions.Persistence;`,
    `using ${ns}.Application.Common.Results;`,
    `using ${ns}.Application.Features.${pluralName}.Common;`,
  ];
  if (isAutoMapper(config)) {
    extraUsings.push('using AutoMapper;');
  }
  if (ops.search) extraUsings.push(`using ${ns}.Application.Features.${pluralName}.Search;`);
  if (canBeLookupTarget(config)) extraUsings.push(`using ${ns}.Application.Features.${pluralName}.Lookup;`);
  if (ops.getById) extraUsings.push(`using ${ns}.Application.Features.${pluralName}.GetById;`);
  if (ops.create) extraUsings.push(`using ${ns}.Application.Features.${pluralName}.Create;`);
  if (ops.update) extraUsings.push(`using ${ns}.Application.Features.${pluralName}.Update;`);
  if (ops.delete) extraUsings.push(`using ${ns}.Application.Features.${pluralName}.Delete;`);
  if (ops.restore) extraUsings.push(`using ${ns}.Application.Features.${pluralName}.Restore;`);

  const usingBlock = collectUsings(...handlerSources, extraUsings.join('\n'));
  const persistLines = [];
  const persistParams = [];
  const persistAssigns = [];

  if (usesEfCore(config.orm) || !usesDapper(config.orm)) {
    persistLines.push('    private readonly IApplicationDbContext _dbContext;');
    persistParams.push('IApplicationDbContext dbContext');
    persistAssigns.push('        _dbContext = dbContext;');
  }
  if (usesDapper(config.orm)) {
    const repo = dapperReadRepositoryName(config);
    persistLines.push(`    private readonly ${repo} _repository;`);
    persistParams.push(`${repo} repository`);
    persistAssigns.push('        _repository = repository;');
  }
  if (isAutoMapper(config)) {
    persistLines.push('    private readonly IMapper _mapper;');
    persistParams.push('IMapper mapper');
    persistAssigns.push('        _mapper = mapper;');
  }

  return `${usingBlock}

namespace ${ns}.Application.Features.${pluralName}.Services;

public sealed class ${pluralName}Service : I${pluralName}Service
{
${persistLines.join('\n')}
    private readonly IServiceProvider _services;

    public ${pluralName}Service(${persistParams.join(', ')}, IServiceProvider services)
    {
${persistAssigns.join('\n')}
        _services = services;
    }

    private async Task ValidateAsync<T>(T instance, CancellationToken cancellationToken)
    {
        var validator = _services.GetService<IValidator<T>>();
        if (validator is null)
        {
            return;
        }

        var result = await validator.ValidateAsync(instance, cancellationToken);
        if (!result.IsValid)
        {
            var errors = result.Errors
                .GroupBy(failure => failure.PropertyName)
                .ToDictionary(
                    group => group.Key,
                    group => group.Select(failure => failure.ErrorMessage).ToArray());
            throw new ApplicationValidationException(errors);
        }
    }

${methods.map((method) => indentMethod(method)).join('\n\n')}
}
`;
}

/**
 * @param {string} method
 */
function indentMethod(method) {
  return method
    .split('\n')
    .map((line) => (line.length > 0 ? `    ${line}` : line))
    .join('\n');
}

/**
 * Insert ValidateAsync at the start of a generated Handle method body.
 * @param {string} method
 * @param {string} parameterName
 */
function wrapValidatedMethod(method, parameterName) {
  return method.replace(
    /(CancellationToken cancellationToken\)\s*\{\r?\n)/,
    `$1        await ValidateAsync(${parameterName}, cancellationToken);\n`,
  );
}

/**
 * @param {string} existing
 * @param {string} ns
 * @param {string} pluralName
 */
export function upsertServiceRegistration(existing, ns, pluralName) {
  const usingLine = `using ${ns}.Application.Features.${pluralName}.Services;`;
  const registration = `        services.AddScoped<I${pluralName}Service, ${pluralName}Service>();`;
  const header = `// AUTO-GENERATED BY create-fullstack-feature
// DO NOT EDIT MANUALLY`;

  let content = existing?.trim()
    ? existing
    : `${header}

using Microsoft.Extensions.DependencyInjection;

namespace ${ns}.Application;

public static partial class DependencyInjection
{
    static partial void RegisterGeneratedApplicationServices(IServiceCollection services)
    {
        // Feature generator appends service registrations here.
    }
}
`;

  if (!content.includes(usingLine)) {
    content = content.replace(
      'using Microsoft.Extensions.DependencyInjection;',
      `using Microsoft.Extensions.DependencyInjection;\n${usingLine}`,
    );
  }

  if (content.includes(registration.trim())) {
    return content.endsWith('\n') ? content : `${content}\n`;
  }

  const placeholder = '        // Feature generator appends service registrations here.';
  if (content.includes(placeholder)) {
    content = content.replace(placeholder, registration);
    return content.endsWith('\n') ? content : `${content}\n`;
  }

  content = content.replace(
    /static partial void RegisterGeneratedApplicationServices\(IServiceCollection services\)\s*\{/,
    `static partial void RegisterGeneratedApplicationServices(IServiceCollection services)\n    {\n${registration}`,
  );

  return content.endsWith('\n') ? content : `${content}\n`;
}
