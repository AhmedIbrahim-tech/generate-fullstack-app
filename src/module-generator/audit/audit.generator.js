/**
 * V4 Audit Trail module generator.
 *
 * Backend:
 *   - AuditLog entity (Domain/Entities) + AuditAction enum — no secrets stored
 *   - AuditSaveChangesInterceptor: captures scalar Created/Updated/Deleted/
 *     Restored changes on SaveChanges and REDACTS password/token/hash/
 *     securitystamp/cookie fields (case-insensitive name match)
 *   - Application Features/AuditLogs Search + GetById guarded by Audit.View
 *   - ICurrentUser for the acting UserId
 *
 * BaseEntity upgrade: if the project's BaseEntity can be made partial, the
 * generator adds CreatedByUserId/UpdatedByUserId/DeletedByUserId via
 * Domain/Common/BaseEntity.Audit.g.cs and stamps them from the interceptor.
 * If BaseEntity cannot be read/upgraded, an interceptor-only variant (audit
 * table without per-entity user columns) is emitted instead.
 *
 * Frontend: read-only audit dashboards for React and Angular.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  paths,
  isReact,
  isAngular,
  isNext,
  dbSetPartials,
  currentUserAbstraction,
  moduleRegistrationFile,
  reactReducerUpdate,
  reactDashboardNavUpdate,
  finalizePlan,
} from '../modules-orchestrator-helpers.js';
import {
  buildAngularGeneratedRoutes,
  buildAngularDashboardNav,
} from '../../feature-generator/frontend/angular/angular-registries.js';
import { registerFeaturePermissions } from '../permissions/permissions.generator.js';

/**
 * @param {object} config
 */
export async function planAuditModule(config) {
  const ns = config.projectName;

  /** @type {{ relativePath: string, contents: string, writeMode?: string }[]} */
  const files = [];
  /** @type {{ relativePath: string, update: (existing: string) => string }[]} */
  const registryUpdates = [];
  /** @type {string[]} */
  const notes = [];

  registryUpdates.push(registerFeaturePermissions(config, 'Audit', ['View']));

  // Decide how to handle the BaseEntity audit-user columns ----------
  const baseEntity = await resolveBaseEntityUpgrade(config);
  files.push(...baseEntity.files);
  notes.push(...baseEntity.notes);

  // Domain ----------------------------------------------------------
  files.push({
    writeMode: 'ifMissing',
    relativePath: paths.domain('Enums', 'AuditAction.cs'),
    contents: renderAuditActionEnum(ns),
  });
  files.push({
    relativePath: paths.domain('Entities', 'AuditLog.cs'),
    contents: renderAuditLogEntity(ns),
  });

  // Persistence -----------------------------------------------------
  files.push(...dbSetPartials(ns, 'AuditLog', 'AuditLogs'));
  files.push({
    relativePath: paths.infrastructure(
      'Persistence',
      'Configurations',
      'AuditLogConfiguration.cs',
    ),
    contents: renderAuditLogConfiguration(ns),
  });

  // Interceptor + current user -------------------------------------
  files.push(...currentUserAbstraction(ns));
  files.push({
    relativePath: paths.infrastructure('Auditing', 'AuditSaveChangesInterceptor.cs'),
    contents: renderInterceptor(ns, baseEntity.hasAuditUserFields),
  });

  // Application feature (read-only) --------------------------------
  files.push(...planAuditApplication(ns));

  // DI registration -------------------------------------------------
  const { file: registrationFile, registration } = moduleRegistrationFile({
    projectName: ns,
    moduleName: 'Audit',
    usings: [
      'using Microsoft.EntityFrameworkCore.Diagnostics;',
      `using ${ns}.Infrastructure.Auditing;`,
    ],
    body: [
      '        services.AddScoped<AuditSaveChangesInterceptor>();',
      '        services.AddScoped<ISaveChangesInterceptor>(provider =>',
      '            provider.GetRequiredService<AuditSaveChangesInterceptor>());',
    ],
  });
  files.push(registrationFile);
  notes.push(
    'Wire the interceptor into the DbContext registration: AddDbContext((sp, options) => options.AddInterceptors(sp.GetRequiredService<AuditSaveChangesInterceptor>())). EF Core does not auto-discover DI-registered interceptors.',
  );

  // Frontend --------------------------------------------------------
  if (isReact(config)) {
    files.push(...planAuditReact(config));
    registryUpdates.push({
      relativePath: paths.client('store', 'generated-reducers.ts'),
      update: reactReducerUpdate({
        reducerKey: 'auditLogs',
        importName: 'auditLogsReducer',
        importPath: '@/modules/audit/slices/auditLogs.slice',
      }),
    });
    registryUpdates.push({
      relativePath: paths.client('navigation', 'generated-dashboard-nav.ts'),
      update: reactDashboardNavUpdate({
        navKey: 'auditLogs',
        label: 'Audit Trail',
        href: '/dashboard/audit',
        icon: 'ScrollText',
      }),
    });
  }

  if (isAngular(config)) {
    files.push(...planAuditAngular(config));
    const angularConfig = {
      feature: {
        kebabName: 'audit-log',
        kebabPluralName: 'audit',
        camelName: 'auditLogs',
        camelPluralName: 'auditLogs',
        pluralName: 'Audit Trail',
      },
      surface: { dashboard: true, public: false },
      labels: { enPlural: 'Audit Trail' },
    };
    registryUpdates.push({
      relativePath: paths.client('app', 'router', 'generated-routes.ts'),
      update: (existing) => buildAngularGeneratedRoutes(angularConfig, existing).contents,
    });
    registryUpdates.push({
      relativePath: paths.client('app', 'navigation', 'generated-dashboard-nav.ts'),
      update: (existing) => buildAngularDashboardNav(angularConfig, existing).contents,
    });
  }

  return finalizePlan({
    id: 'audit',
    requires: [],
    files,
    registryUpdates,
    registrations: [registration],
    notes,
  });
}

/* ================================================================== */
/* BaseEntity upgrade resolution                                      */
/* ================================================================== */

/**
 * Inspect the project's BaseEntity and decide whether the per-entity audit-user
 * columns can be added via a partial. Returns the files to emit plus whether
 * the interceptor should stamp those columns.
 *
 * @param {object} config
 * @returns {Promise<{ hasAuditUserFields: boolean, files: { relativePath: string, contents: string, writeMode?: string }[], notes: string[] }>}
 */
async function resolveBaseEntityUpgrade(config) {
  const ns = config.projectName;
  const relative = paths.domain('Common', 'BaseEntity.cs');

  /** @type {{ relativePath: string, contents: string, writeMode?: string }[]} */
  const files = [];
  /** @type {string[]} */
  const notes = [];

  const projectRoot = config.projectRoot;
  let existing = null;
  if (projectRoot) {
    try {
      existing = await fs.readFile(path.join(projectRoot, relative), 'utf8');
    } catch {
      existing = null;
    }
  }

  if (existing === null) {
    notes.push(
      'BaseEntity.cs could not be read; emitting interceptor-only audit (no CreatedByUserId/UpdatedByUserId/DeletedByUserId columns).',
    );
    return { hasAuditUserFields: false, files, notes };
  }

  const alreadyPartial = /\bpartial\s+class\s+BaseEntity\b/.test(existing);
  const alreadyHasFields = existing.includes('CreatedByUserId');

  if (!alreadyPartial) {
    // Safely convert to a partial class so the audit columns can be added out
    // of band without touching the hand-authored members.
    const upgraded = existing.replace(
      /(\bpublic\s+abstract\s+)class(\s+BaseEntity\b)/,
      '$1partial class$2',
    );

    if (upgraded === existing) {
      notes.push(
        'BaseEntity is not a recognizable "public abstract class BaseEntity"; emitting interceptor-only audit.',
      );
      return { hasAuditUserFields: false, files, notes };
    }

    files.push({ relativePath: relative, contents: upgraded, writeMode: 'replace' });
  }

  if (!alreadyHasFields) {
    files.push({
      relativePath: paths.domain('Common', 'BaseEntity.Audit.g.cs'),
      contents: renderBaseEntityAuditPartial(ns),
    });
  }

  notes.push(
    'BaseEntity upgraded to partial; audit-user columns added via BaseEntity.Audit.g.cs (run an EF migration to create them).',
  );
  return { hasAuditUserFields: true, files, notes };
}

/**
 * @param {string} ns
 */
function renderBaseEntityAuditPartial(ns) {
  return `namespace ${ns}.Domain.Common;

public abstract partial class BaseEntity
{
    public Guid? CreatedByUserId { get; set; }

    public Guid? UpdatedByUserId { get; set; }

    public Guid? DeletedByUserId { get; set; }
}
`;
}

/* ================================================================== */
/* Domain                                                             */
/* ================================================================== */

/**
 * @param {string} ns
 */
function renderAuditActionEnum(ns) {
  return `namespace ${ns}.Domain.Enums;

public enum AuditAction
{
    Created = 0,
    Updated = 1,
    Deleted = 2,
    Restored = 3,
}
`;
}

/**
 * @param {string} ns
 */
function renderAuditLogEntity(ns) {
  return `using ${ns}.Domain.Enums;

namespace ${ns}.Domain.Entities;

/// <summary>
/// Immutable record of a persisted entity change. Sensitive values (passwords,
/// tokens, hashes, security stamps, cookies) are redacted before storage.
/// </summary>
public sealed class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string EntityName { get; set; } = string.Empty;

    public string EntityId { get; set; } = string.Empty;

    public AuditAction Action { get; set; }

    /// <summary>JSON payload of redacted scalar changes.</summary>
    public string ChangesJson { get; set; } = string.Empty;

    public Guid? UserId { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
`;
}

/**
 * @param {string} ns
 */
function renderAuditLogConfiguration(ns) {
  return `using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ${ns}.Domain.Entities;

namespace ${ns}.Infrastructure.Persistence.Configurations;

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");
        builder.HasKey(entity => entity.Id);

        builder.Property(entity => entity.EntityName)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(entity => entity.EntityId)
            .IsRequired()
            .HasMaxLength(128);

        builder.Property(entity => entity.Action)
            .HasConversion<int>();

        builder.Property(entity => entity.ChangesJson)
            .IsRequired();

        builder.HasIndex(entity => new { entity.EntityName, entity.CreatedAtUtc });
        builder.HasIndex(entity => entity.UserId);
        builder.HasIndex(entity => entity.CreatedAtUtc);
    }
}
`;
}

/* ================================================================== */
/* Interceptor                                                        */
/* ================================================================== */

/**
 * @param {string} ns
 * @param {boolean} hasAuditUserFields
 */
function renderInterceptor(ns, hasAuditUserFields) {
  const baseEntityUsing = hasAuditUserFields
    ? `using ${ns}.Domain.Common;\n`
    : '';

  const stampBlock = hasAuditUserFields
    ? `
            if (entry.Entity is BaseEntity trackable)
            {
                if (entry.State == EntityState.Added)
                {
                    trackable.CreatedByUserId = userId;
                }
                else if (action == AuditAction.Deleted)
                {
                    trackable.DeletedByUserId = userId;
                }
                else
                {
                    trackable.UpdatedByUserId = userId;
                }
            }
`
    : '';

  return `using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using ${ns}.Application.Abstractions;
${baseEntityUsing}using ${ns}.Domain.Entities;
using ${ns}.Domain.Enums;

namespace ${ns}.Infrastructure.Auditing;

/// <summary>
/// Records scalar entity changes on SaveChanges. Field names containing any of
/// the redacted keywords (case-insensitive) never have their values persisted.
/// </summary>
public sealed class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    private const string RedactedValue = "***REDACTED***";

    private static readonly string[] RedactedKeywords =
    {
        "password",
        "token",
        "hash",
        "securitystamp",
        "cookie",
    };

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never,
    };

    private readonly ICurrentUser _currentUser;

    public AuditSaveChangesInterceptor(ICurrentUser currentUser)
    {
        _currentUser = currentUser;
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        if (eventData.Context is not null)
        {
            Capture(eventData.Context);
        }

        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null)
        {
            Capture(eventData.Context);
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void Capture(DbContext context)
    {
        var userId = _currentUser.UserId;
        var utcNow = DateTime.UtcNow;
        var logs = new List<AuditLog>();

        foreach (var entry in context.ChangeTracker.Entries().ToArray())
        {
            // Never audit the audit table itself.
            if (entry.Entity is AuditLog)
            {
                continue;
            }

            if (entry.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted))
            {
                continue;
            }

            var action = ResolveAction(entry);
${stampBlock}
            var changes = BuildChanges(entry, action);
            if (changes.Count == 0 && action == AuditAction.Updated)
            {
                continue;
            }

            logs.Add(new AuditLog
            {
                EntityName = entry.Metadata.ClrType.Name,
                EntityId = ResolveKey(entry),
                Action = action,
                ChangesJson = JsonSerializer.Serialize(changes, SerializerOptions),
                UserId = userId,
                CreatedAtUtc = utcNow,
            });
        }

        if (logs.Count > 0)
        {
            context.Set<AuditLog>().AddRange(logs);
        }
    }

    private static AuditAction ResolveAction(EntityEntry entry)
    {
        if (entry.State == EntityState.Added)
        {
            return AuditAction.Created;
        }

        if (entry.State == EntityState.Deleted)
        {
            return AuditAction.Deleted;
        }

        // Detect soft-delete transitions surfaced as Modified state.
        var isDeleted = entry.Properties
            .FirstOrDefault(property => property.Metadata.Name == "IsDeleted");

        if (isDeleted is { IsModified: true })
        {
            var original = isDeleted.OriginalValue as bool?;
            var current = isDeleted.CurrentValue as bool?;

            if (original == true && current == false)
            {
                return AuditAction.Restored;
            }

            if (original == false && current == true)
            {
                return AuditAction.Deleted;
            }
        }

        return AuditAction.Updated;
    }

    private static Dictionary<string, object?> BuildChanges(EntityEntry entry, AuditAction action)
    {
        var changes = new Dictionary<string, object?>();

        foreach (var property in entry.Properties)
        {
            if (property.Metadata.IsPrimaryKey())
            {
                continue;
            }

            var name = property.Metadata.Name;
            var redacted = IsRedacted(name);

            switch (action)
            {
                case AuditAction.Created:
                    changes[name] = redacted ? RedactedValue : property.CurrentValue;
                    break;
                case AuditAction.Deleted:
                    changes[name] = redacted ? RedactedValue : property.OriginalValue;
                    break;
                default:
                    if (property.IsModified &&
                        !Equals(property.OriginalValue, property.CurrentValue))
                    {
                        changes[name] = redacted
                            ? RedactedValue
                            : new Dictionary<string, object?>
                            {
                                ["old"] = property.OriginalValue,
                                ["new"] = property.CurrentValue,
                            };
                    }

                    break;
            }
        }

        return changes;
    }

    private static bool IsRedacted(string name) =>
        RedactedKeywords.Any(keyword =>
            name.Contains(keyword, StringComparison.OrdinalIgnoreCase));

    private static string ResolveKey(EntityEntry entry)
    {
        var key = entry.Properties
            .FirstOrDefault(property => property.Metadata.IsPrimaryKey());
        return key?.CurrentValue?.ToString() ?? string.Empty;
    }
}
`;
}

/* ================================================================== */
/* Application feature                                                */
/* ================================================================== */

/**
 * @param {string} ns
 * @returns {{ relativePath: string, contents: string }[]}
 */
function planAuditApplication(ns) {
  const base = (...segments) => paths.application('Features', 'AuditLogs', ...segments);

  return [
    { relativePath: base('Common', 'AuditLogDto.cs'), contents: renderAuditDto(ns) },
    { relativePath: base('Common', 'AuditLogMappings.cs'), contents: renderAuditMappings(ns) },
    { relativePath: base('Search', 'SearchAuditLogsQuery.cs'), contents: renderAuditSearchQuery(ns) },
    {
      relativePath: base('Search', 'SearchAuditLogsQueryHandler.cs'),
      contents: renderAuditSearchHandler(ns),
    },
    {
      relativePath: base('Search', 'SearchAuditLogsQueryValidator.cs'),
      contents: renderAuditSearchValidator(ns),
    },
    { relativePath: base('GetById', 'GetAuditLogByIdQuery.cs'), contents: renderAuditGetByIdQuery(ns) },
    {
      relativePath: base('GetById', 'GetAuditLogByIdQueryHandler.cs'),
      contents: renderAuditGetByIdHandler(ns),
    },
    { relativePath: paths.api('Routing', 'Router.AuditLogs.g.cs'), contents: renderAuditRouter(ns) },
    {
      relativePath: paths.api('Controllers', 'AuditLogsController.cs'),
      contents: renderAuditController(ns),
    },
  ];
}

/**
 * @param {string} ns
 */
function renderAuditDto(ns) {
  return `namespace ${ns}.Application.Features.AuditLogs.Common;

public sealed record AuditLogDto
{
    public Guid Id { get; init; }

    public string EntityName { get; init; } = string.Empty;

    public string EntityId { get; init; } = string.Empty;

    public string Action { get; init; } = string.Empty;

    public string ChangesJson { get; init; } = string.Empty;

    public Guid? UserId { get; init; }

    public DateTime CreatedAtUtc { get; init; }
}
`;
}

/**
 * @param {string} ns
 */
function renderAuditMappings(ns) {
  return `using ${ns}.Domain.Entities;

namespace ${ns}.Application.Features.AuditLogs.Common;

public static class AuditLogMappings
{
    public static AuditLogDto ToDto(AuditLog entity)
    {
        return new AuditLogDto
        {
            Id = entity.Id,
            EntityName = entity.EntityName,
            EntityId = entity.EntityId,
            Action = entity.Action.ToString(),
            ChangesJson = entity.ChangesJson,
            UserId = entity.UserId,
            CreatedAtUtc = entity.CreatedAtUtc,
        };
    }
}
`;
}

/**
 * @param {string} ns
 */
function renderAuditSearchQuery(ns) {
  return `using MediatR;
using ${ns}.Application.Common.Models;
using ${ns}.Application.Common.Results;
using ${ns}.Application.Features.AuditLogs.Common;
using ${ns}.Domain.Enums;

namespace ${ns}.Application.Features.AuditLogs.Search;

public sealed class SearchAuditLogsQuery
    : SearchRequest, IRequest<Result<PaginationResult<AuditLogDto>>>
{
    public string? EntityName { get; init; }

    public AuditAction? Action { get; init; }

    public Guid? UserId { get; init; }

    public DateTime? FromUtc { get; init; }

    public DateTime? ToUtc { get; init; }
}
`;
}

/**
 * @param {string} ns
 */
function renderAuditSearchHandler(ns) {
  return `using MediatR;
using Microsoft.EntityFrameworkCore;
using ${ns}.Application.Abstractions.Persistence;
using ${ns}.Application.Common.Models;
using ${ns}.Application.Common.Results;
using ${ns}.Application.Features.AuditLogs.Common;
using ${ns}.Domain.Entities;

namespace ${ns}.Application.Features.AuditLogs.Search;

public sealed class SearchAuditLogsQueryHandler
    : IRequestHandler<SearchAuditLogsQuery, Result<PaginationResult<AuditLogDto>>>
{
    private readonly IApplicationDbContext _dbContext;

    public SearchAuditLogsQueryHandler(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<PaginationResult<AuditLogDto>>> Handle(
        SearchAuditLogsQuery request,
        CancellationToken cancellationToken)
    {
        IQueryable<AuditLog> query = _dbContext.AuditLogs.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.EntityName))
        {
            query = query.Where(entry => entry.EntityName == request.EntityName);
        }

        if (request.Action.HasValue)
        {
            query = query.Where(entry => entry.Action == request.Action.Value);
        }

        if (request.UserId.HasValue)
        {
            query = query.Where(entry => entry.UserId == request.UserId.Value);
        }

        if (request.FromUtc.HasValue)
        {
            query = query.Where(entry => entry.CreatedAtUtc >= request.FromUtc.Value);
        }

        if (request.ToUtc.HasValue)
        {
            query = query.Where(entry => entry.CreatedAtUtc <= request.ToUtc.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var pattern = $"%{request.SearchTerm.Trim()}%";
            query = query.Where(entry =>
                EF.Functions.Like(entry.EntityName, pattern) ||
                EF.Functions.Like(entry.EntityId, pattern));
        }

        query = query.OrderByDescending(entry => entry.CreatedAtUtc);

        var totalCount = await query.CountAsync(cancellationToken);
        var page = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var data = page.Select(AuditLogMappings.ToDto).ToList();

        var result = PaginationResult<AuditLogDto>.Create(
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
 * @param {string} ns
 */
function renderAuditSearchValidator(ns) {
  return `using FluentValidation;
using ${ns}.Application.Common.Models;

namespace ${ns}.Application.Features.AuditLogs.Search;

public sealed class SearchAuditLogsQueryValidator : AbstractValidator<SearchAuditLogsQuery>
{
    public SearchAuditLogsQueryValidator()
    {
        RuleFor(request => request.Page)
            .GreaterThanOrEqualTo(1);

        RuleFor(request => request.PageSize)
            .InclusiveBetween(1, PaginationRequest.MaxPageSize);
    }
}
`;
}

/**
 * @param {string} ns
 */
function renderAuditGetByIdQuery(ns) {
  return `using MediatR;
using ${ns}.Application.Common.Results;
using ${ns}.Application.Features.AuditLogs.Common;

namespace ${ns}.Application.Features.AuditLogs.GetById;

public sealed record GetAuditLogByIdQuery(Guid Id) : IRequest<Result<AuditLogDto>>;
`;
}

/**
 * @param {string} ns
 */
function renderAuditGetByIdHandler(ns) {
  return `using MediatR;
using Microsoft.EntityFrameworkCore;
using ${ns}.Application.Abstractions.Persistence;
using ${ns}.Application.Common.Results;
using ${ns}.Application.Features.AuditLogs.Common;

namespace ${ns}.Application.Features.AuditLogs.GetById;

public sealed class GetAuditLogByIdQueryHandler
    : IRequestHandler<GetAuditLogByIdQuery, Result<AuditLogDto>>
{
    private readonly IApplicationDbContext _dbContext;

    public GetAuditLogByIdQueryHandler(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<AuditLogDto>> Handle(
        GetAuditLogByIdQuery request,
        CancellationToken cancellationToken)
    {
        var entity = await _dbContext.AuditLogs
            .AsNoTracking()
            .FirstOrDefaultAsync(entry => entry.Id == request.Id, cancellationToken);

        if (entity is null)
        {
            return Result.Failure<AuditLogDto>(
                Error.NotFound(
                    "AuditLog.NotFound",
                    $"Audit log '{request.Id}' was not found."));
        }

        return Result.Success(AuditLogMappings.ToDto(entity));
    }
}
`;
}

/**
 * @param {string} ns
 */
function renderAuditRouter(ns) {
  return `namespace ${ns}.API.Routing;

public static partial class Router
{
    public static class AuditLogs
    {
        public const string Root = Rule + "/AuditLogs";
        public const string Search = Root + "/Search";
        public const string ById = Root + "/{id:guid}";
    }
}
`;
}

/**
 * @param {string} ns
 */
function renderAuditController(ns) {
  return `using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ${ns}.Application.Common.Authorization;
using ${ns}.API.Routing;
using ${ns}.Application.Features.AuditLogs.GetById;
using ${ns}.Application.Features.AuditLogs.Search;

namespace ${ns}.API.Controllers;

[Authorize]
public sealed class AuditLogsController : ApiControllerBase
{
    private readonly ISender _sender;

    public AuditLogsController(ISender sender)
    {
        _sender = sender;
    }

    [HasPermission(PermissionConstants.AuditView)]
    [HttpPost(Router.AuditLogs.Search)]
    public async Task<IActionResult> Search(
        [FromBody] SearchAuditLogsQuery query,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(query, cancellationToken);
        return ToActionResult(result);
    }

    [HasPermission(PermissionConstants.AuditView)]
    [HttpGet(Router.AuditLogs.ById)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _sender.Send(new GetAuditLogByIdQuery(id), cancellationToken);
        return ToActionResult(result);
    }
}
`;
}

/* ================================================================== */
/* React frontend                                                     */
/* ================================================================== */

/**
 * @param {object} config
 * @returns {{ relativePath: string, contents: string }[]}
 */
function planAuditReact(config) {
  const mod = (...segments) => paths.reactModule('audit', ...segments);
  /** @type {{ relativePath: string, contents: string }[]} */
  const files = [
    { relativePath: mod('types', 'auditLog.types.ts'), contents: reactAuditTypes() },
    { relativePath: mod('services', 'auditLogs.routes.ts'), contents: reactAuditRoutes() },
    { relativePath: mod('services', 'auditLogs.service.ts'), contents: reactAuditService() },
    {
      relativePath: mod('slices', 'thunks', 'getAuditLogs.thunk.ts'),
      contents: reactAuditListThunk(),
    },
    {
      relativePath: mod('slices', 'thunks', 'getAuditLogById.thunk.ts'),
      contents: reactAuditByIdThunk(),
    },
    { relativePath: mod('slices', 'auditLogs.slice.ts'), contents: reactAuditSlice() },
    { relativePath: mod('hooks', 'useAuditLogsController.ts'), contents: reactAuditController() },
    { relativePath: mod('pages', 'AuditDashboardPage.tsx'), contents: reactAuditPage() },
    { relativePath: mod('index.ts'), contents: reactAuditIndex() },
  ];

  if (isNext(config)) {
    files.push({
      relativePath: paths.client('app', '(dashboard)', 'dashboard', 'audit', 'page.tsx'),
      contents: 'export { default } from "@/modules/audit/pages/AuditDashboardPage";\n',
    });
  } else {
    files.push({
      relativePath: paths.client('app', 'router', 'routes', 'audit.routes.tsx'),
      contents: `import AuditDashboardPage from "@/modules/audit/pages/AuditDashboardPage";

export const auditRoute = {
  path: "audit",
  Component: AuditDashboardPage,
};
`,
    });
  }

  return files;
}

function reactAuditTypes() {
  return `export type AuditLog = {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  changesJson: string;
  userId: string | null;
  createdAtUtc: string;
};

export type AuditLogSearchRequest = {
  page: number;
  pageSize: number;
  searchTerm?: string | null;
  entityName?: string | null;
  action?: string | null;
  userId?: string | null;
  fromUtc?: string | null;
  toUtc?: string | null;
};
`;
}

function reactAuditRoutes() {
  return `export const auditLogsApiRoutes = {
  search: "/api/v1/AuditLogs/Search",
  byId: (id: string) => \`/api/v1/AuditLogs/\${id}\`,
} as const;
`;
}

function reactAuditService() {
  return `import { apiClient } from "@/lib/api/api-client";
import {
  normalizePagination,
  type PaginationResult,
} from "@/shared/state/pagination/pagination.types";
import { auditLogsApiRoutes } from "./auditLogs.routes";
import type { AuditLog, AuditLogSearchRequest } from "../types/auditLog.types";

export const auditLogsService = {
  async search(
    request: AuditLogSearchRequest,
  ): Promise<PaginationResult<AuditLog>> {
    const response = await apiClient.post<PaginationResult<AuditLog>>(
      auditLogsApiRoutes.search,
      request,
    );
    return normalizePagination(response.data);
  },

  async getById(id: string): Promise<AuditLog> {
    const response = await apiClient.get<AuditLog>(auditLogsApiRoutes.byId(id));
    return response.data;
  },
};
`;
}

function reactAuditListThunk() {
  return `import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import type { PaginationResult } from "@/shared/state/pagination/pagination.types";
import { auditLogsService } from "../../services/auditLogs.service";
import type {
  AuditLog,
  AuditLogSearchRequest,
} from "../../types/auditLog.types";

export const getAuditLogs = createAsyncThunk<
  PaginationResult<AuditLog>,
  AuditLogSearchRequest,
  { rejectValue: string }
>("auditLogs/getAuditLogs", async (request, { rejectWithValue }) => {
  try {
    return await auditLogsService.search(request);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
`;
}

function reactAuditByIdThunk() {
  return `import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { auditLogsService } from "../../services/auditLogs.service";
import type { AuditLog } from "../../types/auditLog.types";

export const getAuditLogById = createAsyncThunk<
  AuditLog,
  string,
  { rejectValue: string }
>("auditLogs/getAuditLogById", async (id, { rejectWithValue }) => {
  try {
    return await auditLogsService.getById(id);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
`;
}

function reactAuditSlice() {
  return `import { createSlice } from "@reduxjs/toolkit";
import type { PaginationResult } from "@/shared/state/pagination/pagination.types";
import type { AuditLog } from "../types/auditLog.types";
import { getAuditLogs } from "./thunks/getAuditLogs.thunk";
import { getAuditLogById } from "./thunks/getAuditLogById.thunk";

type AuditLogsState = {
  items: AuditLog[];
  selected: AuditLog | null;
  pagination: PaginationResult<AuditLog> | null;
  isLoading: boolean;
  error: string | null;
};

const initialState: AuditLogsState = {
  items: [],
  selected: null,
  pagination: null,
  isLoading: false,
  error: null,
};

const auditLogsSlice = createSlice({
  name: "auditLogs",
  initialState,
  reducers: {
    clearSelectedAuditLog(state) {
      state.selected = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAuditLogs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAuditLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.data;
        state.pagination = action.payload;
      })
      .addCase(getAuditLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Unable to load audit logs";
      })
      .addCase(getAuditLogById.fulfilled, (state, action) => {
        state.selected = action.payload;
      });
  },
});

export const { clearSelectedAuditLog } = auditLogsSlice.actions;
export default auditLogsSlice.reducer;
`;
}

function reactAuditController() {
  return `"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getAuditLogs } from "../slices/thunks/getAuditLogs.thunk";
import { getAuditLogById } from "../slices/thunks/getAuditLogById.thunk";
import { clearSelectedAuditLog } from "../slices/auditLogs.slice";
import type { AuditLogSearchRequest } from "../types/auditLog.types";

export function useAuditLogsController() {
  const dispatch = useAppDispatch();
  const { items, selected, pagination, isLoading, error } = useAppSelector(
    (state) => state.auditLogs,
  );

  const load = useCallback(
    (request: AuditLogSearchRequest) => {
      void dispatch(getAuditLogs(request));
    },
    [dispatch],
  );

  const loadById = useCallback(
    (id: string) => {
      void dispatch(getAuditLogById(id));
    },
    [dispatch],
  );

  const clearSelected = useCallback(() => {
    dispatch(clearSelectedAuditLog());
  }, [dispatch]);

  return { items, selected, pagination, isLoading, error, load, loadById, clearSelected };
}
`;
}

function reactAuditPage() {
  return `"use client";

import { useEffect, useState } from "react";
import { useAuditLogsController } from "../hooks/useAuditLogsController";

const ACTIONS = ["", "Created", "Updated", "Deleted", "Restored"];

function formatChanges(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export default function AuditDashboardPage() {
  const { items, selected, pagination, isLoading, error, load, loadById, clearSelected } =
    useAuditLogsController();
  const [entityName, setEntityName] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    load({ page, pageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = (nextPage: number) => {
    setPage(nextPage);
    load({
      page: nextPage,
      pageSize,
      entityName: entityName.trim() || null,
      action: action || null,
    });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold text-zinc-900">Audit Trail</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Review entity changes. Sensitive values are redacted at capture time.
        </p>
      </header>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters(1);
        }}
      >
        <label className="flex flex-col gap-1 text-sm text-zinc-800">
          Entity
          <input
            type="text"
            value={entityName}
            onChange={(event) => setEntityName(event.target.value)}
            placeholder="e.g. Product"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-800">
          Action
          <select
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          >
            {ACTIONS.map((value) => (
              <option key={value || "all"} value={value}>
                {value || "All"}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900"
        >
          Apply
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-zinc-600">Loading audit logs...</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">When</th>
                <th scope="col" className="px-3 py-2 text-left font-medium">Entity</th>
                <th scope="col" className="px-3 py-2 text-left font-medium">Entity Id</th>
                <th scope="col" className="px-3 py-2 text-left font-medium">Action</th>
                <th scope="col" className="px-3 py-2 text-left font-medium">User</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white text-zinc-900">
              {items.map((log) => (
                <tr key={log.id}>
                  <td className="px-3 py-2">{log.createdAtUtc}</td>
                  <td className="px-3 py-2">{log.entityName}</td>
                  <td className="px-3 py-2">{log.entityId}</td>
                  <td className="px-3 py-2">{log.action}</td>
                  <td className="px-3 py-2">{log.userId ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-sm text-zinc-900 underline"
                      onClick={() => loadById(log.id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-700">
          <p>
            Page {pagination.currentPage} of {pagination.totalPages} ·{" "}
            {pagination.totalCount} total
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1.5 disabled:opacity-50"
              disabled={!pagination.hasPreviousPage || isLoading}
              onClick={() => applyFilters(Math.max(1, page - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1.5 disabled:opacity-50"
              disabled={!pagination.hasNextPage || isLoading}
              onClick={() => applyFilters(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-md bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">
                {selected.entityName} · {selected.action}
              </h2>
              <button
                type="button"
                className="text-sm text-zinc-600 underline"
                onClick={clearSelected}
              >
                Close
              </button>
            </div>
            <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-zinc-50 p-4 text-xs text-zinc-800">
              {formatChanges(selected.changesJson)}
            </pre>
          </div>
        </div>
      ) : null}
    </main>
  );
}
`;
}

function reactAuditIndex() {
  return `export { default as auditLogsReducer } from "./slices/auditLogs.slice";
export { default as AuditDashboardPage } from "./pages/AuditDashboardPage";
export { useAuditLogsController } from "./hooks/useAuditLogsController";
export { auditLogsService } from "./services/auditLogs.service";
export type { AuditLog } from "./types/auditLog.types";
`;
}

/* ================================================================== */
/* Angular frontend                                                   */
/* ================================================================== */

/**
 * @param {object} config
 * @returns {{ relativePath: string, contents: string }[]}
 */
function planAuditAngular(config) {
  const base = (...segments) => paths.angularFeature('audit', ...segments);
  return [
    { relativePath: base('models', 'audit-log.model.ts'), contents: ngAuditModel() },
    { relativePath: base('services', 'audit-log.service.ts'), contents: ngAuditService() },
    { relativePath: base('store', 'audit-log.state.ts'), contents: ngAuditState() },
    { relativePath: base('store', 'audit-log.actions.ts'), contents: ngAuditActions() },
    { relativePath: base('store', 'audit-log.reducer.ts'), contents: ngAuditReducer() },
    { relativePath: base('store', 'audit-log.effects.ts'), contents: ngAuditEffects() },
    { relativePath: base('store', 'audit-log.selectors.ts'), contents: ngAuditSelectors() },
    {
      relativePath: base('pages', 'audit-dashboard-page', 'audit-dashboard-page.component.ts'),
      contents: ngAuditPage(),
    },
    { relativePath: base('audit-log.routes.ts'), contents: ngAuditRoutes() },
  ];
}

function ngAuditModel() {
  return `import type { PaginationResult } from "../../../shared/models/pagination";

export type AuditLog = {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  changesJson: string;
  userId: string | null;
  createdAtUtc: string;
};

export type AuditLogQuery = {
  page: number;
  pageSize: number;
  searchTerm?: string | null;
  entityName?: string | null;
  action?: string | null;
  userId?: string | null;
  fromUtc?: string | null;
  toUtc?: string | null;
};

export type AuditLogPage = PaginationResult<AuditLog>;
`;
}

function ngAuditService() {
  return `import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import type { PaginationResult } from "../../../shared/models/pagination";
import type { AuditLog, AuditLogQuery } from "../models/audit-log.model";

const basePath = "/api/v1/AuditLogs";

@Injectable({ providedIn: "root" })
export class AuditLogService {
  constructor(private readonly http: HttpClient) {}

  search(query: AuditLogQuery): Observable<PaginationResult<AuditLog>> {
    return this.http.post<PaginationResult<AuditLog>>(\`\${basePath}/Search\`, query);
  }

  getById(id: string): Observable<AuditLog> {
    return this.http.get<AuditLog>(\`\${basePath}/\${id}\`);
  }
}
`;
}

function ngAuditState() {
  return `import type { PaginationResult } from "../../../shared/models/pagination";
import type { AuditLog } from "../models/audit-log.model";

export const auditLogsFeatureKey = "auditLogs";

export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

export type AuditLogsState = {
  items: AuditLog[];
  selected: AuditLog | null;
  pagination: PaginationResult<AuditLog> | null;
  status: RequestStatus;
  error: string | null;
};

export const initialAuditLogsState: AuditLogsState = {
  items: [],
  selected: null,
  pagination: null,
  status: "idle",
  error: null,
};
`;
}

function ngAuditActions() {
  return `import { createActionGroup, emptyProps, props } from "@ngrx/store";
import type { PaginationResult } from "../../../shared/models/pagination";
import type { AuditLog, AuditLogQuery } from "../models/audit-log.model";

export const AuditLogActions = createActionGroup({
  source: "AuditLogs",
  events: {
    "Load Audit Logs": props<{ query: AuditLogQuery }>(),
    "Load Audit Logs Success": props<{ result: PaginationResult<AuditLog> }>(),
    "Load Audit Logs Failure": props<{ error: string }>(),
    "Load Audit Log By Id": props<{ id: string }>(),
    "Load Audit Log By Id Success": props<{ auditLog: AuditLog }>(),
    "Load Audit Log By Id Failure": props<{ error: string }>(),
    "Clear Selected": emptyProps(),
  },
});
`;
}

function ngAuditReducer() {
  return `import { createReducer, on } from "@ngrx/store";
import { AuditLogActions } from "./audit-log.actions";
import { initialAuditLogsState } from "./audit-log.state";

export const auditLogsReducer = createReducer(
  initialAuditLogsState,
  on(AuditLogActions.loadAuditLogs, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(AuditLogActions.loadAuditLogsSuccess, (state, { result }) => ({
    ...state,
    status: "succeeded" as const,
    items: result.data,
    pagination: result,
  })),
  on(AuditLogActions.loadAuditLogsFailure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  })),
  on(AuditLogActions.loadAuditLogByIdSuccess, (state, { auditLog }) => ({
    ...state,
    selected: auditLog,
  })),
  on(AuditLogActions.clearSelected, (state) => ({ ...state, selected: null })),
);
`;
}

function ngAuditEffects() {
  return `import { Injectable, inject } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { catchError, map, of, switchMap } from "rxjs";
import { getErrorMessage } from "../../../shared/utils/get-error-message";
import { AuditLogService } from "../services/audit-log.service";
import { AuditLogActions } from "./audit-log.actions";

@Injectable()
export class AuditLogEffects {
  private readonly actions$ = inject(Actions);
  private readonly auditLogService = inject(AuditLogService);

  loadAuditLogs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuditLogActions.loadAuditLogs),
      switchMap(({ query }) =>
        this.auditLogService.search(query).pipe(
          map((result) => AuditLogActions.loadAuditLogsSuccess({ result })),
          catchError((error: unknown) =>
            of(AuditLogActions.loadAuditLogsFailure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  loadAuditLogById$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuditLogActions.loadAuditLogById),
      switchMap(({ id }) =>
        this.auditLogService.getById(id).pipe(
          map((auditLog) => AuditLogActions.loadAuditLogByIdSuccess({ auditLog })),
          catchError((error: unknown) =>
            of(AuditLogActions.loadAuditLogByIdFailure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );
}
`;
}

function ngAuditSelectors() {
  return `import { createFeatureSelector, createSelector } from "@ngrx/store";
import { auditLogsFeatureKey, type AuditLogsState } from "./audit-log.state";

export const selectAuditLogsState =
  createFeatureSelector<AuditLogsState>(auditLogsFeatureKey);

export const selectAuditLogs = createSelector(
  selectAuditLogsState,
  (state) => state.items,
);
export const selectSelectedAuditLog = createSelector(
  selectAuditLogsState,
  (state) => state.selected,
);
export const selectAuditLogsError = createSelector(
  selectAuditLogsState,
  (state) => state.error,
);
export const selectAuditLogsPagination = createSelector(
  selectAuditLogsState,
  (state) => state.pagination,
);
`;
}

function ngAuditPage() {
  return `import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Store } from "@ngrx/store";
import { AuditLogActions } from "../../store/audit-log.actions";
import {
  selectAuditLogs,
  selectAuditLogsError,
  selectAuditLogsPagination,
  selectSelectedAuditLog,
} from "../../store/audit-log.selectors";

const ACTIONS = ["", "Created", "Updated", "Deleted", "Restored"];

@Component({
  selector: "app-audit-dashboard-page",
  standalone: true,
  imports: [FormsModule],
  template: \`
    <main class="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 class="text-3xl font-semibold text-zinc-900">Audit Trail</h1>
        <p class="mt-1 text-sm text-zinc-600">
          Review entity changes. Sensitive values are redacted at capture time.
        </p>
      </header>

      <form class="flex flex-wrap items-end gap-3" (ngSubmit)="applyFilters(1)">
        <label class="flex flex-col gap-1 text-sm text-zinc-800">
          Entity
          <input
            type="text"
            class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            placeholder="e.g. Product"
            [ngModel]="entityName()"
            (ngModelChange)="entityName.set($event)"
            name="entityName"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm text-zinc-800">
          Action
          <select
            class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            [ngModel]="action()"
            (ngModelChange)="action.set($event)"
            name="action"
          >
            @for (value of actions; track value) {
              <option [value]="value">{{ value || "All" }}</option>
            }
          </select>
        </label>
        <button
          type="submit"
          class="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900"
        >
          Apply
        </button>
      </form>

      @if (error(); as message) {
        <p class="text-sm text-red-600" role="alert">{{ message }}</p>
      }

      <div class="overflow-x-auto rounded-md border border-zinc-200">
        <table class="min-w-full divide-y divide-zinc-200 text-sm">
          <thead class="bg-zinc-50 text-zinc-700">
            <tr>
              <th class="px-3 py-2 text-left font-medium">When</th>
              <th class="px-3 py-2 text-left font-medium">Entity</th>
              <th class="px-3 py-2 text-left font-medium">Entity Id</th>
              <th class="px-3 py-2 text-left font-medium">Action</th>
              <th class="px-3 py-2 text-left font-medium">User</th>
              <th class="px-3 py-2 text-right font-medium">Details</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 bg-white text-zinc-900">
            @for (log of logs(); track log.id) {
              <tr>
                <td class="px-3 py-2">{{ log.createdAtUtc }}</td>
                <td class="px-3 py-2">{{ log.entityName }}</td>
                <td class="px-3 py-2">{{ log.entityId }}</td>
                <td class="px-3 py-2">{{ log.action }}</td>
                <td class="px-3 py-2">{{ log.userId ?? "—" }}</td>
                <td class="px-3 py-2 text-right">
                  <button
                    type="button"
                    class="text-sm text-zinc-900 underline"
                    (click)="view(log.id)"
                  >
                    View
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (pagination(); as page) {
        <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-700">
          <p>Page {{ page.currentPage }} of {{ page.totalPages }} · {{ page.totalCount }} total</p>
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-md border border-zinc-300 px-3 py-1.5 disabled:opacity-50"
              [disabled]="!page.hasPreviousPage"
              (click)="applyFilters(page.currentPage - 1)"
            >
              Previous
            </button>
            <button
              type="button"
              class="rounded-md border border-zinc-300 px-3 py-1.5 disabled:opacity-50"
              [disabled]="!page.hasNextPage"
              (click)="applyFilters(page.currentPage + 1)"
            >
              Next
            </button>
          </div>
        </div>
      }

      @if (selected(); as detail) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div class="w-full max-w-2xl rounded-md bg-white p-6 shadow-lg">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-zinc-900">
                {{ detail.entityName }} · {{ detail.action }}
              </h2>
              <button
                type="button"
                class="text-sm text-zinc-600 underline"
                (click)="close()"
              >
                Close
              </button>
            </div>
            <pre class="mt-4 max-h-96 overflow-auto rounded-md bg-zinc-50 p-4 text-xs text-zinc-800">{{ formatChanges(detail.changesJson) }}</pre>
          </div>
        </div>
      }
    </main>
  \`,
})
export class AuditDashboardPageComponent implements OnInit {
  private readonly store = inject(Store);

  readonly logs = this.store.selectSignal(selectAuditLogs);
  readonly pagination = this.store.selectSignal(selectAuditLogsPagination);
  readonly error = this.store.selectSignal(selectAuditLogsError);
  readonly selected = this.store.selectSignal(selectSelectedAuditLog);

  readonly entityName = signal("");
  readonly action = signal("");
  readonly actions = ACTIONS;

  private readonly pageSize = 20;

  ngOnInit(): void {
    this.applyFilters(1);
  }

  applyFilters(page: number): void {
    if (page < 1) {
      return;
    }

    this.store.dispatch(
      AuditLogActions.loadAuditLogs({
        query: {
          page,
          pageSize: this.pageSize,
          entityName: this.entityName().trim() || null,
          action: this.action() || null,
        },
      }),
    );
  }

  view(id: string): void {
    this.store.dispatch(AuditLogActions.loadAuditLogById({ id }));
  }

  close(): void {
    this.store.dispatch(AuditLogActions.clearSelected());
  }

  formatChanges(json: string): string {
    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      return json;
    }
  }
}
`;
}

function ngAuditRoutes() {
  return `import { Routes } from "@angular/router";
import { provideEffects } from "@ngrx/effects";
import { provideState } from "@ngrx/store";
import { AuditDashboardPageComponent } from "./pages/audit-dashboard-page/audit-dashboard-page.component";
import { AuditLogEffects } from "./store/audit-log.effects";
import { auditLogsReducer } from "./store/audit-log.reducer";
import { auditLogsFeatureKey } from "./store/audit-log.state";

export const auditLogsRoutes: Routes = [
  {
    path: "",
    providers: [
      provideState(auditLogsFeatureKey, auditLogsReducer),
      provideEffects(AuditLogEffects),
    ],
    children: [{ path: "", component: AuditDashboardPageComponent }],
  },
];
`;
}
