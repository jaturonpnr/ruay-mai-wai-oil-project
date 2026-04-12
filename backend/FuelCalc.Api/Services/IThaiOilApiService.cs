namespace FuelCalc.Api.Services;

using FuelCalc.Api.Models;

public interface IThaiOilApiService
{
    Task<ThaiOilData?> GetLatestPricesAsync();
}
