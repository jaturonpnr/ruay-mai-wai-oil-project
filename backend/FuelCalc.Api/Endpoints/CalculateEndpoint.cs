namespace FuelCalc.Api.Endpoints;

using FuelCalc.Api.Data;
using FuelCalc.Api.Services;
using Microsoft.EntityFrameworkCore;

public static class CalculateEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/calculate", async (
            AppDbContext              db,
            IPriceOrchestratorService orchestrator,
            IFuelCalculationService   calculator,
            string  brand,
            string  model,
            string  fuelType,
            string  mode,
            decimal? amount,
            decimal? simulatedAdjustment) =>
        {
            var car = await db.CarSpecs
                .FirstOrDefaultAsync(c => c.Brand == brand && c.ModelFamily == model);

            if (car is null)
                return Results.NotFound(new { error = "ไม่พบรถยนต์ที่ระบุ" });

            var sources = await orchestrator.FetchAllSourcesAsync();

            // Find cheapest station for this fuel type
            decimal cheapestPrice   = 0;
            string  cheapestStation = string.Empty;

            foreach (var (apiStation, displayName) in orchestrator.ComparisonStations)
            {
                var price = orchestrator.ResolvePrice(
                    apiStation, fuelType,
                    sources.PttPrices, sources.ChnwtData, sources.DbPrices,
                    displayName);

                if (price > 0 && (cheapestPrice == 0 || price < cheapestPrice))
                {
                    cheapestPrice   = price;
                    cheapestStation = displayName;
                }
            }

            if (cheapestPrice == 0)
                return Results.NotFound(new { error = "ไม่พบราคาน้ำมันสำหรับประเภทที่ระบุ" });

            var calc = mode == "fullTank"
                ? calculator.CalculateFullTank(cheapestPrice, car.TankCapacity)
                : calculator.CalculateBudget(amount ?? 0, cheapestPrice, car.TankCapacity);

            var tomorrowDiff = sources.TomorrowDiffs.GetValueOrDefault(fuelType);
            var savings      = calculator.CalculateSavings(calc.Liters, tomorrowDiff);

            // Simulated price scenario
            var simAdj           = simulatedAdjustment ?? 0;
            var simPricePerLiter = cheapestPrice + simAdj;
            var simCost          = Math.Round(calc.Liters * simPricePerLiter, 2);
            var simExtraCost     = Math.Round(calc.Liters * simAdj, 2);

            return Results.Ok(new
            {
                car = new { car.Brand, car.ModelFamily, car.TankCapacity },
                fuelType,
                mode,
                cheapestStation,
                pricePerLiter  = cheapestPrice,
                liters         = calc.Liters,
                cost           = calc.Cost,
                fillPercentage = calc.FillPercentage,
                savings,
                savingsMessage = savings > 0
                    ? $"ประหยัดได้ ฿{savings.Value:0.00} ถ้าเติมวันนี้แทนพรุ่งนี้"
                    : string.Empty,
                simulation = new
                {
                    adjustment    = simAdj,
                    pricePerLiter = simPricePerLiter,
                    cost          = simCost,
                    extraCost     = simExtraCost,
                    message       = simAdj switch
                    {
                        > 0 => $"ถ้าราคาขึ้น +{simAdj:0.00} บาท ต้องจ่ายเพิ่ม ฿{simExtraCost:0.00}",
                        < 0 => $"ถ้าราคาลง {simAdj:0.00} บาท ประหยัดได้ ฿{Math.Abs(simExtraCost):0.00}",
                        _   => string.Empty
                    }
                }
            });
        })
        .WithName("Calculate")
        .WithOpenApi();
    }
}
