using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using __PASCAL_NAME__.Application.Abstractions.Persistence;
using __PASCAL_NAME__.Infrastructure.Persistence;
__SQL_SERVER_USING__
namespace __PASCAL_NAME__.Infrastructure;

public static partial class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
__SQL_SERVER_REGISTRATION__

        services.AddScoped<IApplicationDbContext>(provider =>
            provider.GetRequiredService<ApplicationDbContext>());

        RegisterGeneratedInfrastructure(services, configuration);

        return services;
    }

    static partial void RegisterGeneratedInfrastructure(
        IServiceCollection services,
        IConfiguration configuration);
}
