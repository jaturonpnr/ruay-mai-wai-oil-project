namespace FuelCalc.Api.Services;

using FuelCalc.Api.Models;

public class FuelCalculationService : IFuelCalculationService
{
    public FuelCalculationResult CalculateFullTank(decimal pricePerLiter, decimal tankCapacity)
    {
        var liters = tankCapacity;
        var cost   = Math.Round(liters * pricePerLiter, 2);
        return new FuelCalculationResult(liters, cost, FillPercentage: 100);
    }

    public FuelCalculationResult CalculateBudget(decimal budget, decimal pricePerLiter, decimal tankCapacity)
    {
        var liters         = Math.Round(budget / pricePerLiter, 2);
        var fillPercentage = Math.Min(100, Math.Round((liters / tankCapacity) * 100, 1));
        return new FuelCalculationResult(liters, Cost: budget, fillPercentage);
    }

    public TripCalculationResult CalculateTrip(
        decimal distanceKm,
        decimal kmPerLiter,
        decimal fuelPrice,
        bool    isRoundTrip)
    {
        var effectiveDistance = isRoundTrip ? distanceKm * 2 : distanceKm;
        var litersNeeded      = Math.Round(effectiveDistance / kmPerLiter, 2);
        var totalCost         = Math.Round(litersNeeded * fuelPrice, 2);
        return new TripCalculationResult(distanceKm, effectiveDistance, isRoundTrip, kmPerLiter, fuelPrice, litersNeeded, totalCost);
    }

    public decimal? CalculateSavings(decimal liters, decimal? tomorrowDiff) =>
        tomorrowDiff.HasValue ? Math.Round(liters * tomorrowDiff.Value, 2) : null;
}
