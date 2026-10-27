using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIQA.Services.Data;

namespace SIQA.Web.Controllers
{
    public class HistoricoController : Controller
    {
        private readonly SiaqDbContext _context;

        public HistoricoController(SiaqDbContext context)
        {
            _context = context;
        }

        public async Task<IActionResult> Index()
        {
            var leituras = await _context.Leituras
                .OrderByDescending(l => l.DataHora)
                .ToListAsync();

            return View(leituras);
        }
    }
}