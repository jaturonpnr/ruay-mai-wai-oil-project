namespace FuelCalc.Api.Endpoints;

using FuelCalc.Api.Data;
using FuelCalc.Api.Services;
using Microsoft.EntityFrameworkCore;

public static class CompareHistoryEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/compare-history", async (
            AppDbContext              db,
            IPriceOrchestratorService orchestrator,
            IPttPriceService          pttService,
            string   brand,
            string   model,
            string   fuelType,
            string   historicalDate,
            decimal? tankCapacity) =>
        {
            if (!DateOnly.TryParseExact(historicalDate, "yyyy-MM-dd", out var parsedDate))
                return Results.BadRequest(new { error = "รูปแบบวันที่ไม่ถูกต้อง ใช้ yyyy-MM-dd" });

            if (parsedDate > DateOnly.FromDateTime(DateTime.UtcNow))
                return Results.BadRequest(new { error = "ไม่สามารถเปรียบเทียบกับวันในอนาคตได้" });

            // Resolve tank capacity: DB first, fallback to query param
            var car = await db.CarSpecs
                .FirstOrDefaultAsync(c => c.Brand == brand && c.ModelFamily == model);

            var resolvedCapacity = (car?.TankCapacity ?? 0) > 0
                ? car!.TankCapacity
                : (tankCapacity ?? 0);

            if (resolvedCapacity <= 0)
                return Results.BadRequest(new { error = "ไม่พบขนาดถังน้ำมัน กรุณาระบุขนาดถังก่อน" });

            // Fetch current cheapest price
            var sources      = await orchestrator.FetchAllSourcesAsync();
            decimal currentPrice = 0;

            foreach (var (apiStation, displayName) in orchestrator.ComparisonStations)
            {
                var p = orchestrator.ResolvePrice(
                    apiStation, fuelType,
                    sources.PttPrices, sources.ChnwtData, sources.DbPrices,
                    displayName);
                if (p > 0 && (currentPrice == 0 || p < currentPrice))
                    currentPrice = p;
            }

            if (currentPrice == 0)
                return Results.NotFound(new { error = "ไม่พบราคาน้ำมันปัจจุบันสำหรับประเภทที่ระบุ" });

            // Fetch historical price
            var historicalPrices = await pttService.GetHistoricalPricesAsync(parsedDate);

            if (!historicalPrices.TryGetValue(fuelType, out var historicalPrice))
                return Results.NotFound(new
                {
                    error = $"ไม่พบข้อมูลราคา {fuelType} เมื่อวันที่ {historicalDate} (อาจเป็นวันหยุด หรือ PTT ไม่มีข้อมูล)"
                });

            var diffPerLiter         = currentPrice - historicalPrice;
            var extraCostForFullTank = Math.Round(diffPerLiter * resolvedCapacity, 2);

            return Results.Ok(new
            {
                fuelType,
                historicalDate,
                historicalPricePerLiter = historicalPrice,
                currentPricePerLiter    = currentPrice,
                diffPerLiter            = Math.Round(diffPerLiter, 2),
                tankCapacity            = resolvedCapacity,
                extraCostForFullTank,
            });
        })
        .WithName("CompareHistory")
        .WithOpenApi();
    }
}
