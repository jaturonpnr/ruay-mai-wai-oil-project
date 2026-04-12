namespace FuelCalc.Api.Endpoints;

using FuelCalc.Api.Services;

public static class HistoricalPriceEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/historical-price", async (
            IPttPriceService pttService,
            string date) =>
        {
            if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", out var parsedDate))
                return Results.BadRequest(new { error = "รูปแบบวันที่ไม่ถูกต้อง ใช้ yyyy-MM-dd" });

            if (parsedDate > DateOnly.FromDateTime(DateTime.UtcNow))
                return Results.BadRequest(new { error = "ไม่สามารถดูราคาอนาคตได้" });

            var prices = await pttService.GetHistoricalPricesAsync(parsedDate);

            return Results.Ok(new { date, prices });
        })
        .WithName("GetHistoricalPrice")
        .WithOpenApi();
    }
}
