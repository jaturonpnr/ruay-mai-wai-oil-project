using FuelCalc.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace FuelCalc.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<CarSpec> CarSpecs => Set<CarSpec>();
    public DbSet<FuelPrice> FuelPrices => Set<FuelPrice>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CarSpec>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Brand).HasMaxLength(100).IsRequired();
            e.Property(x => x.ModelFamily).HasMaxLength(100).IsRequired();
            e.Property(x => x.TankCapacity).HasPrecision(6, 2);
            e.Property(x => x.FuelTypesSupported).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<FuelPrice>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.StationBrand).HasMaxLength(50).IsRequired();
            e.Property(x => x.FuelType).HasMaxLength(50).IsRequired();
            e.Property(x => x.CurrentPrice).HasPrecision(8, 2);
            e.Property(x => x.TomorrowPriceDifference).HasPrecision(8, 2);
            e.HasIndex(x => new { x.StationBrand, x.FuelType }).IsUnique();
        });
    }
}
