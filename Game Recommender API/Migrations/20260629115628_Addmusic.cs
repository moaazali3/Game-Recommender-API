using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Game_Recommender_API.Migrations
{
    /// <inheritdoc />
    public partial class Addmusic : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ThemeMusicUrl",
                table: "Series",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ThemeMusicUrl",
                table: "Series");
        }
    }
}
