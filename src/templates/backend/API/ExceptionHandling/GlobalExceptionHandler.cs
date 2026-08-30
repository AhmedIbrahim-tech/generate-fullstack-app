using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using __PASCAL_NAME__.Application.Common.Exceptions;

namespace __PASCAL_NAME__.API.ExceptionHandling;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is ApplicationValidationException validationException)
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsJsonAsync(
                new
                {
                    title = "Validation failed",
                    status = StatusCodes.Status400BadRequest,
                    errors = validationException.Errors
                },
                cancellationToken);
            return true;
        }

        _logger.LogError(exception, "Unhandled exception");

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await httpContext.Response.WriteAsJsonAsync(
            new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "An unexpected error occurred",
                Detail = exception.Message
            },
            cancellationToken);

        return true;
    }
}
