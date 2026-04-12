namespace FuelCalc.Tests;

using FuelCalc.Api.Data;
using Microsoft.EntityFrameworkCore;

public static class DbContextHelper
{
    public static AppDbContext CreateInMemory()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()) // unique DB per test
            .Options;
        return new AppDbContext(options);
    }
}
