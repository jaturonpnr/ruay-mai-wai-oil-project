namespace FuelCalc.Api.Services;

using System.Text.Json;
using FuelCalc.Api.Models;
using Microsoft.Extensions.Caching.Memory;

public class ThaiOilApiService(
    IHttpClientFactory httpFactory,
    IMemoryCache       cache) : IThaiOilApiService
{
    public async Task<ThaiOilData?> GetLatestPricesAsync()
    {
        const string CacheKey = "thai_oil_prices";
        if (cache.TryGetValue(CacheKey, out ThaiOilData? cached)) return cached;

        try
        {
            var client  = httpFactory.CreateClient("ThaiOilApi");
            var json    = await client.GetStringAsync("thai-oil-api/latest");
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var root    = JsonSerializer.Deserialize<ThaiOilRoot>(json, options);

            if (root?.Status == "success" && root.Response is not null)
            {
                cache.Set(CacheKey, root.Response, TimeSpan.FromMinutes(30));
                return root.Response;
            }
        }
        catch { /* graceful degradation — return null */ }

        return null;
    }

    // Converts our internal fuel type name → chnwt.dev API key
    public static string ToChnwtKey(string fuelType) => fuelType switch
    {
        "Gasohol95" => "gasohol_95",
        "E20"       => "gasohol_e20",
        "Diesel"    => "premium_diesel",
        _           => fuelType.ToLower()
    };
}
