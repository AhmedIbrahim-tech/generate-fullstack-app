namespace __PASCAL_NAME__.Infrastructure.Seeders;

public interface IDataSeeder
{
    Task SeedAsync(CancellationToken cancellationToken = default);
}
