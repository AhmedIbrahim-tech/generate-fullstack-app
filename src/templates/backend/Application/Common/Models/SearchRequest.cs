namespace __PASCAL_NAME__.Application.Common.Models;

public class SearchRequest : PaginationRequest
{
    public string? SearchTerm { get; set; }

    public string? SortBy { get; set; }

    public string? SortDirection { get; set; }
}
