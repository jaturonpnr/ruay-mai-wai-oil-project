namespace FuelCalc.Api.Services;

using FuelCalc.Api.Data.Entities;
using FuelCalc.Api.Models;

public interface IPriceOrchestratorService
{
    /// <summary>Stations shown in the price comparison table (API key → display name).</summary>
    IReadOnlyDictionary<string, string> ComparisonStations { get; }

    /// <summary>Fetches all price sources in parallel and computes tomorrow diffs.</summary>
    Task<PriceSourcesResult> FetchAllSourcesAsync();

    /// <summary>Resolves the best available price: PTT XML → chnwt.dev → DB seed.</summary>
    decimal ResolvePrice(
        string                      apiStation,
        string                      fuelType,
        Dictionary<string, decimal> pttPrices,
        ThaiOilData?                chnwtData,
        List<FuelPrice>             dbPrices,
        string                      displayName);
}
