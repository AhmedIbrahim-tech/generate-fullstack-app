using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace __PASCAL_NAME__.Infrastructure.Seeders;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var logger = scope.ServiceProvider.GetService<ILoggerFactory>()?.CreateLogger("DatabaseSeeder");
        var seeders = scope.ServiceProvider.GetServices<IDataSeeder>();

        foreach (var seeder in seeders)
        {
            logger?.LogInformation("Running seeder {Seeder}.", seeder.GetType().Name);
            await seeder.SeedAsync(cancellationToken);
        }
    }
}
