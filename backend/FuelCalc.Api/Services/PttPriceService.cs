namespace FuelCalc.Api.Services;

using System.Globalization;
using System.Text;
using System.Xml.Linq;
using Microsoft.Extensions.Caching.Memory;

public class PttPriceService(
    IHttpClientFactory   httpFactory,
    IMemoryCache         cache,
    ILogger<PttPriceService> logger) : IPttPriceService
{
    // ── Public API ────────────────────────────────────────────────────────────

    public async Task<Dictionary<string, decimal>> GetTodayPricesAsync()
    {
        const string CacheKey = "ptt_xml_prices";
        if (cache.TryGetValue(CacheKey, out Dictionary<string, decimal>? cached))
        {
            logger.LogInformation("[PTT Today] cache hit → {Count} fuel types", cached!.Count);
            return cached!;
        }

        try
        {
            var client = httpFactory.CreateClient("PttApi");
            var body   = BuildSoapBody("CurrentOilPrice", "<Language>thai</Language>");

            logger.LogInformation("[PTT Today] POST oilservice/OilPrice.asmx  SOAPAction=CurrentOilPrice");
            var resp = await client.PostAsync("oilservice/OilPrice.asmx", body);
            var xml  = await resp.Content.ReadAsStringAsync();

            logger.LogInformation("[PTT Today] HTTP {Status}  body ({Len} chars)", (int)resp.StatusCode, xml.Length);

            if (xml.Contains("<html", StringComparison.OrdinalIgnoreCase))
            {
                logger.LogWarning("[PTT Today] response is HTML (endpoint may be blocked or down) – skipping");
                return [];
            }

            var priceMap = ParseSoapResponse(xml);
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

    public async Task<Dictionary<string, decimal>> GetTomorrowPricesAsync()
    {
        const string CacheKey = "ptt_xml_tomorrow_prices";
        if (cache.TryGetValue(CacheKey, out Dictionary<string, decimal>? cached))
        {
            logger.LogInformation("[PTT Tomorrow] cache hit → {Count} fuel types", cached!.Count);
            return cached!;
        }

        try
        {
            var client   = httpFactory.CreateClient("PttApi");
            var tomorrow = DateTime.UtcNow.AddDays(1);

            Dictionary<string, decimal> priceMap = [];
            foreach (var year in new[] { tomorrow.Year + 543, tomorrow.Year })
            {
                var innerXml = $"""
                    <Language>thai</Language>
                    <DD>{tomorrow.Day}</DD>
                    <MM>{tomorrow.Month}</MM>
                    <YYYY>{year}</YYYY>
                    """;
                var body = BuildSoapBody("GetOilPrice", innerXml);

                logger.LogInformation("[PTT Tomorrow] POST GetOilPrice  DD={Day} MM={Month} YYYY={Year}",
                    tomorrow.Day, tomorrow.Month, year);
                var resp = await client.PostAsync("oilservice/OilPrice.asmx", body);
                var xml  = await resp.Content.ReadAsStringAsync();

                logger.LogInformation("[PTT Tomorrow] HTTP {Status}  body ({Len} chars)", (int)resp.StatusCode, xml.Length);

                if (xml.Contains("<html", StringComparison.OrdinalIgnoreCase))
                {
                    logger.LogWarning("[PTT Tomorrow] response is HTML – skipping");
                    break;
                }

                priceMap = ParseSoapResponse(xml);
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

    public async Task<Dictionary<string, decimal>> GetHistoricalPricesAsync(DateOnly date)
    {
        var cacheKey = $"ptt_historical_{date:yyyy-MM-dd}";
        if (cache.TryGetValue(cacheKey, out Dictionary<string, decimal>? cached))
            return cached!;

        Dictionary<string, decimal> priceMap = [];
        try
        {
            var client = httpFactory.CreateClient("PttApi");
            foreach (var year in new[] { date.Year + 543, date.Year })
            {
                var innerXml = $"""
                    <Language>thai</Language>
                    <DD>{date.Day}</DD>
                    <MM>{date.Month}</MM>
                    <YYYY>{year}</YYYY>
                    """;
                var body = BuildSoapBody("GetOilPrice", innerXml);
                var resp = await client.PostAsync("oilservice/OilPrice.asmx", body);
                var xml  = await resp.Content.ReadAsStringAsync();

                logger.LogWarning("[PTT Historical {Date}] raw response (first 300 chars): {Preview}",
                    date, xml.Length > 300 ? xml[..300] : xml);

                if (xml.Contains("<html", StringComparison.OrdinalIgnoreCase))
                {
                    logger.LogWarning("[PTT Historical {Date}] response is HTML – skipping", date);
                    break;
                }

                priceMap = ParseSoapResponse(xml);
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

    // ── Private Helpers ───────────────────────────────────────────────────────

    private static StringContent BuildSoapBody(string method, string innerXml)
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
        var content = new StringContent(envelope, Encoding.UTF8, "text/xml");
        content.Headers.Add("SOAPAction", $"\"http://www.pttor.com/{method}\"");
        return content;
    }

    private static Dictionary<string, decimal> ParseSoapResponse(string xml)
    {
        if (string.IsNullOrWhiteSpace(xml)) return [];
        xml = xml.TrimStart('\uFEFF');
        if (string.IsNullOrWhiteSpace(xml)) return [];

        var priceMap = new Dictionary<string, decimal>();
        XDocument doc;
        try { doc = XDocument.Parse(xml); }
        catch { return []; }

        // PTT wraps the actual data as CDATA inside the result element
        var resultEl = doc.Descendants()
            .FirstOrDefault(e => e.Name.LocalName.EndsWith("Result"));

        if (resultEl is not null)
        {
            var inner = resultEl.Value.Trim();
            if (string.IsNullOrEmpty(inner)) return [];

            var innerDoc = XDocument.Parse(inner);
            foreach (var fuel in innerDoc.Descendants("FUEL"))
            {
                var product  = fuel.Element("PRODUCT")?.Value.Trim();
                var priceStr = fuel.Element("PRICE")?.Value.Trim();
                var fuelType = product is not null ? MapProduct(product) : null;

                if (fuelType is not null &&
                    decimal.TryParse(priceStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var price) &&
                    price > 0)
                    priceMap.TryAdd(fuelType, price);
            }
            return priceMap;
        }

        // Fallback: old namespace-based format
        XNamespace ns = "http://www.pttor.com";
        foreach (var row in doc.Descendants().Where(e =>
            e.Element(ns + "PRODUCT") is not null && e.Element(ns + "PRICE") is not null))
        {
            var product  = row.Element(ns + "PRODUCT")!.Value.Trim();
            var priceStr = row.Element(ns + "PRICE")!.Value.Trim();
            var fuelType = MapProduct(product);

            if (fuelType is not null &&
                decimal.TryParse(priceStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var price) &&
                price > 0)
                priceMap.TryAdd(fuelType, price);
        }

        return priceMap;
    }

    private static string? MapProduct(string name)
    {
        if (name.Contains("E85") || name.Contains("E 85")) return "E85";
        if (name.Contains("E20") || name.Contains("E 20")) return "E20";
        if (name.Contains("Gasohol 91") || name.Contains("แก๊สโซฮอล์ 91")) return "Gasohol91";

        if ((name.Contains("Gasohol 95") || name.Contains("แก๊สโซฮอล์ 95"))
            && !name.Contains("Super") && !name.Contains("ซูเปอร์") && !name.Contains("พรีเมียม"))
            return "Gasohol95";

        if ((name.Equals("Diesel", StringComparison.OrdinalIgnoreCase) || name.Contains("ดีเซล"))
            && !name.Contains("Premium") && !name.Contains("พรีเมียม")
            && !name.Contains("B20") && !name.Contains("บี 20"))
            return "Diesel";

        return null;
    }
}
