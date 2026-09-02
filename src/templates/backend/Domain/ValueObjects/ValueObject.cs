namespace __PASCAL_NAME__.Domain.ValueObjects;

public abstract class ValueObject : IEquatable<ValueObject>
{
    protected abstract IEnumerable<object?> GetAtomicValues();

    public override bool Equals(object? obj) => obj is ValueObject other && Equals(other);

    public bool Equals(ValueObject? other)
    {
        if (other is null || other.GetType() != GetType())
        {
            return false;
        }

        return GetAtomicValues().SequenceEqual(other.GetAtomicValues());
    }

    public override int GetHashCode()
    {
        return GetAtomicValues()
            .Aggregate(0, (hash, value) => HashCode.Combine(hash, value));
    }
}
