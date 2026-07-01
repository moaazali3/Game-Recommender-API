using Game_Recommender_API.Services;
using Microsoft.EntityFrameworkCore;
using Game_Recommender_API.Data;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddSingleton<TextAnalyzerService>();
builder.Services.AddHttpClient<GameApiService>();
builder.Services.AddHttpClient<SteamReviewService>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
        builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});
var app = builder.Build();


if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();   // ضيف السطر ده
    app.UseSwaggerUI(); // وضيف السطر ده كمان
}
// Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }
app.UseDefaultFiles(); // السطر ده بيخلي السيرفر يدور على ملف index.html ويفتحه أول حاجة
app.UseStaticFiles();  // السطر ده بيسمح للسيرفر يقرأ ملفات الـ CSS والـ JS
app.UseCors("AllowAll");
app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
