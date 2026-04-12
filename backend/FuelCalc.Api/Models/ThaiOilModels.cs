namespace FuelCalc.Api.Models;

public record ThaiOilRoot(string Status, ThaiOilData? Response);

public record ThaiOilData(
    string Note,
    string Date,
    Dictionary<string, Dictionary<string, ThaiOilFuelItem>> Stations);

public record ThaiOilFuelItem(string Name, string Price);
