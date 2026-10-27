
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIQA.Services.Data;
using SIQA.Models;

namespace SIQA.Services.Controllers
{
    public class DashboardController : Controller
    {
        private readonly SiaqDbContext _context;

        public DashboardController(SiaqDbContext context)
        {
            _context = context;
        }

        public async Task<IActionResult> Index()
        {
            var agora = DateTime.UtcNow;
            var inicio = agora.AddHours(-24);
            var inicioHoje = agora.Date;
            var inicioAmanha = inicioHoje.AddDays(1);

            var ultimaLeitura = await _context.Leituras
                .OrderByDescending(l => l.DataHora)
                .FirstOrDefaultAsync();

            var leiturasGrafico = await _context.Leituras
                .Where(l => l.DataHora >= inicio &&
                            l.DataHora <= agora)
                .OrderBy(l => l.DataHora)
                .ToListAsync();

            var model = new Dashboard
            {
                TemperaturaAtual = ultimaLeitura?.Temperatura,

                UmidadeAtual = ultimaLeitura?.Umidade,

                UltimaAtualizacao = ultimaLeitura?.DataHora,

                LeiturasHoje = await _context.Leituras
                    .CountAsync(l =>
                        l.DataHora >= inicioHoje &&
                        l.DataHora < inicioAmanha),

                StatusSensor = ultimaLeitura == null
                    ? "Aguardando leituras"
                    : "Leitura disponível",

                LeiturasRecentes = await _context.Leituras
                    .OrderByDescending(l => l.DataHora)
                    .Take(10)
                    .ToListAsync(),

                LeiturasGrafico = leiturasGrafico,

                Ambientes = await _context.Ambientes
                    .OrderBy(a => a.Nome)
                    .ToListAsync()
            };

            return View(model);
        }
    }
}
