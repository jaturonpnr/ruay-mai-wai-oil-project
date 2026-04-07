namespace FuelCalc.Api.Data.Entities;

public class CarSpec
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Brand { get; set; } = string.Empty;
    public string ModelFamily { get; set; } = string.Empty;
    public decimal TankCapacity { get; set; }
    /// <summary>Comma-separated fuel types, e.g. "E20,Gasohol95"</summary>
    public string FuelTypesSupported { get; set; } = string.Empty;
}
