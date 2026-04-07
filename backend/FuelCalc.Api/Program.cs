using System.Globalization;
using System.Text.Json;
using System.Xml.Linq;
using FuelCalc.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

var builder = WebApplication.CreateBuilder(args);

// ── Services ──────────────────────────────────────────────────────────────────

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var allowedOrigins = builder.Configuration
    .GetSection("AllowedOrigins")
    .Get<string[]>()
    ?? ["http://localhost:5173", "http://localhost:3000"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// chnwt.dev community API — provides Bangchak & Shell prices
builder.Services.AddHttpClient("ThaiOilApi", client =>
{
    client.BaseAddress = new Uri("https://api.chnwt.dev/");
    client.Timeout = TimeSpan.FromSeconds(10);
});

// PTT official XML API — authoritative source for PTT prices
builder.Services.AddHttpClient("PttApi", client =>
{
    client.BaseAddress = new Uri("https://orapiweb.pttor.com/");
    client.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddMemoryCache();

var app = builder.Build();

// ── Middleware ─────────────────────────────────────────────────────────────────

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("FrontendPolicy");

// ── Seed on startup ───────────────────────────────────────────────────────────

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await SeedData.InitializeAsync(db);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Our fuel type name → chnwt.dev API key
static string ToChnwtKey(string fuelType) => fuelType switch
{
    "Gasohol95" => "gasohol_95",
    "E20"       => "gasohol_e20",
    "Diesel"    => "premium_diesel",
    _           => fuelType.ToLower()
};

// PTT Thai product name → our FuelType label.
// Matches the most specific pattern first to avoid false positives.
static string? MapPttProduct(string name)
{
    if (name.Contains("E20") || name.Contains("E 20"))
        return "E20";

    if (name.Contains("แก๊สโซฮอล์ 95")
        && !name.Contains("ซูเปอร์")
        && !name.Contains("พรีเมียม"))
        return "Gasohol95";

    // "ดีเซล" without qualifier = standard diesel (B7)
    if (name.Contains("ดีเซล")
        && !name.Contains("พรีเมียม")
        && !name.Contains("B20")
        && !name.Contains("บี 20"))
        return "Diesel";

    return null;
}

// ── PTT SOAP helpers ──────────────────────────────────────────────────────────

// Builds a SOAP 1.1 envelope for PTT ASMX.
// The method element carries xmlns="http://www.pttor.com"; parameters have no prefix.
static StringContent BuildPttSoapBody(string method, string innerXml)
{
    var envelope = $"""
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
          <soapenv:Header/>
          <soapenv:Body>
            <{method} xmlns="http://www.pttor.com">
              {innerXml}
            </{method}>
          </soapenv:Body>
        </soapenv:Envelope>
        """;
    var content = new StringContent(envelope, System.Text.Encoding.UTF8, "text/xml");
    content.Headers.Add("SOAPAction", $"\"http://www.pttor.com/{method}\"");
    return content;
}

// Parses the SOAP response and returns fuelType → price map.
static Dictionary<string, decimal> ParsePttSoapResponse(string xml)
{
    XNamespace ns  = "http://www.pttor.com";
    var doc        = XDocument.Parse(xml);
    var priceMap   = new Dictionary<string, decimal>();

    foreach (var row in doc.Descendants().Where(e =>
        e.Element(ns + "PRODUCT") is not null &&
        e.Element(ns + "PRICE")   is not null))
    {
        var product  = row.Element(ns + "PRODUCT")!.Value.Trim();
        var priceStr = row.Element(ns + "PRICE")!.Value.Trim();
        var fuelType = MapPttProduct(product);

        if (fuelType is not null &&
            decimal.TryParse(priceStr,
                NumberStyles.Any, CultureInfo.InvariantCulture, out var price) &&
            price > 0)
        {
            priceMap.TryAdd(fuelType, price); // first match wins per fuel type
        }
    }

    return priceMap;
}

// ── Fetch: PTT official XML API (today) ──────────────────────────────────────
// Returns fuelType → price map. Empty dict on failure (graceful degradation).

static async Task<Dictionary<string, decimal>> FetchPttPrices(
    IHttpClientFactory factory, IMemoryCache cache, ILogger logger)
{
    const string CacheKey = "ptt_xml_prices";
    if (cache.TryGetValue(CacheKey, out Dictionary<string, decimal>? cached))
    {
        logger.LogInformation("[PTT Today] cache hit → {Count} fuel types", cached!.Count);
        return cached!;
    }

    try
    {
        var client  = factory.CreateClient("PttApi");
        var body    = BuildPttSoapBody("CurrentOilPrice", "<Language>thai</Language>");

        logger.LogInformation("[PTT Today] POST oilservice/OilPrice.asmx  SOAPAction=CurrentOilPrice");
        var resp    = await client.PostAsync("oilservice/OilPrice.asmx", body);
        var xml     = await resp.Content.ReadAsStringAsync();

        logger.LogInformation("[PTT Today] HTTP {Status}  body ({Len} chars)", (int)resp.StatusCode, xml.Length);

        if (xml.Contains("<html", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning("[PTT Today] response is HTML (endpoint may be blocked or down) – skipping");
            return [];
        }

        var priceMap = ParsePttSoapResponse(xml);
        logger.LogInformation("[PTT Today] parsed {Count} prices: {Map}",
            priceMap.Count,
            string.Join(", ", priceMap.Select(kv => $"{kv.Key}={kv.Value}")));

        if (priceMap.Count > 0)
            cache.Set(CacheKey, priceMap, TimeSpan.FromMinutes(30));

        return priceMap;
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "[PTT Today] request failed");
        return [];
    }
}

// ── Fetch: PTT GetOilPrice for tomorrow ──────────────────────────────────────
// Returns fuelType → price map for tomorrow. Empty dict if not yet announced.

static async Task<Dictionary<string, decimal>> FetchPttTomorrowPrices(
    IHttpClientFactory factory, IMemoryCache cache, ILogger logger)
{
    const string CacheKey = "ptt_xml_tomorrow_prices";
    if (cache.TryGetValue(CacheKey, out Dictionary<string, decimal>? cached))
    {
        logger.LogInformation("[PTT Tomorrow] cache hit → {Count} fuel types", cached!.Count);
        return cached!;
    }

    try
    {
        var client   = factory.CreateClient("PttApi");
        var tomorrow = DateTime.UtcNow.AddDays(1);

        // PTT may use Buddhist Era (Gregorian + 543). Try both.
        Dictionary<string, decimal> priceMap = [];
        foreach (var year in new[] { tomorrow.Year + 543, tomorrow.Year })
        {
            var innerXml = $"""
                <Language>thai</Language>
                <DD>{tomorrow.Day}</DD>
                <MM>{tomorrow.Month}</MM>
                <YYYY>{year}</YYYY>
                """;
            var body = BuildPttSoapBody("GetOilPrice", innerXml);

            logger.LogInformation("[PTT Tomorrow] POST GetOilPrice  DD={Day} MM={Month} YYYY={Year}",
                tomorrow.Day, tomorrow.Month, year);
            var resp = await client.PostAsync("oilservice/OilPrice.asmx", body);
            var xml  = await resp.Content.ReadAsStringAsync();

            logger.LogInformation("[PTT Tomorrow] HTTP {Status}  body ({Len} chars)", (int)resp.StatusCode, xml.Length);

            if (xml.Contains("<html", StringComparison.OrdinalIgnoreCase))
            {
                logger.LogWarning("[PTT Tomorrow] response is HTML (endpoint may be blocked or down) – skipping");
                break;
            }

            priceMap = ParsePttSoapResponse(xml);
            logger.LogInformation("[PTT Tomorrow] parsed {Count} prices: {Map}",
                priceMap.Count,
                string.Join(", ", priceMap.Select(kv => $"{kv.Key}={kv.Value}")));

            if (priceMap.Count > 0) break;
        }

        if (priceMap.Count > 0)
            cache.Set(CacheKey, priceMap, TimeSpan.FromMinutes(30));

        return priceMap;
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "[PTT Tomorrow] request failed");
        return [];
    }
}

// ── Fetch: chnwt.dev community API ───────────────────────────────────────────
// Provides prices for all stations. Null on failure.

static async Task<ThaiOilData?> FetchChnwtPrices(
    IHttpClientFactory factory, IMemoryCache cache)
{
    const string CacheKey = "thai_oil_prices";
    if (cache.TryGetValue(CacheKey, out ThaiOilData? cached)) return cached;

    try
    {
        var client  = factory.CreateClient("ThaiOilApi");
        var json    = await client.GetStringAsync("thai-oil-api/latest");
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var root    = JsonSerializer.Deserialize<ThaiOilRoot>(json, options);

        if (root?.Status == "success" && root.Response is not null)
        {
            cache.Set(CacheKey, root.Response, TimeSpan.FromMinutes(30));
            return root.Response;
        }
    }
    catch { /* fall through → null */ }

    return null;
}

// ── Price resolution: PTT XML → chnwt.dev → DB ───────────────────────────────
// Returns the best available price for a given station+fuelType combination.

static decimal ResolvePrice(
    string apiStation,
    string fuelType,
    Dictionary<string, decimal> pttPrices,
    ThaiOilData? chnwtData,
    List<FuelCalc.Api.Data.Entities.FuelPrice> dbPrices,
    string displayName)
{
    // 1. For PTT: try official XML first
    if (apiStation == "ptt" && pttPrices.TryGetValue(fuelType, out var pttPrice))
        return pttPrice;

    // 2. chnwt.dev (community scraped)
    if (chnwtData?.Stations.TryGetValue(apiStation, out var stationData) == true)
    {
        var chnwtKey = ToChnwtKey(fuelType);
        if (stationData.TryGetValue(chnwtKey, out var item) &&
            decimal.TryParse(item.Price,
                NumberStyles.Any, CultureInfo.InvariantCulture, out var p) && p > 0)
            return p;
    }

    // 3. DB seed prices (last resort)
    return dbPrices
        .FirstOrDefault(x => x.StationBrand == displayName && x.FuelType == fuelType)
        ?.CurrentPrice ?? 0;
}

// Stations shown in the price comparison table (API key → display name)
var comparisonStations = new Dictionary<string, string>
{
    ["ptt"]   = "PTT",
    ["bcp"]   = "Bangchak",
    ["shell"] = "Shell",
};

// ── GET /api/cars ─────────────────────────────────────────────────────────────

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
                    fuelTypes    = c.FuelTypesSupported.Split(',', StringSplitOptions.TrimEntries)
                }).ToList()
            )
    });
})
.WithName("GetCars")
.WithOpenApi();

// ── GET /api/fuel-prices ──────────────────────────────────────────────────────
// Price priority: PTT official XML (for PTT) → chnwt.dev → DB seed.
// TomorrowPriceDifference always comes from DB (no public API provides this).

app.MapGet("/api/fuel-prices", async (
    AppDbContext db,
    IHttpClientFactory httpFactory,
    IMemoryCache cache,
    ILogger<Program> logger) =>
{
    var (pttPrices, chnwtData, dbPrices, tomorrowDiffs) = await FetchAllSources(httpFactory, cache, db, logger);

    var confirmedDiffs = tomorrowDiffs.Values.Where(v => v.HasValue).Select(v => v!.Value).ToList();
    var maxDiff        = confirmedDiffs.Count > 0 ? confirmedDiffs.Max() : 0;
    var fuelTypes = new[] { "Gasohol95", "E20", "Diesel" };
    var prices    = new List<object>();

    foreach (var (apiStation, displayName) in comparisonStations)
    {
        foreach (var fuelType in fuelTypes)
        {
            var currentPrice = ResolvePrice(
                apiStation, fuelType, pttPrices, chnwtData, dbPrices, displayName);

            var tomorrowDiff = tomorrowDiffs.GetValueOrDefault(fuelType); // null = not announced

            prices.Add(new
            {
                StationBrand            = displayName,
                FuelType                = fuelType,
                CurrentPrice            = currentPrice,
                TomorrowPriceDifference = tomorrowDiff,                              // null = ยังไม่ประกาศ
                tomorrowPrice           = tomorrowDiff.HasValue
                                            ? currentPrice + tomorrowDiff.Value
                                            : (decimal?)null,
            });
        }
    }

    return Results.Ok(new
    {
        goldenHourAlert = new
        {
            isActive        = maxDiff > 0,
            priceDifference = maxDiff,
            message         = maxDiff > 0
                ? $"ราคาน้ำมันพรุ่งนี้จะขึ้น {maxDiff:0.00} บาท/ลิตร เติมวันนี้ประหยัดกว่า!"
                : string.Empty
        },
        priceDate     = chnwtData?.Date,
        isLive        = chnwtData is not null || pttPrices.Count > 0,
        pttSource     = pttPrices.Count > 0 ? "official" : "community",   // transparency flag
        prices
    });
})
.WithName("GetFuelPrices")
.WithOpenApi();

// ── GET /api/calculate ────────────────────────────────────────────────────────
// simulatedAdjustment: optional baht/liter price change to model (e.g. +1.50).
// Returns both the official calculation and the simulated one in a single response.

app.MapGet("/api/calculate", async (
    AppDbContext db,
    IHttpClientFactory httpFactory,
    IMemoryCache cache,
    ILogger<Program> logger,
    string brand,
    string model,
    string fuelType,
    string mode,
    decimal? amount,
    decimal? simulatedAdjustment) =>
{
    var car = await db.CarSpecs
        .FirstOrDefaultAsync(c => c.Brand == brand && c.ModelFamily == model);

    if (car is null)
        return Results.NotFound(new { error = "ไม่พบรถยนต์ที่ระบุ" });

    var (pttPrices, chnwtData, dbPrices, tomorrowDiffs) = await FetchAllSources(httpFactory, cache, db, logger);

    // Find the cheapest station for this fuel type using the full resolution chain
    decimal cheapestPrice   = 0;
    string  cheapestStation = string.Empty;

    foreach (var (apiStation, displayName) in comparisonStations)
    {
        var price = ResolvePrice(
            apiStation, fuelType, pttPrices, chnwtData, dbPrices, displayName);

        if (price > 0 && (cheapestPrice == 0 || price < cheapestPrice))
        {
            cheapestPrice   = price;
            cheapestStation = displayName;
        }
    }

    if (cheapestPrice == 0)
        return Results.NotFound(new { error = "ไม่พบราคาน้ำมันสำหรับประเภทที่ระบุ" });

    decimal liters, cost, fillPercentage;

    if (mode == "fullTank")
    {
        liters         = car.TankCapacity;
        cost           = Math.Round(liters * cheapestPrice, 2);
        fillPercentage = 100;
    }
    else
    {
        var budget     = amount ?? 0;
        liters         = Math.Round(budget / cheapestPrice, 2);
        cost           = budget;
        fillPercentage = Math.Min(100, Math.Round((liters / car.TankCapacity) * 100, 1));
    }

    var tomorrowDiff = tomorrowDiffs.GetValueOrDefault(fuelType); // null = not announced
    var savings      = tomorrowDiff.HasValue ? Math.Round(liters * tomorrowDiff.Value, 2) : (decimal?)null;

    // ── Simulated price scenario ──────────────────────────────────────────────
    var simAdj              = simulatedAdjustment ?? 0;
    var simPricePerLiter    = cheapestPrice + simAdj;
    var simCost             = Math.Round(liters * simPricePerLiter, 2);
    var simExtraCost        = Math.Round(liters * simAdj, 2); // negative = savings

    return Results.Ok(new
    {
        car = new { car.Brand, car.ModelFamily, car.TankCapacity },
        fuelType,
        mode,
        cheapestStation,
        pricePerLiter  = cheapestPrice,
        liters,
        cost,
        fillPercentage,
        savings,
        savingsMessage = savings > 0
            ? $"ประหยัดได้ ฿{savings.Value:0.00} ถ้าเติมวันนี้แทนพรุ่งนี้"
            : string.Empty,
        // Simulated scenario (based on simulatedAdjustment param)
        simulation = new
        {
            adjustment        = simAdj,
            pricePerLiter     = simPricePerLiter,
            cost              = simCost,
            extraCost         = simExtraCost,
            message           = simAdj switch
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

app.Run();

// ── Shared data fetcher ───────────────────────────────────────────────────────

static async Task<(
    Dictionary<string, decimal> pttPrices,
    ThaiOilData? chnwtData,
    List<FuelCalc.Api.Data.Entities.FuelPrice> dbPrices,
    Dictionary<string, decimal?> tomorrowDiffs)>
FetchAllSources(IHttpClientFactory factory, IMemoryCache cache, AppDbContext db, ILogger logger)
{
    var pttTask     = FetchPttPrices(factory, cache, logger);
    var pttTomTask  = FetchPttTomorrowPrices(factory, cache, logger);
    var chnwtTask   = FetchChnwtPrices(factory, cache);
    var dbTask      = db.FuelPrices.ToListAsync();

    await Task.WhenAll(pttTask, pttTomTask, chnwtTask, dbTask);

    // Compute per-fuel-type diff from PTT official data.
    // null = tomorrow's price not yet announced (do NOT fall back to seed — that would mislead users).
    var dbPrices = dbTask.Result;
    var diffs    = new Dictionary<string, decimal?>();
    foreach (var ft in new[] { "Gasohol95", "E20", "Diesel" })
    {
        if (pttTomTask.Result.TryGetValue(ft, out var tom) &&
            pttTask.Result.TryGetValue(ft, out var tod)   &&
            tom > 0 && tod > 0)
            diffs[ft] = tom - tod;
        else
            diffs[ft] = null; // not announced yet
    }

    return (pttTask.Result, chnwtTask.Result, dbPrices, diffs);
}

// ── DTOs for chnwt.dev API ────────────────────────────────────────────────────

record ThaiOilRoot(string Status, ThaiOilData? Response);

record ThaiOilData(
    string Note,
    string Date,
    Dictionary<string, Dictionary<string, ThaiOilFuelItem>> Stations);

record ThaiOilFuelItem(string Name, string Price);
