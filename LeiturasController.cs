using Microsoft.AspNetCore.Mvc;
using SIQA.Models;
using SIQA.Services.Data;
using Microsoft.EntityFrameworkCore;

namespace SIQA.Services.Controllers
{
    public class LeiturasController : Controller
    {
        private readonly SiaqDbContext _context;

        public LeiturasController(SiaqDbContext context)
        {
            _context = context;
        }


        public async Task<IActionResult> Index()
        {
            var leituras = await _context.Leituras
                .OrderByDescending(l => l.DataHora)
                .Take(100)
                .ToListAsync();

            return View(leituras);
        }


        public async Task<IActionResult> TestarGravacao()
        {
            var leitura = new Leitura
            {
                Temperatura = 25.5,
                Umidade = 60.0,
                DataHora = DateTime.UtcNow,
                Origem = "Teste manual"
            };

            _context.Leituras.Add(leitura);
            await _context.SaveChangesAsync();

            return Content(
                $"Leitura salva com sucesso! ID: {leitura.Id}"
            );
        }
    }
}