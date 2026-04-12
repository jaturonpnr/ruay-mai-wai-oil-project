namespace FuelCalc.Api.Endpoints;

using FuelCalc.Api.Data;
using Microsoft.EntityFrameworkCore;

public static class CarsEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/cars", async (AppDbContext db) =>
        {
            var cars = await db.CarSpecs
                .OrderBy(c => c.Brand)
                .ThenBy(c => c.ModelFamily)
                .ToListAsync();

            return Results.Ok(new
            {
                brands = cars.Select(c => c.Brand).Distinct().ToList(),
                models = cars
                    .GroupBy(c => c.Brand)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(c => new
                        {
                            model        = c.ModelFamily,
                            tankCapacity = c.TankCapacity,
                            kmPerLiter   = c.FuelEfficiencyKmPerL,
                            fuelTypes    = c.FuelTypesSupported.Split(',', StringSplitOptions.TrimEntries)
                        }).ToList()
                    )
            });
        })
        .WithName("GetCars")
        .WithOpenApi();
    }
}
