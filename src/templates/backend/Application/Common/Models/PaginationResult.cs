namespace __PASCAL_NAME__.Application.Common.Models;

public sealed class PaginationResult<T>
{
    public required IReadOnlyList<T> Data { get; init; }

    public required int CurrentPage { get; init; }

    public required int TotalPages { get; init; }

    public required int TotalCount { get; init; }

    public required int PageSize { get; init; }

    public object? Meta { get; init; }

    public object? FilterData { get; init; }

    public bool HasPreviousPage => CurrentPage > 1;

    public bool HasNextPage => CurrentPage < TotalPages;

    public static PaginationResult<T> Create(
        IReadOnlyList<T> data,
        int count,
        int page,
        int pageSize,
        object? meta = null,
        object? filterData = null)
    {
        var totalPages = pageSize <= 0 ? 0 : (int)Math.Ceiling(count / (double)pageSize);

        return new PaginationResult<T>
        {
            Data = data,
            CurrentPage = page,
            TotalPages = totalPages,
            TotalCount = count,
            PageSize = pageSize,
            Meta = meta,
            FilterData = filterData,
        };
    }
}
