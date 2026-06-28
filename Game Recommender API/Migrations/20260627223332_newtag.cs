using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Game_Recommender_API.Migrations
{
    /// <inheritdoc />
    public partial class newtag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Tags",
                table: "Games",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Tags",
                table: "Games");
        }
    }
}
