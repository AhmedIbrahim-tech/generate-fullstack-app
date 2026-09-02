using Microsoft.AspNetCore.Mvc;
using __PASCAL_NAME__.Application.Common.Results;

namespace __PASCAL_NAME__.API.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected IActionResult ToActionResult(Result result)
    {
        if (result.IsSuccess)
        {
            return NoContent();
        }

        return ToProblemResult(result.Error);
    }

    protected IActionResult ToActionResult<T>(Result<T> result)
    {
        if (result.IsSuccess)
        {
            return Ok(result.Value);
        }

        return ToProblemResult(result.Error);
    }

    protected IActionResult ToCreatedResult<T>(Result<T> result, string? location = null)
    {
        if (result.IsSuccess)
        {
            return location is null
                ? StatusCode(StatusCodes.Status201Created, result.Value)
                : Created(location, result.Value);
        }

        return ToProblemResult(result.Error);
    }

    private ObjectResult ToProblemResult(Error error)
    {
        var statusCode = error.Type switch
        {
            ErrorType.Validation => StatusCodes.Status400BadRequest,
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            ErrorType.Conflict => StatusCodes.Status409Conflict,
            ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
            ErrorType.Forbidden => StatusCodes.Status403Forbidden,
            _ => StatusCodes.Status500InternalServerError,
        };

        return Problem(
            detail: error.Message,
            statusCode: statusCode,
            title: error.Code);
    }
}
