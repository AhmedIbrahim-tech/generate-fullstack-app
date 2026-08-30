import path from 'node:path';

export const DEFAULT_MAX_UPLOAD_BYTES = 52428800; // 50 MB

/**
 * Plan the shared file-storage infrastructure. These files are only meant to be
 * created the first time a feature declares a file/image field, so every plan
 * uses `writeMode: 'ifMissing'` and will never overwrite existing code.
 *
 * @param {string} projectName - root namespace of the backend project
 * @returns {{ relativePath: string, contents: string, writeMode: string }[]}
 */
export function planFileStorageInfrastructure(projectName) {
  const ns = projectName;

  /** @param {string} contents */
  const infra = (relativePath, contents) => ({
    relativePath,
    contents,
    writeMode: 'ifMissing',
  });

  return [
    infra(
      path.join('Domain', 'Entities', 'StoredFile.cs'),
      renderStoredFileEntity(ns),
    ),
    infra(
      path.join('Application', 'Abstractions', 'Storage', 'IFileStorageService.cs'),
      renderStorageAbstraction(ns),
    ),
    infra(
      path.join(
        'Application',
        'Abstractions',
        'Persistence',
        'IApplicationDbContext.Files.g.cs',
      ),
      renderDbContextInterface(ns),
    ),
    infra(
      path.join('Application', 'Features', 'Files', 'Common', 'StoredFileDto.cs'),
      renderStoredFileDto(ns),
    ),
    infra(
      path.join('Application', 'Features', 'Files', 'Upload', 'UploadFileCommand.cs'),
      renderUploadCommand(ns),
    ),
    infra(
      path.join(
        'Application',
        'Features',
        'Files',
        'Upload',
        'UploadFileCommandHandler.cs',
      ),
      renderUploadHandler(ns),
    ),
    infra(
      path.join('Infrastructure', 'Storage', 'LocalFileStorageService.cs'),
      renderLocalStorageService(ns),
    ),
    infra(
      path.join('Infrastructure', 'Storage', 'FileStorageRegistration.cs'),
      renderStorageRegistration(ns),
    ),
    {
      relativePath: path.join(
        'Infrastructure',
        'DependencyInjection.Generated.g.cs',
      ),
      contents: renderGeneratedDi(ns),
      writeMode: 'replace',
    },
    infra(
      path.join(
        'Infrastructure',
        'Persistence',
        'ApplicationDbContext.Files.g.cs',
      ),
      renderDbContextImplementation(ns),
    ),
    infra(
      path.join(
        'Infrastructure',
        'Persistence',
        'Configurations',
        'StoredFileConfiguration.cs',
      ),
      renderStoredFileConfiguration(ns),
    ),
    infra(
      path.join('API', 'Routing', 'Router.Files.g.cs'),
      renderRouter(ns),
    ),
    infra(
      path.join('API', 'Controllers', 'FilesController.cs'),
      renderFilesController(ns),
    ),
  ];
}

/**
 * @param {string} ns
 */
function renderStoredFileEntity(ns) {
  return `namespace ${ns}.Domain.Entities;

public sealed partial class StoredFile : Common.BaseEntity
{
    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public long Size { get; set; }

    public string StoragePath { get; set; } = string.Empty;
}
`;
}

/**
 * @param {string} ns
 */
function renderStorageAbstraction(ns) {
  return `namespace ${ns}.Application.Abstractions.Storage;

public interface IFileStorageService
{
    Task<StoredFileResult> SaveAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken);

    Task<Stream?> OpenReadAsync(string storagePath, CancellationToken cancellationToken);

    Task DeleteAsync(string storagePath, CancellationToken cancellationToken);
}

public sealed record StoredFileResult(string StoragePath, long Size);
`;
}

/**
 * @param {string} ns
 */
function renderDbContextInterface(ns) {
  return `using Microsoft.EntityFrameworkCore;
using ${ns}.Domain.Entities;

namespace ${ns}.Application.Abstractions.Persistence;

public partial interface IApplicationDbContext
{
    DbSet<StoredFile> Files { get; }
}
`;
}

/**
 * @param {string} ns
 */
function renderStoredFileDto(ns) {
  return `namespace ${ns}.Application.Features.Files.Common;

public sealed record StoredFileDto
{
    public Guid Id { get; init; }

    public string FileName { get; init; } = string.Empty;

    public string ContentType { get; init; } = string.Empty;

    public long Size { get; init; }
}
`;
}

/**
 * @param {string} ns
 */
function renderUploadCommand(ns) {
  return `using MediatR;
using ${ns}.Application.Common.Results;
using ${ns}.Application.Features.Files.Common;

namespace ${ns}.Application.Features.Files.Upload;

public sealed record UploadFileCommand(
    Stream Content,
    string FileName,
    string ContentType,
    long Length) : IRequest<Result<StoredFileDto>>;
`;
}

/**
 * @param {string} ns
 */
function renderUploadHandler(ns) {
  return `using MediatR;
using ${ns}.Application.Abstractions.Persistence;
using ${ns}.Application.Abstractions.Storage;
using ${ns}.Application.Common.Results;
using ${ns}.Application.Features.Files.Common;
using ${ns}.Domain.Entities;

namespace ${ns}.Application.Features.Files.Upload;

public sealed class UploadFileCommandHandler
    : IRequestHandler<UploadFileCommand, Result<StoredFileDto>>
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IFileStorageService _storage;

    public UploadFileCommandHandler(
        IApplicationDbContext dbContext,
        IFileStorageService storage)
    {
        _dbContext = dbContext;
        _storage = storage;
    }

    public async Task<Result<StoredFileDto>> Handle(
        UploadFileCommand request,
        CancellationToken cancellationToken)
    {
        var saved = await _storage.SaveAsync(
            request.Content,
            request.FileName,
            request.ContentType,
            cancellationToken);

        var entity = new StoredFile
        {
            FileName = request.FileName,
            ContentType = request.ContentType,
            Size = saved.Size,
            StoragePath = saved.StoragePath,
        };

        _dbContext.Files.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var dto = new StoredFileDto
        {
            Id = entity.Id,
            FileName = entity.FileName,
            ContentType = entity.ContentType,
            Size = entity.Size,
        };

        return Result.Success(dto);
    }
}
`;
}

/**
 * @param {string} ns
 */
function renderLocalStorageService(ns) {
  return `using ${ns}.Application.Abstractions.Storage;

namespace ${ns}.Infrastructure.Storage;

public sealed class LocalFileStorageService : IFileStorageService
{
    private readonly string _root;

    public LocalFileStorageService()
    {
        _root = Path.Combine(Directory.GetCurrentDirectory(), "App_Data", "uploads");
        Directory.CreateDirectory(_root);
    }

    public async Task<StoredFileResult> SaveAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken)
    {
        var safeName = $"{Guid.NewGuid():N}_{Path.GetFileName(fileName)}";
        var fullPath = Path.Combine(_root, safeName);

        await using var target = File.Create(fullPath);
        await content.CopyToAsync(target, cancellationToken);

        return new StoredFileResult(safeName, target.Length);
    }

    public Task<Stream?> OpenReadAsync(string storagePath, CancellationToken cancellationToken)
    {
        var fullPath = Path.Combine(_root, storagePath);
        if (!File.Exists(fullPath))
        {
            return Task.FromResult<Stream?>(null);
        }

        Stream stream = File.OpenRead(fullPath);
        return Task.FromResult<Stream?>(stream);
    }

    public Task DeleteAsync(string storagePath, CancellationToken cancellationToken)
    {
        var fullPath = Path.Combine(_root, storagePath);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return Task.CompletedTask;
    }
}
`;
}

/**
 * @param {string} ns
 */
function renderStorageRegistration(ns) {
  return `using Microsoft.Extensions.DependencyInjection;
using ${ns}.Application.Abstractions.Storage;

namespace ${ns}.Infrastructure.Storage;

public static class FileStorageRegistration
{
    public static IServiceCollection AddFileStorage(this IServiceCollection services)
    {
        services.AddScoped<IFileStorageService, LocalFileStorageService>();
        return services;
    }
}
`;
}

/**
 * @param {string} ns
 */
function renderGeneratedDi(ns) {
  return `// AUTO-GENERATED BY create-fullstack-feature
// DO NOT EDIT MANUALLY

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ${ns}.Infrastructure.Storage;

namespace ${ns}.Infrastructure;

public static partial class DependencyInjection
{
    static partial void RegisterGeneratedInfrastructure(
        IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddFileStorage();
    }
}
`;
}

/**
 * @param {string} ns
 */
function renderDbContextImplementation(ns) {
  return `using Microsoft.EntityFrameworkCore;
using ${ns}.Domain.Entities;

namespace ${ns}.Infrastructure.Persistence;

public partial class ApplicationDbContext
{
    public DbSet<StoredFile> Files => Set<StoredFile>();
}
`;
}

/**
 * @param {string} ns
 */
function renderStoredFileConfiguration(ns) {
  return `using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ${ns}.Domain.Entities;

namespace ${ns}.Infrastructure.Persistence.Configurations;

public sealed class StoredFileConfiguration : IEntityTypeConfiguration<StoredFile>
{
    public void Configure(EntityTypeBuilder<StoredFile> builder)
    {
        builder.ToTable("Files");
        builder.HasKey(entity => entity.Id);

        builder.Property(entity => entity.FileName)
            .IsRequired()
            .HasMaxLength(260);

        builder.Property(entity => entity.ContentType)
            .IsRequired()
            .HasMaxLength(128);

        builder.Property(entity => entity.StoragePath)
            .IsRequired()
            .HasMaxLength(512);
    }
}
`;
}

/**
 * @param {string} ns
 */
function renderRouter(ns) {
  return `namespace ${ns}.API.Routing;

public static partial class Router
{
    public static class Files
    {
        public const string Root = Rule + "/Files";
        public const string Upload = Root;
        public const string Download = Root + "/{id:guid}";
    }
}
`;
}

/**
 * @param {string} ns
 */
function renderFilesController(ns) {
  return `using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ${ns}.API.Routing;
using ${ns}.Application.Features.Files.Upload;

namespace ${ns}.API.Controllers;

public sealed class FilesController : ApiControllerBase
{
    private readonly ISender _sender;

    public FilesController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost(Router.Files.Upload)]
    [RequestSizeLimit(${DEFAULT_MAX_UPLOAD_BYTES})]
    public async Task<IActionResult> Upload(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest("A non-empty file is required.");
        }

        await using var stream = file.OpenReadStream();
        var command = new UploadFileCommand(
            stream,
            file.FileName,
            file.ContentType,
            file.Length);

        var result = await _sender.Send(command, cancellationToken);
        return ToActionResult(result);
    }
}
`;
}
