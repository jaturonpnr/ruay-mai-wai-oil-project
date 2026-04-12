namespace FuelCalc.Api.Services;

public interface IPttPriceService
{
    Task<Dictionary<string, decimal>> GetTodayPricesAsync();
    Task<Dictionary<string, decimal>> GetTomorrowPricesAsync();
    Task<Dictionary<string, decimal>> GetHistoricalPricesAsync(DateOnly date);
}
