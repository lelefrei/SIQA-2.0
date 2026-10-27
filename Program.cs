
using Microsoft.EntityFrameworkCore;
using SIQA.Services.Data;

var builder = WebApplication.CreateBuilder(args);

// Configuração do MVC
builder.Services.AddControllersWithViews();

// Configuração do PostgreSQL
var connectionString = builder.Configuration
    .GetConnectionString("SiqaConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "A conexão SiqaConnection não foi configurada.");
}

builder.Services.AddDbContext<SiaqDbContext>(options =>
    options.UseNpgsql(connectionString));

var app = builder.Build();

// Configuração da aplicação
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();
app.UseAuthorization();

// Página inicial
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Dashboard}/{action=Index}/{id?}");

app.Run();
