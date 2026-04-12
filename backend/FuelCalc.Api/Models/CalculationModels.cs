namespace FuelCalc.Api.Models;

using FuelCalc.Api.Data.Entities;

public record PriceSourcesResult(
    Dictionary<string, decimal>  PttPrices,
    ThaiOilData?                 ChnwtData,
    List<FuelPrice>              DbPrices,
    Dictionary<string, decimal?> TomorrowDiffs);

public record FuelCalculationResult(
    decimal Liters,
    decimal Cost,
    decimal FillPercentage);

public record TripCalculationResult(
    decimal DistanceKm,
    decimal EffectiveDistance,
    bool    IsRoundTrip,
    decimal KmPerLiter,
    decimal FuelPrice,
    decimal LitersNeeded,
    decimal TotalCost);
