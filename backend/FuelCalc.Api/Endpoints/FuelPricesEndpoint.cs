namespace FuelCalc.Api.Endpoints;

using FuelCalc.Api.Services;

public static class FuelPricesEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/fuel-prices", async (IPriceOrchestratorService orchestrator) =>
        {
            var sources = await orchestrator.FetchAllSourcesAsync();

            var confirmedDiffs = sources.TomorrowDiffs.Values
                .Where(v => v.HasValue).Select(v => v!.Value).ToList();
            var maxDiff = confirmedDiffs.Count > 0 ? confirmedDiffs.Max() : 0;

            var fuelTypes = new[] { "Gasohol95", "E20", "Diesel" };
            var prices    = new List<object>();

            foreach (var (apiStation, displayName) in orchestrator.ComparisonStations)
            {
                foreach (var fuelType in fuelTypes)
                {
                    var currentPrice = orchestrator.ResolvePrice(
                        apiStation, fuelType,
                        sources.PttPrices, sources.ChnwtData, sources.DbPrices,
                        displayName);

                    var tomorrowDiff = sources.TomorrowDiffs.GetValueOrDefault(fuelType);

                    prices.Add(new
                    {
                        StationBrand            = displayName,
                        FuelType                = fuelType,
                        CurrentPrice            = currentPrice,
                        TomorrowPriceDifference = tomorrowDiff,
                        tomorrowPrice           = tomorrowDiff.HasValue
                                                    ? currentPrice + tomorrowDiff.Value
                                                    : (decimal?)null,
                    });
                }
            }

            return Results.Ok(new
            {
                goldenHourAlert = new
                {
                    isActive        = maxDiff > 0,
                    priceDifference = maxDiff,
                    message         = maxDiff > 0
                        ? $"ราคาน้ำมันพรุ่งนี้จะขึ้น {maxDiff:0.00} บาท/ลิตร เติมวันนี้ประหยัดกว่า!"
                        : string.Empty
                },
                priceDate = sources.ChnwtData?.Date,
                isLive    = sources.ChnwtData is not null || sources.PttPrices.Count > 0,
                pttSource = sources.PttPrices.Count > 0 ? "official" : "community",
                prices
            });
        })
        .WithName("GetFuelPrices")
        .WithOpenApi();
    }
}
