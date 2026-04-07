using FuelCalc.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace FuelCalc.Api.Data;

public static class SeedData
{
    public static async Task InitializeAsync(AppDbContext context)
    {
        await context.Database.MigrateAsync();

        if (!await context.CarSpecs.AnyAsync())
        {
            context.CarSpecs.AddRange(
                new CarSpec { Brand = "Toyota", ModelFamily = "Yaris Cross", TankCapacity = 36,  FuelTypesSupported = "E20,Gasohol95" },
                new CarSpec { Brand = "Honda",  ModelFamily = "Civic",       TankCapacity = 47,  FuelTypesSupported = "Gasohol95,E20" },
                new CarSpec { Brand = "Isuzu",  ModelFamily = "D-Max",       TankCapacity = 76,  FuelTypesSupported = "Diesel" },
                new CarSpec { Brand = "Toyota", ModelFamily = "Fortuner",    TankCapacity = 80,  FuelTypesSupported = "Diesel,Gasohol95" },
                new CarSpec { Brand = "Honda",  ModelFamily = "City",        TankCapacity = 40,  FuelTypesSupported = "Gasohol95,E20" }
            );
        }

        if (!await context.FuelPrices.AnyAsync())
        {
            context.FuelPrices.AddRange(
                // PTT
                new FuelPrice { StationBrand = "PTT",      FuelType = "Gasohol95", CurrentPrice = 39.66m, TomorrowPriceDifference = 0.50m },
                new FuelPrice { StationBrand = "PTT",      FuelType = "E20",       CurrentPrice = 33.44m, TomorrowPriceDifference = 0.50m },
                new FuelPrice { StationBrand = "PTT",      FuelType = "Diesel",    CurrentPrice = 29.94m, TomorrowPriceDifference = 0.50m },
                // Bangchak
                new FuelPrice { StationBrand = "Bangchak", FuelType = "Gasohol95", CurrentPrice = 39.66m, TomorrowPriceDifference = 0.50m },
                new FuelPrice { StationBrand = "Bangchak", FuelType = "E20",       CurrentPrice = 33.44m, TomorrowPriceDifference = 0.50m },
                new FuelPrice { StationBrand = "Bangchak", FuelType = "Diesel",    CurrentPrice = 29.94m, TomorrowPriceDifference = 0.50m },
                // Shell (0.50 Baht more expensive)
                new FuelPrice { StationBrand = "Shell",    FuelType = "Gasohol95", CurrentPrice = 40.16m, TomorrowPriceDifference = 0.50m },
                new FuelPrice { StationBrand = "Shell",    FuelType = "E20",       CurrentPrice = 33.94m, TomorrowPriceDifference = 0.50m },
                new FuelPrice { StationBrand = "Shell",    FuelType = "Diesel",    CurrentPrice = 30.44m, TomorrowPriceDifference = 0.50m }
            );
        }

        await context.SaveChangesAsync();
    }
}
