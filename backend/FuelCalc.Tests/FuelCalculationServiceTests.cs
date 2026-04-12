namespace FuelCalc.Tests;

using FuelCalc.Api.Services;

public class FuelCalculationServiceTests
{
    private readonly FuelCalculationService _sut = new();

    // ── CalculateFullTank ─────────────────────────────────────────────────────

    [Fact]
    public void CalculateFullTank_ReturnsCorrectCost()
    {
        var result = _sut.CalculateFullTank(pricePerLiter: 33.44m, tankCapacity: 42m);

        Assert.Equal(42m, result.Liters);
        Assert.Equal(1404.48m, result.Cost);
        Assert.Equal(100m, result.FillPercentage);
    }

    [Fact]
    public void CalculateFullTank_CostIsRoundedToTwoDecimals()
    {
        // 33.333... * 42 = 1399.986... → rounded to 1399.99
        var result = _sut.CalculateFullTank(pricePerLiter: 33.333m, tankCapacity: 42m);

        Assert.Equal(2, BitConverter.GetBytes(decimal.GetBits(result.Cost)[3])[2]); // scale = 2
        Assert.Equal(Math.Round(33.333m * 42m, 2), result.Cost);
    }

    // ── CalculateBudget ───────────────────────────────────────────────────────

    [Fact]
    public void CalculateBudget_ReturnsCorrectLiters()
    {
        // 500 ÷ 33.44 = 14.95 liters
        var result = _sut.CalculateBudget(budget: 500m, pricePerLiter: 33.44m, tankCapacity: 42m);

        Assert.Equal(500m, result.Cost);
        Assert.Equal(Math.Round(500m / 33.44m, 2), result.Liters);
    }

    [Fact]
    public void CalculateBudget_FillPercentageCappedAt100()
    {
        // Budget way bigger than full tank cost → fill% capped at 100
        var result = _sut.CalculateBudget(budget: 99999m, pricePerLiter: 33.44m, tankCapacity: 42m);

        Assert.Equal(100m, result.FillPercentage);
    }

    [Fact]
    public void CalculateBudget_FillPercentageCalculatedCorrectly()
    {
        // 500 ÷ 33.44 = 14.95 liters, 14.95 / 42 * 100 = 35.6%
        var result = _sut.CalculateBudget(budget: 500m, pricePerLiter: 33.44m, tankCapacity: 42m);

        var expectedLiters = Math.Round(500m / 33.44m, 2);
        var expectedPct    = Math.Min(100, Math.Round((expectedLiters / 42m) * 100, 1));
        Assert.Equal(expectedPct, result.FillPercentage);
    }

    // ── CalculateTrip ─────────────────────────────────────────────────────────

    [Fact]
    public void CalculateTrip_OneWay_ReturnsCorrectResult()
    {
        // 700 km ÷ 16.5 km/L × 33.44 = 1419.48
        var result = _sut.CalculateTrip(
            distanceKm: 700m, kmPerLiter: 16.5m, fuelPrice: 33.44m, isRoundTrip: false);

        Assert.Equal(700m,  result.DistanceKm);
        Assert.Equal(700m,  result.EffectiveDistance);
        Assert.False(result.IsRoundTrip);
        Assert.Equal(Math.Round(700m / 16.5m, 2), result.LitersNeeded);
        Assert.Equal(Math.Round(result.LitersNeeded * 33.44m, 2), result.TotalCost);
    }

    [Fact]
    public void CalculateTrip_RoundTrip_DoublesDistance()
    {
        var result = _sut.CalculateTrip(
            distanceKm: 700m, kmPerLiter: 16.5m, fuelPrice: 33.44m, isRoundTrip: true);

        Assert.Equal(1400m, result.EffectiveDistance);
        Assert.True(result.IsRoundTrip);
        Assert.Equal(Math.Round(1400m / 16.5m, 2), result.LitersNeeded);
    }

    [Fact]
    public void CalculateTrip_ShortTrip_ReturnsSmallCost()
    {
        // กรุงเทพ → พัทยา 140 km, 14 km/L, 33.44 บาท
        var result = _sut.CalculateTrip(
            distanceKm: 140m, kmPerLiter: 14m, fuelPrice: 33.44m, isRoundTrip: false);

        Assert.Equal(Math.Round(140m / 14m, 2), result.LitersNeeded);   // 10 liters
        Assert.Equal(Math.Round(10m * 33.44m, 2), result.TotalCost);    // 334.40
    }

    // ── CalculateSavings ──────────────────────────────────────────────────────

    [Fact]
    public void CalculateSavings_ReturnsSavingsWhenDiffAnnounced()
    {
        // ราคาขึ้น 0.50 บาท/ลิตร เติม 42 ลิตร = ประหยัด 21 บาท
        var savings = _sut.CalculateSavings(liters: 42m, tomorrowDiff: 0.50m);

        Assert.Equal(21.00m, savings);
    }

    [Fact]
    public void CalculateSavings_ReturnsNullWhenNotAnnounced()
    {
        var savings = _sut.CalculateSavings(liters: 42m, tomorrowDiff: null);

        Assert.Null(savings);
    }

    [Fact]
    public void CalculateSavings_NegativeDiff_ReturnsNegative()
    {
        // ราคาลง 1 บาท/ลิตร = "savings" เป็นลบ (จ่ายถูกกว่าพรุ่งนี้)
        var savings = _sut.CalculateSavings(liters: 42m, tomorrowDiff: -1.00m);

        Assert.Equal(-42.00m, savings);
    }
}
