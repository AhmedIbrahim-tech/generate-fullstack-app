import {
  finalizePlan,
  paths,
  isReact,
  dbSetUpdates,
  moduleRegistrationFile,
  reactDashboardNavUpdate,
  routerUpdate,
} from '../modules-orchestrator-helpers.js';

/**
 * @param {object} config
 */
export function planLocalizationModule(config) {
  const ns = config.projectName;
  /** @type {{ relativePath: string, contents: string, writeMode?: string }[]} */
  const files = [];
  /** @type {{ relativePath: string, update: (existing: string) => string }[]} */
  const registryUpdates = [];
  /** @type {{ method: string, namespace: string }[]} */
  const registrations = [];

  files.push({
    relativePath: paths.domain('Entities', 'Language.cs'),
    contents: `namespace ${ns}.Domain.Entities;

public sealed class Language
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string NativeName { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}
`,
  });

  registryUpdates.push(...dbSetUpdates(ns, 'Language', 'Languages'));
  registryUpdates.push(
    routerUpdate(ns, 'Languages', 'Languages', [
      { name: 'Root' },
      { name: 'Lookup', suffix: '/Lookup' },
      { name: 'ById', suffix: '/{id:guid}' },
    ]),
  );

  files.push({
    relativePath: paths.application('Abstractions', 'Localization', 'ICurrentLanguageContext.cs'),
    writeMode: 'ifMissing',
    contents: `namespace ${ns}.Application.Abstractions.Localization;

public interface ICurrentLanguageContext
{
    string? RequestedLanguageCode { get; }
    Guid? LanguageId { get; }
    string ResolvedLanguageCode { get; }
}
`,
  });

  files.push({
    relativePath: paths.infrastructure('Localization', 'CurrentLanguageContext.cs'),
    contents: `using ${ns}.Application.Abstractions.Localization;
using ${ns}.Application.Abstractions.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace ${ns}.Infrastructure.Localization;

public sealed class CurrentLanguageContext : ICurrentLanguageContext
{
    public CurrentLanguageContext(IHttpContextAccessor httpContextAccessor, IApplicationDbContext db)
    {
        var accept = httpContextAccessor.HttpContext?.Request.Headers.AcceptLanguage.ToString();
        RequestedLanguageCode = ParsePrimary(accept);
        var languages = db.Set<Domain.Entities.Language>().AsNoTracking()
            .Where(l => l.IsActive)
            .OrderBy(l => l.SortOrder)
            .ToList();
        var match = languages.FirstOrDefault(l =>
            string.Equals(l.Code, RequestedLanguageCode, StringComparison.OrdinalIgnoreCase));
        var fallback = languages.FirstOrDefault(l => l.IsDefault) ?? languages.FirstOrDefault();
        var resolved = match ?? fallback;
        LanguageId = resolved?.Id;
        ResolvedLanguageCode = resolved?.Code ?? "en";
    }

    public string? RequestedLanguageCode { get; }
    public Guid? LanguageId { get; }
    public string ResolvedLanguageCode { get; }

    private static string? ParsePrimary(string? header)
    {
        if (string.IsNullOrWhiteSpace(header)) return null;
        var primary = header.Split(',')[0].Trim();
        var code = primary.Split(';')[0].Trim();
        if (code.Contains('-', StringComparison.Ordinal))
            code = code.Split('-')[0];
        return string.IsNullOrWhiteSpace(code) ? null : code.ToLowerInvariant();
    }
}
`,
  });

  files.push({
    relativePath: paths.infrastructure('Localization', 'LanguageSeeder.cs'),
    contents: `using ${ns}.Application.Abstractions.Persistence;
using ${ns}.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ${ns}.Infrastructure.Localization;

public static class LanguageSeeder
{
    public static async Task SeedAsync(IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        if (await db.Set<Language>().AnyAsync(ct)) return;

        db.Set<Language>().Add(new Language
        {
            Code = "en",
            Name = "English",
            NativeName = "English",
            IsDefault = true,
            IsActive = true,
            SortOrder = 0,
        });
        await db.SaveChangesAsync(ct);
    }
}
`,
  });

  files.push({
    relativePath: paths.api('Controllers', 'LanguagesController.cs'),
    contents: `using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ${ns}.API.Contracts;
using ${ns}.Application.Abstractions.Persistence;
using ${ns}.Application.Common.Models;
using ${ns}.Domain.Entities;

namespace ${ns}.API.Controllers;

[ApiController]
public sealed class LanguagesController : ApiControllerBase
{
    private readonly IApplicationDbContext _db;

    public LanguagesController(IApplicationDbContext db) => _db = db;

    [HttpGet(Router.Languages.Lookup)]
    public async Task<IActionResult> Lookup(CancellationToken ct)
    {
        var items = await _db.Set<Language>().AsNoTracking()
            .Where(l => l.IsActive)
            .OrderBy(l => l.SortOrder)
            .Select(l => new LookupItemDto { Id = l.Id, DisplayName = l.NativeName })
            .Take(100)
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpGet(Router.Languages.Root)]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var items = await _db.Set<Language>().AsNoTracking()
            .OrderBy(l => l.SortOrder)
            .ToListAsync(ct);
        return Ok(items);
    }
}
`,
  });

  files.push({
    relativePath: paths.application('Common', 'Models', 'LookupItemDto.cs'),
    writeMode: 'ifMissing',
    contents: `namespace ${ns}.Application.Common.Models;

public sealed record LookupItemDto
{
    public Guid Id { get; init; }
    public string DisplayName { get; init; } = string.Empty;
}
`,
  });

  const { file: registrationFile, registration } = moduleRegistrationFile({
    projectName: ns,
    moduleName: 'Localization',
    usings: [
      `using ${ns}.Application.Abstractions.Localization;`,
      `using ${ns}.Infrastructure.Localization;`,
    ],
    body: [
      '        services.AddScoped<ICurrentLanguageContext, CurrentLanguageContext>();',
      '        services.AddHttpContextAccessor();',
    ],
  });
  files.push(registrationFile);
  registrations.push(registration);

  if (isReact(config)) {
    files.push({
      relativePath: paths.reactModule('languages', 'pages', 'LanguagesPage.tsx'),
      writeMode: 'ifMissing',
      contents: `"use client";
export default function LanguagesPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900">Languages</h1>
      <p className="mt-2 text-sm text-zinc-600">Manage active content languages. Default language is resolved from configuration, not hardcoded.</p>
    </main>
  );
}
`,
    });
    registryUpdates.push({
      relativePath: paths.client('navigation', 'generated-dashboard-nav.ts'),
      update: reactDashboardNavUpdate({
        navKey: 'languages',
        label: 'Languages',
        href: '/dashboard/languages',
      }),
    });
  }

  return finalizePlan({
    id: 'localization',
    requires: [],
    files,
    registryUpdates,
    registrations,
    packages: {},
    notes: ['Seed en as default. Do not assume Arabic is the default.'],
  });
}
