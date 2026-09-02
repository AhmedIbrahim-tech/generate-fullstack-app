namespace __PASCAL_NAME__.Domain.DomainEvents;

public interface IDomainEvent
{
    DateTime OccurredOnUtc { get; }
}
