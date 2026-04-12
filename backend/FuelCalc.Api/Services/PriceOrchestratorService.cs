namespace FuelCalc.Api.Services;

using System.Globalization;
using FuelCalc.Api.Data;
using FuelCalc.Api.Data.Entities;
using FuelCalc.Api.Models;
using Microsoft.EntityFrameworkCore;

public class PriceOrchestratorService(
    IPttPriceService    pttService,
    IThaiOilApiService  thaiOilService,
    AppDbContext        db) : IPriceOrchestratorService
{
    private static readonly string[] FuelTypes = ["Gasohol95", "E20", "Diesel"];

    public IReadOnlyDictionary<string, string> ComparisonStations { get; } =
        new Dictionary<string, string>
        {
            ["ptt"]   = "PTT",
            ["bcp"]   = "Bangchak",
            ["shell"] = "Shell",
        };

    public async Task<PriceSourcesResult> FetchAllSourcesAsync()
    {
        var pttTask    = pttService.GetTodayPricesAsync();
        var pttTomTask = pttService.GetTomorrowPricesAsync();
        var chnwtTask  = thaiOilService.GetLatestPricesAsync();
        var dbTask     = db.FuelPrices.ToListAsync();

        await Task.WhenAll(pttTask, pttTomTask, chnwtTask, dbTask);

        // Compute per-fuel-type diff from PTT official data.
        // null = tomorrow's price not yet announced (do NOT fall back to seed).
        var diffs = new Dictionary<string, decimal?>();
        foreach (var ft in FuelTypes)
        {
            if (pttTomTask.Result.TryGetValue(ft, out var tom) &&
                pttTask.Result.TryGetValue(ft, out var tod)    &&
                tom > 0 && tod > 0)
                diffs[ft] = tom - tod;
            else
                diffs[ft] = null;
        }

        return new PriceSourcesResult(pttTask.Result, chnwtTask.Result, dbTask.Result, diffs);
    }

    public decimal ResolvePrice(
        string                      apiStation,
        string                      fuelType,
        Dictionary<string, decimal> pttPrices,
        ThaiOilData?                chnwtData,
        List<FuelPrice>             dbPrices,
        string                      displayName)
    {
        // 1. PTT official XML (highest priority for PTT station)
        if (apiStation == "ptt" && pttPrices.TryGetValue(fuelType, out var pttPrice))
            return pttPrice;

        // 2. chnwt.dev community data
        if (chnwtData?.Stations.TryGetValue(apiStation, out var stationData) == true)
        {
            var chnwtKey = ThaiOilApiService.ToChnwtKey(fuelType);
            if (stationData.TryGetValue(chnwtKey, out var item) &&
                decimal.TryParse(item.Price, NumberStyles.Any, CultureInfo.InvariantCulture, out var p) && p > 0)
                return p;
        }

        // 3. DB seed prices (last resort)
        return dbPrices
            .FirstOrDefault(x => x.StationBrand == displayName && x.FuelType == fuelType)
            ?.CurrentPrice ?? 0;
    }
}
