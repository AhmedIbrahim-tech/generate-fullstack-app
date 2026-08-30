namespace __PASCAL_NAME__.Application.Common.Results;

public class Result<TValue> : Result
{
    private readonly TValue? _value;

    private Result(TValue? value, bool isSuccess, Error error)
        : base(isSuccess, error)
    {
        _value = value;
    }

    public TValue Value =>
        IsSuccess
            ? _value!
            : throw new InvalidOperationException("Cannot access Value on a failed result.");

    internal static Result<TValue> CreateSuccess(TValue value) => new(value, true, Error.None);

    internal static Result<TValue> CreateFailure(Error error) => new(default, false, error);
}
