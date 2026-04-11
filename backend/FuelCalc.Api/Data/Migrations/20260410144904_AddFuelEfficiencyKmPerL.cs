using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FuelCalc.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFuelEfficiencyKmPerL : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "FuelEfficiencyKmPerL",
                table: "CarSpecs",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FuelEfficiencyKmPerL",
                table: "CarSpecs");
        }
    }
}
