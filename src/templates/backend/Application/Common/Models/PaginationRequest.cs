namespace __PASCAL_NAME__.Application.Common.Models;

public class PaginationRequest
{
    public const int DefaultPage = 1;
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    private int _page = DefaultPage;
    private int _pageSize = DefaultPageSize;

    public int Page
    {
        get => _page;
        set => _page = value < 1 ? DefaultPage : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value < 1
            ? DefaultPageSize
            : value > MaxPageSize
                ? MaxPageSize
                : value;
    }
}
