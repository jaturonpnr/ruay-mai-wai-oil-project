namespace FuelCalc.Api.Endpoints;

using FuelCalc.Api.Services;

public static class CalculateTripEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/calculate-trip", (
            IFuelCalculationService calculator,
            decimal distanceKm,
            decimal kmPerLiter,
            decimal fuelPrice,
            bool    isRoundTrip = false) =>
        {
            if (distanceKm <= 0) return Results.BadRequest(new { error = "distanceKm ต้องมากกว่า 0" });
            if (kmPerLiter <= 0) return Results.BadRequest(new { error = "kmPerLiter ต้องมากกว่า 0" });
            if (fuelPrice  <= 0) return Results.BadRequest(new { error = "fuelPrice ต้องมากกว่า 0" });

            var result = calculator.CalculateTrip(distanceKm, kmPerLiter, fuelPrice, isRoundTrip);

            return Results.Ok(new
            {
                result.DistanceKm,
                result.EffectiveDistance,
                result.IsRoundTrip,
                result.KmPerLiter,
                result.FuelPrice,
                result.LitersNeeded,
                result.TotalCost
            });
        })
        .WithName("CalculateTrip")
        .WithOpenApi();
    }
}
