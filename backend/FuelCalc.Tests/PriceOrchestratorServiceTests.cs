namespace FuelCalc.Tests;

using FuelCalc.Api.Data.Entities;
using FuelCalc.Api.Models;
using FuelCalc.Api.Services;
using NSubstitute;

public class PriceOrchestratorServiceTests
{
    private readonly IPttPriceService   _ptt      = Substitute.For<IPttPriceService>();
    private readonly IThaiOilApiService _thaiOil  = Substitute.For<IThaiOilApiService>();

    // ── ResolvePrice: PTT priority ────────────────────────────────────────────

    [Fact]
    public void ResolvePrice_PttStation_UsesPttXmlFirst()
    {
        var sut = BuildSut();
        var pttPrices = new Dictionary<string, decimal> { ["Gasohol95"] = 39.66m };

        var price = sut.ResolvePrice("ptt", "Gasohol95", pttPrices, chnwtData: null, dbPrices: [], "PTT");

        Assert.Equal(39.66m, price);
    }

    [Fact]
    public void ResolvePrice_PttStation_FallsBackToDbWhenXmlEmpty()
    {
        var sut = BuildSut();
        var dbPrices = new List<FuelPrice>
        {
            new() { StationBrand = "PTT", FuelType = "Gasohol95", CurrentPrice = 39.00m }
        };

        var price = sut.ResolvePrice("ptt", "Gasohol95", pttPrices: [], chnwtData: null, dbPrices, "PTT");

        Assert.Equal(39.00m, price);
    }

    // ── ResolvePrice: chnwt.dev fallback ─────────────────────────────────────

    [Fact]
    public void ResolvePrice_BangchakStation_UsesChnwtData()
    {
        var sut = BuildSut();
        var chnwtData = BuildChnwtData("bcp", "gasohol_95", "38.44");

        var price = sut.ResolvePrice("bcp", "Gasohol95", pttPrices: [], chnwtData, dbPrices: [], "Bangchak");

        Assert.Equal(38.44m, price);
    }

    [Fact]
    public void ResolvePrice_BangchakStation_FallsBackToDbWhenChnwtNull()
    {
        var sut = BuildSut();
        var dbPrices = new List<FuelPrice>
        {
            new() { StationBrand = "Bangchak", FuelType = "E20", CurrentPrice = 33.44m }
        };

        var price = sut.ResolvePrice("bcp", "E20", pttPrices: [], chnwtData: null, dbPrices, "Bangchak");

        Assert.Equal(33.44m, price);
    }

    [Fact]
    public void ResolvePrice_ReturnsZeroWhenNoSourceAvailable()
    {
        var sut = BuildSut();

        var price = sut.ResolvePrice("bcp", "Gasohol95", pttPrices: [], chnwtData: null, dbPrices: [], "Bangchak");

        Assert.Equal(0m, price);
    }

    // ── ResolvePrice: PTT does NOT use chnwt.dev (even if present) ───────────

    [Fact]
    public void ResolvePrice_PttStation_IgnoresChnwtWhenXmlHasData()
    {
        var sut = BuildSut();
        var pttPrices = new Dictionary<string, decimal> { ["Gasohol95"] = 39.66m };
        var chnwtData = BuildChnwtData("ptt", "gasohol_95", "99.99"); // wrong price in chnwt

        var price = sut.ResolvePrice("ptt", "Gasohol95", pttPrices, chnwtData, dbPrices: [], "PTT");

        Assert.Equal(39.66m, price); // ใช้ PTT XML ไม่ใช่ chnwt
    }

    // ── FetchAllSourcesAsync: tomorrow diffs ─────────────────────────────────

    [Fact]
    public async Task FetchAllSourcesAsync_ComputesTomorrowDiff_WhenBothAvailable()
    {
        _ptt.GetTodayPricesAsync().Returns(new Dictionary<string, decimal>
        {
            ["Gasohol95"] = 39.66m,
            ["E20"]       = 33.44m,
        });
        _ptt.GetTomorrowPricesAsync().Returns(new Dictionary<string, decimal>
        {
            ["Gasohol95"] = 40.16m,  // +0.50
            ["E20"]       = 33.44m,  // same
        });
        _thaiOil.GetLatestPricesAsync().Returns((ThaiOilData?)null);

        var sut = BuildSut(withDb: true);
        var result = await sut.FetchAllSourcesAsync();

        Assert.Equal(0.50m, result.TomorrowDiffs["Gasohol95"]);
        Assert.Equal(0.00m, result.TomorrowDiffs["E20"]);
    }

    [Fact]
    public async Task FetchAllSourcesAsync_TomorrowDiffIsNull_WhenTomorrowNotAnnounced()
    {
        _ptt.GetTodayPricesAsync().Returns(new Dictionary<string, decimal>
        {
            ["Gasohol95"] = 39.66m
        });
        _ptt.GetTomorrowPricesAsync().Returns(new Dictionary<string, decimal>()); // ไม่มีข้อมูล
        _thaiOil.GetLatestPricesAsync().Returns((ThaiOilData?)null);

        var sut = BuildSut(withDb: true);
        var result = await sut.FetchAllSourcesAsync();

        Assert.Null(result.TomorrowDiffs["Gasohol95"]);
    }

    // ── ComparisonStations ────────────────────────────────────────────────────

    [Fact]
    public void ComparisonStations_ContainsPttAndBangchak()
    {
        var sut = BuildSut();

        Assert.Contains("ptt",   sut.ComparisonStations.Keys);
        Assert.Contains("bcp",   sut.ComparisonStations.Keys);
        Assert.Equal("PTT",      sut.ComparisonStations["ptt"]);
        Assert.Equal("Bangchak", sut.ComparisonStations["bcp"]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private PriceOrchestratorService BuildSut(bool withDb = false)
    {
        var db = withDb
            ? DbContextHelper.CreateInMemory()
            : DbContextHelper.CreateInMemory();
        return new PriceOrchestratorService(_ptt, _thaiOil, db);
    }

    private static ThaiOilData BuildChnwtData(string stationKey, string fuelKey, string price) =>
        new(
            Note: "test",
            Date: "2026-04-12",
            Stations: new Dictionary<string, Dictionary<string, ThaiOilFuelItem>>
            {
                [stationKey] = new()
                {
                    [fuelKey] = new ThaiOilFuelItem("Test Fuel", price)
                }
            });
}
