namespace FuelCalc.Api.Services;

using FuelCalc.Api.Models;

public interface IFuelCalculationService
{
    FuelCalculationResult CalculateFullTank(decimal pricePerLiter, decimal tankCapacity);

    FuelCalculationResult CalculateBudget(decimal budget, decimal pricePerLiter, decimal tankCapacity);

    TripCalculationResult CalculateTrip(
        decimal distanceKm,
        decimal kmPerLiter,
        decimal fuelPrice,
        bool    isRoundTrip);

    decimal? CalculateSavings(decimal liters, decimal? tomorrowDiff);
}
