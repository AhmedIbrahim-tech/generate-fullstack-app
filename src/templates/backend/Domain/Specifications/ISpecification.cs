namespace __PASCAL_NAME__.Domain.Specifications;

public interface ISpecification<in T>
{
    bool IsSatisfiedBy(T candidate);
}
