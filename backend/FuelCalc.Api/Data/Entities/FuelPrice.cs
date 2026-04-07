namespace FuelCalc.Api.Data.Entities;

public class FuelPrice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string StationBrand { get; set; } = string.Empty;
    public string FuelType { get; set; } = string.Empty;
    public decimal CurrentPrice { get; set; }
    public decimal TomorrowPriceDifference { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}
