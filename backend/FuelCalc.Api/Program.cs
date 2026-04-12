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

// PTT product name → our FuelType label. Handles both English and Thai names.
static string? MapPttProduct(string name)
{
    // E85 before E20 to avoid accidental substring match
    if (name.Contains("E85") || name.Contains("E 85")) return "E85";
    if (name.Contains("E20") || name.Contains("E 20")) return "E20";

    // Gasohol 91 (English response)
    if (name.Contains("Gasohol 91") || name.Contains("แก๊สโซฮอล์ 91")) return "Gasohol91";

    // Gasohol 95 — standard only (skip Super Power / Premium variants)
    if ((name.Contains("Gasohol 95") || name.Contains("แก๊สโซฮอล์ 95"))
        && !name.Contains("Super") && !name.Contains("ซูเปอร์") && !name.Contains("พรีเมียม"))
        return "Gasohol95";

    // Standard Diesel only (skip Premium Diesel / B20)
    if ((name.Equals("Diesel", StringComparison.OrdinalIgnoreCase) || name.Contains("ดีเซล"))
        && !name.Contains("Premium") && !name.Contains("พรีเมียม")
        && !name.Contains("B20") && !name.Contains("บี 20"))
        return "Diesel";

    return null;
}

// ── Thai timezone helpers ─────────────────────────────────────────────────────

// Returns Thai today, Thai tomorrow, and time remaining until Thai midnight.
// Works on both Windows ("SE Asia Standard Time") and Linux ("Asia/Bangkok").
static (DateOnly today, DateOnly tomorrow, TimeSpan untilMidnight) GetThaiDates()
{
    var thaiZone = TimeZoneInfo.GetSystemTimeZones().FirstOrDefault(z =>
                       z.Id is "SE Asia Standard Time" or "Asia/Bangkok")
                   ?? TimeZoneInfo.CreateCustomTimeZone("TH+7", TimeSpan.FromHours(7), "Thailand", "Thailand");
    var thaiNow  = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, thaiZone);
    var today    = DateOnly.FromDateTime(thaiNow.Date);
    return (today, today.AddDays(1), thaiNow.Date.AddDays(1) - thaiNow);
}

// ── PTT SOAP helpers ──────────────────────────────────────────────────────────

// Builds a SOAP 1.1 envelope for PTT ASMX.
// The method element carries xmlns="http://www.pttor.com"; parameters have no prefix.
static StringContent BuildPttSoapBody(string method, string innerXml)
{
    var envelope = $"""
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:orap="https://orapiweb.pttor.com">
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
// PTT wraps the actual data as CDATA inside <GetOilPriceResult> / <CurrentOilPriceResult>.
// The inner XML contains <FUEL><PRODUCT>...</PRODUCT><PRICE>...</PRICE></FUEL> elements.
static Dictionary<string, decimal> ParsePttSoapResponse(string xml)
{
    if (string.IsNullOrWhiteSpace(xml)) return [];
    xml = xml.TrimStart('\uFEFF'); // strip BOM if present
    if (string.IsNullOrWhiteSpace(xml)) return [];

    var priceMap = new Dictionary<string, decimal>();
    XDocument doc;
    try { doc = XDocument.Parse(xml); }
    catch { return []; }

    // Find the result element (name varies by method: CurrentOilPriceResult / GetOilPriceResult)
    var resultEl = doc.Descendants()
        .FirstOrDefault(e => e.Name.LocalName.EndsWith("Result"));

    if (resultEl is not null)
    {
        // Value contains the CDATA-wrapped inner XML
        var inner = resultEl.Value.Trim();
        if (string.IsNullOrEmpty(inner)) return [];

        var innerDoc = XDocument.Parse(inner);
        foreach (var fuel in innerDoc.Descendants("FUEL"))
        {
            var product  = fuel.Element("PRODUCT")?.Value.Trim();
            var priceStr = fuel.Element("PRICE")?.Value.Trim();
            var fuelType = product is not null ? MapPttProduct(product) : null;

            if (fuelType is not null &&
                decimal.TryParse(priceStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var price) &&
                price > 0)
                priceMap.TryAdd(fuelType, price);
        }
        return priceMap;
    }

    // Fallback: old format where PRODUCT/PRICE are direct XML elements with namespace
    XNamespace ns = "http://www.pttor.com";
    foreach (var row in doc.Descendants().Where(e =>
        e.Element(ns + "PRODUCT") is not null && e.Element(ns + "PRICE") is not null))
    {
        var product  = row.Element(ns + "PRODUCT")!.Value.Trim();
        var priceStr = row.Element(ns + "PRICE")!.Value.Trim();
        var fuelType = MapPttProduct(product);

        if (fuelType is not null &&
            decimal.TryParse(priceStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var price) &&
            price > 0)
            priceMap.TryAdd(fuelType, price);
    }

    return priceMap;
}

// ── Fetch: PTT official XML API (today) ──────────────────────────────────────
// Returns fuelType → price map. Empty dict on failure (graceful degradation).

static async Task<Dictionary<string, decimal>> FetchPttPrices(
    IHttpClientFactory factory, IMemoryCache cache, ILogger logger)
{
    var (thaiToday, _, untilMidnight) = GetThaiDates();
    var CacheKey = $"ptt_xml_{thaiToday:yyyy-MM-dd}";
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
            cache.Set(CacheKey, priceMap, untilMidnight);

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
    var (_, thaiTomorrow, untilMidnight) = GetThaiDates();
    var CacheKey = $"ptt_xml_tomorrow_{thaiTomorrow:yyyy-MM-dd}";
    if (cache.TryGetValue(CacheKey, out Dictionary<string, decimal>? cached))
    {
        logger.LogInformation("[PTT Tomorrow] cache hit → {Count} fuel types", cached!.Count);
        return cached!;
    }

    try
    {
        var client = factory.CreateClient("PttApi");

        // PTT may use Buddhist Era (Gregorian + 543). Try both.
        Dictionary<string, decimal> priceMap = [];
        foreach (var year in new[] { thaiTomorrow.Year + 543, thaiTomorrow.Year })
        {
            var innerXml = $"""
                <Language>thai</Language>
                <DD>{thaiTomorrow.Day}</DD>
                <MM>{thaiTomorrow.Month}</MM>
                <YYYY>{year}</YYYY>
                """;
            var body = BuildPttSoapBody("GetOilPrice", innerXml);

            logger.LogInformation("[PTT Tomorrow] POST GetOilPrice  DD={Day} MM={Month} YYYY={Year}",
                thaiTomorrow.Day, thaiTomorrow.Month, year);
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
            cache.Set(CacheKey, priceMap, untilMidnight);

        return priceMap;
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "[PTT Tomorrow] request failed");
        return [];
    }
}

// ── Fetch: PTT historical price for a specific date ──────────────────────────
// Reuses GetOilPrice SOAP method (same as FetchPttTomorrowPrices) with any date.
// Historical prices never change so cache TTL is 24 h.

static async Task<Dictionary<string, decimal>> FetchHistoricalPttPrices(
    DateOnly date, IHttpClientFactory factory, IMemoryCache cache, ILogger logger)
{
    var cacheKey = $"ptt_historical_{date:yyyy-MM-dd}";
    if (cache.TryGetValue(cacheKey, out Dictionary<string, decimal>? cached))
        return cached!;

    Dictionary<string, decimal> priceMap = [];
    try
    {
        var client = factory.CreateClient("PttApi");
        foreach (var year in new[] { date.Year + 543, date.Year })
        {
            var innerXml = $"""
                <Language>thai</Language>
                <DD>{date.Day}</DD>
                <MM>{date.Month}</MM>
                <YYYY>{year}</YYYY>
                """;
            var body = BuildPttSoapBody("GetOilPrice", innerXml);
            var resp = await client.PostAsync("oilservice/OilPrice.asmx", body);
            var xml  = await resp.Content.ReadAsStringAsync();

            logger.LogWarning("[PTT Historical {Date}] raw response (first 300 chars): {Preview}",
                date, xml.Length > 300 ? xml[..300] : xml);

            if (xml.Contains("<html", StringComparison.OrdinalIgnoreCase))
            {
                logger.LogWarning("[PTT Historical {Date}] response is HTML – skipping", date);
                break;
            }

            priceMap = ParsePttSoapResponse(xml);
            logger.LogInformation("[PTT Historical {Date}] year={Year} parsed {Count} prices", date, year, priceMap.Count);
            if (priceMap.Count > 0) break;
        }

        if (priceMap.Count > 0)
            cache.Set(cacheKey, priceMap, TimeSpan.FromHours(24));
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "[PTT Historical {Date}] request failed", date);
    }

    return priceMap;
}

// ── Fetch: chnwt.dev community API ───────────────────────────────────────────
// Provides prices for all stations. Null on failure.

static async Task<ThaiOilData?> FetchChnwtPrices(
    IHttpClientFactory factory, IMemoryCache cache)
{
    var (thaiToday, _, untilMidnight) = GetThaiDates();
    var CacheKey = $"thai_oil_{thaiToday:yyyy-MM-dd}";
    if (cache.TryGetValue(CacheKey, out ThaiOilData? cached)) return cached;

    try
    {
        var client  = factory.CreateClient("ThaiOilApi");
        var json    = await client.GetStringAsync("thai-oil-api/latest");
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var root    = JsonSerializer.Deserialize<ThaiOilRoot>(json, options);

        if (root?.Status == "success" && root.Response is not null)
        {
            cache.Set(CacheKey, root.Response, untilMidnight);
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
                    kmPerLiter   = c.FuelEfficiencyKmPerL,
                    fuelTypes    = c.FuelTypesSupported.Split(',', StringSplitOptions.TrimEntries)
                }).ToList()
            )
    });
})
.WithName("GetCars")
.WithOpenApi();

// ── GET /health ───────────────────────────────────────────────────────────────

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }))
   .WithName("HealthCheck")
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

// ── GET /api/calculate-trip ───────────────────────────────────────────────────

app.MapGet("/api/calculate-trip", (
    decimal distanceKm,
    decimal kmPerLiter,
    decimal fuelPrice,
    bool    isRoundTrip = false) =>
{
    if (distanceKm  <= 0) return Results.BadRequest(new { error = "distanceKm ต้องมากกว่า 0" });
    if (kmPerLiter  <= 0) return Results.BadRequest(new { error = "kmPerLiter ต้องมากกว่า 0" });
    if (fuelPrice   <= 0) return Results.BadRequest(new { error = "fuelPrice ต้องมากกว่า 0" });

    var effectiveDistance = isRoundTrip ? distanceKm * 2 : distanceKm;
    var litersNeeded      = Math.Round(effectiveDistance / kmPerLiter, 2);
    var totalCost         = Math.Round(litersNeeded * fuelPrice, 2);

    return Results.Ok(new { distanceKm, effectiveDistance, isRoundTrip, kmPerLiter, fuelPrice, litersNeeded, totalCost });
})
.WithName("CalculateTrip")
.WithOpenApi();

// ── GET /api/historical-price ─────────────────────────────────────────────────

app.MapGet("/api/historical-price", async (
    string date,
    IHttpClientFactory httpFactory,
    IMemoryCache cache,
    ILogger<Program> logger) =>
{
    if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", out var parsedDate))
        return Results.BadRequest(new { error = "รูปแบบวันที่ไม่ถูกต้อง ใช้ yyyy-MM-dd" });

    if (parsedDate > DateOnly.FromDateTime(DateTime.UtcNow))
        return Results.BadRequest(new { error = "ไม่สามารถดูราคาอนาคตได้" });

    var prices = await FetchHistoricalPttPrices(parsedDate, httpFactory, cache, logger);

    return Results.Ok(new { date, prices });
})
.WithName("GetHistoricalPrice")
.WithOpenApi();

// ── GET /api/compare-history ──────────────────────────────────────────────────

app.MapGet("/api/compare-history", async (
    AppDbContext db,
    IHttpClientFactory httpFactory,
    IMemoryCache cache,
    ILogger<Program> logger,
    string brand,
    string model,
    string fuelType,
    string historicalDate,
    decimal? tankCapacity) =>
{
    // Validate date
    if (!DateOnly.TryParseExact(historicalDate, "yyyy-MM-dd", out var parsedDate))
        return Results.BadRequest(new { error = "รูปแบบวันที่ไม่ถูกต้อง ใช้ yyyy-MM-dd" });

    if (parsedDate > DateOnly.FromDateTime(DateTime.UtcNow))
        return Results.BadRequest(new { error = "ไม่สามารถเปรียบเทียบกับวันในอนาคตได้" });

    // Resolve tank capacity: DB first, fallback to query param
    var car = await db.CarSpecs
        .FirstOrDefaultAsync(c => c.Brand == brand && c.ModelFamily == model);

    var resolvedCapacity = (car?.TankCapacity ?? 0) > 0
        ? car!.TankCapacity
        : (tankCapacity ?? 0);

    if (resolvedCapacity <= 0)
        return Results.BadRequest(new { error = "ไม่พบขนาดถังน้ำมัน กรุณาระบุขนาดถังก่อน" });

    // Fetch current price (cheapest station — same logic as /api/calculate)
    var (pttPrices, chnwtData, dbPrices, _) = await FetchAllSources(httpFactory, cache, db, logger);

    decimal currentPrice = 0;
    foreach (var (apiStation, displayName) in comparisonStations)
    {
        var p = ResolvePrice(apiStation, fuelType, pttPrices, chnwtData, dbPrices, displayName);
        if (p > 0 && (currentPrice == 0 || p < currentPrice))
            currentPrice = p;
    }

    if (currentPrice == 0)
        return Results.NotFound(new { error = "ไม่พบราคาน้ำมันปัจจุบันสำหรับประเภทที่ระบุ" });

    // Fetch historical price
    var historicalPrices = await FetchHistoricalPttPrices(parsedDate, httpFactory, cache, logger);

    if (!historicalPrices.TryGetValue(fuelType, out var historicalPrice))
        return Results.NotFound(new { error = $"ไม่พบข้อมูลราคา {fuelType} เมื่อวันที่ {historicalDate} (อาจเป็นวันหยุด หรือ PTT ไม่มีข้อมูล)" });

    var diffPerLiter         = currentPrice - historicalPrice;
    var extraCostForFullTank = Math.Round(diffPerLiter * resolvedCapacity, 2);

    return Results.Ok(new
    {
        fuelType,
        historicalDate,
        historicalPricePerLiter = historicalPrice,
        currentPricePerLiter    = currentPrice,
        diffPerLiter            = Math.Round(diffPerLiter, 2),
        tankCapacity            = resolvedCapacity,
        extraCostForFullTank,
    });
})
.WithName("CompareHistory")
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
