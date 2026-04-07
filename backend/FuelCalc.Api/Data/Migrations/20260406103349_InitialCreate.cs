using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FuelCalc.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CarSpecs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Brand = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ModelFamily = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TankCapacity = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    FuelTypesSupported = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CarSpecs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FuelPrices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StationBrand = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FuelType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CurrentPrice = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    TomorrowPriceDifference = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FuelPrices", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FuelPrices_StationBrand_FuelType",
                table: "FuelPrices",
                columns: new[] { "StationBrand", "FuelType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CarSpecs");

            migrationBuilder.DropTable(
                name: "FuelPrices");
        }
    }
}
