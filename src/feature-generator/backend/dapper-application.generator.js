import { groupFields } from '../fields/field-mappers.js';
import { dapperReadRepositoryName, usesDapper } from './architecture.js';
import { entityClrName } from './clean-architecture.js';
import {
  mappingCtorAssign,
  mappingCtorParam,
  mappingFields,
  mappingUsing,
  toDtoCall,
  toDtoListCall,
} from './mapping.js';

/**
 * @param {object} config
 */
export function renderDapperSearchHandler(config) {
  const { singularName, pluralName } = config.feature;
  const ns = config.projectName;

  return `${mappingUsing(config)}using MediatR;
using ${ns}.Application.Abstractions.Persistence;
using ${ns}.Application.Common.Models;
using ${ns}.Application.Common.Results;
using ${ns}.Application.Features.${singularName}.DTOs;
using ${ns}.Application.Features.${singularName}.Mapping;

namespace ${ns}.Application.Features.${singularName}.Queries.Search;

public sealed class Search${pluralName}QueryHandler
    : IRequestHandler<Search${pluralName}Query, Result<PaginationResult<${singularName}Dto>>>
{
    private readonly ${dapperReadRepositoryName(config)} _repository;${mappingFields(config)}

    public Search${pluralName}QueryHandler(${dapperReadRepositoryName(config)} repository${mappingCtorParam(config)})
    {
        _repository = repository;${mappingCtorAssign(config)}
    }

    public async Task<Result<PaginationResult<${singularName}Dto>>> Handle(
        Search${pluralName}Query request,
        CancellationToken cancellationToken)
    {
        var (items, totalCount) = await _repository.SearchAsync(request, cancellationToken);
        var data = ${toDtoListCall(config, 'items')};
        var result = PaginationResult<${singularName}Dto>.Create(
            data,
            totalCount,
            request.Page,
            request.PageSize);
        return Result.Success(result);
    }
}
`;
}

/**
 * @param {object} config
 */
export function renderDapperGetByIdHandler(config) {
  const { singularName, pluralName } = config.feature;
  const ns = config.projectName;

  return `${mappingUsing(config)}using MediatR;
using ${ns}.Application.Abstractions.Persistence;
using ${ns}.Application.Common.Results;
using ${ns}.Application.Features.${singularName}.DTOs;
using ${ns}.Application.Features.${singularName}.Mapping;

namespace ${ns}.Application.Features.${singularName}.Queries.GetById;

public sealed class Get${singularName}ByIdQueryHandler
    : IRequestHandler<Get${singularName}ByIdQuery, Result<${singularName}Dto>>
{
    private readonly ${dapperReadRepositoryName(config)} _repository;${mappingFields(config)}

    public Get${singularName}ByIdQueryHandler(${dapperReadRepositoryName(config)} repository${mappingCtorParam(config)})
    {
        _repository = repository;${mappingCtorAssign(config)}
    }

    public async Task<Result<${singularName}Dto>> Handle(
        Get${singularName}ByIdQuery request,
        CancellationToken cancellationToken)
    {
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        if (entity is null)
        {
            return Result.Failure<${singularName}Dto>(
                Error.NotFound(
                    "${singularName}.NotFound",
                    $"${singularName} '{request.Id}' was not found."));
        }

        return Result.Success(${toDtoCall(config, 'entity')});
    }
}
`;
}

/**
 * @param {object} config
 */
export function renderDapperCreateHandler(config) {
  const { singularName, pluralName } = config.feature;
  const ns = config.projectName;
  const groups = groupFields(config.fields);

  /** @type {string[]} */
  const initializerLines = [];
  for (const field of [...groups.scalar, ...groups.enums]) {
    initializerLines.push(`            ${field.name} = request.${field.name},`);
  }
  for (const field of groups.toOne) {
    initializerLines.push(`            ${field.foreignKeyName} = request.${field.foreignKeyName},`);
  }
  for (const field of groups.mediaSingle) {
    initializerLines.push(`            ${field.foreignKeyName} = request.${field.foreignKeyName},`);
  }

  return `${mappingUsing(config)}using MediatR;
using ${ns}.Application.Abstractions.Persistence;
using ${ns}.Application.Common.Results;
using ${ns}.Application.Features.${singularName}.DTOs;
using ${ns}.Application.Features.${singularName}.Mapping;
using ${ns}.Domain.Entities;

namespace ${ns}.Application.Features.${singularName}.Commands.Create;

public sealed class Create${singularName}CommandHandler
    : IRequestHandler<Create${singularName}Command, Result<${singularName}Dto>>
{
    private readonly ${dapperReadRepositoryName(config)} _repository;${mappingFields(config)}

    public Create${singularName}CommandHandler(${dapperReadRepositoryName(config)} repository${mappingCtorParam(config)})
    {
        _repository = repository;${mappingCtorAssign(config)}
    }

    public async Task<Result<${singularName}Dto>> Handle(
        Create${singularName}Command request,
        CancellationToken cancellationToken)
    {
        var entity = new ${entityClrName(config)}
        {
${initializerLines.join('\n')}
        };

        await _repository.InsertAsync(entity, cancellationToken);
        return Result.Success(${toDtoCall(config, 'entity')});
    }
}
`;
}

/**
 * @param {object} config
 */
export function renderDapperUpdateHandler(config) {
  const { singularName, pluralName } = config.feature;
  const ns = config.projectName;
  const groups = groupFields(config.fields);

  /** @type {string[]} */
  const assignments = [];
  for (const field of [...groups.scalar, ...groups.enums]) {
    assignments.push(`        entity.${field.name} = request.${field.name};`);
  }
  for (const field of groups.toOne) {
    assignments.push(`        entity.${field.foreignKeyName} = request.${field.foreignKeyName};`);
  }
  for (const field of groups.mediaSingle) {
    assignments.push(`        entity.${field.foreignKeyName} = request.${field.foreignKeyName};`);
  }

  return `${mappingUsing(config)}using MediatR;
using ${ns}.Application.Abstractions.Persistence;
using ${ns}.Application.Common.Results;
using ${ns}.Application.Features.${singularName}.DTOs;
using ${ns}.Application.Features.${singularName}.Mapping;

namespace ${ns}.Application.Features.${singularName}.Commands.Update;

public sealed class Update${singularName}CommandHandler
    : IRequestHandler<Update${singularName}Command, Result<${singularName}Dto>>
{
    private readonly ${dapperReadRepositoryName(config)} _repository;${mappingFields(config)}

    public Update${singularName}CommandHandler(${dapperReadRepositoryName(config)} repository${mappingCtorParam(config)})
    {
        _repository = repository;${mappingCtorAssign(config)}
    }

    public async Task<Result<${singularName}Dto>> Handle(
        Update${singularName}Command request,
        CancellationToken cancellationToken)
    {
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        if (entity is null)
        {
            return Result.Failure<${singularName}Dto>(
                Error.NotFound(
                    "${singularName}.NotFound",
                    $"${singularName} '{request.Id}' was not found."));
        }

${assignments.join('\n')}

        await _repository.UpdateAsync(entity, cancellationToken);
        return Result.Success(${toDtoCall(config, 'entity')});
    }
}
`;
}

/**
 * @param {object} config
 */
export function renderDapperDeleteHandler(config) {
  const { singularName, pluralName } = config.feature;
  const ns = config.projectName;

  return `using MediatR;
using ${ns}.Application.Abstractions.Persistence;
using ${ns}.Application.Common.Results;

namespace ${ns}.Application.Features.${singularName}.Commands.Delete;

public sealed class Delete${singularName}CommandHandler
    : IRequestHandler<Delete${singularName}Command, Result>
{
    private readonly ${dapperReadRepositoryName(config)} _repository;

    public Delete${singularName}CommandHandler(${dapperReadRepositoryName(config)} repository)
    {
        _repository = repository;
    }

    public async Task<Result> Handle(
        Delete${singularName}Command request,
        CancellationToken cancellationToken)
    {
        var entity = await _repository.GetByIdAsync(request.Id, cancellationToken);
        if (entity is null)
        {
            return Result.Failure(
                Error.NotFound(
                    "${singularName}.NotFound",
                    $"${singularName} '{request.Id}' was not found."));
        }

        await _repository.SoftDeleteAsync(request.Id, cancellationToken);
        return Result.Success();
    }
}
`;
}

/**
 * @param {object} config
 */
export function renderDapperRestoreHandler(config) {
  const { singularName, pluralName } = config.feature;
  const ns = config.projectName;

  return `${mappingUsing(config)}using MediatR;
using ${ns}.Application.Abstractions.Persistence;
using ${ns}.Application.Common.Results;
using ${ns}.Application.Features.${singularName}.DTOs;
using ${ns}.Application.Features.${singularName}.Mapping;

namespace ${ns}.Application.Features.${singularName}.Commands.Restore;

public sealed class Restore${singularName}CommandHandler
    : IRequestHandler<Restore${singularName}Command, Result<${singularName}Dto>>
{
    private readonly ${dapperReadRepositoryName(config)} _repository;${mappingFields(config)}

    public Restore${singularName}CommandHandler(${dapperReadRepositoryName(config)} repository${mappingCtorParam(config)})
    {
        _repository = repository;${mappingCtorAssign(config)}
    }

    public async Task<Result<${singularName}Dto>> Handle(
        Restore${singularName}Command request,
        CancellationToken cancellationToken)
    {
        var entity = await _repository.GetDeletedByIdAsync(request.Id, cancellationToken);
        if (entity is null)
        {
            return Result.Failure<${singularName}Dto>(
                Error.NotFound(
                    "${singularName}.NotFound",
                    $"Deleted ${singularName} '{request.Id}' was not found."));
        }

        await _repository.RestoreAsync(request.Id, cancellationToken);
        entity.IsDeleted = false;
        entity.DeletedAtUtc = null;
        return Result.Success(${toDtoCall(config, 'entity')});
    }
}
`;
}

/**
 * @param {object} config
 * @param {string} display
 */
export function renderDapperLookupHandler(config, display) {
  const { singularName, pluralName } = config.feature;
  const ns = config.projectName;
  void display;

  return `using MediatR;
using ${ns}.Application.Abstractions.Persistence;
using ${ns}.Application.Common.Models;
using ${ns}.Application.Common.Results;

namespace ${ns}.Application.Features.${singularName}.Queries.Lookup;

public sealed class Lookup${pluralName}QueryHandler
    : IRequestHandler<Lookup${pluralName}Query, Result<IReadOnlyList<LookupItemDto>>>
{
    private readonly ${dapperReadRepositoryName(config)} _repository;

    public Lookup${pluralName}QueryHandler(${dapperReadRepositoryName(config)} repository)
    {
        _repository = repository;
    }

    public async Task<Result<IReadOnlyList<LookupItemDto>>> Handle(
        Lookup${pluralName}Query request,
        CancellationToken cancellationToken)
    {
        var items = await _repository.LookupAsync(request, cancellationToken);
        return Result.Success(items);
    }
}
`;
}

export function usesDapperHandlers(config) {
  return usesDapper(config.orm);
}
