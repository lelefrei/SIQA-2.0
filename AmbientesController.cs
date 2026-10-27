
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIQA.Services.Data;
using SIQA.Models;

namespace SIQA.Services.Controllers
{
    public class AmbientesController : Controller
    {
        private readonly SiaqDbContext _context;

        public AmbientesController(SiaqDbContext context)
        {
            _context = context;
        }

        // Lista os ambientes cadastrados
        public async Task<IActionResult> Index()
        {
            var ambientes = await _context.Ambientes
                .OrderBy(a => a.Nome)
                .ToListAsync();

            return View(ambientes);
        }

        // Exibe o formulário de cadastro
        [HttpGet]
        public IActionResult Create()
        {
            return View();
        }

        // Salva o novo ambiente
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(Ambiente ambiente)
        {
            if (!ModelState.IsValid)
            {
                return View(ambiente);
            }

            _context.Ambientes.Add(ambiente);
            await _context.SaveChangesAsync();

            TempData["Sucesso"] = "Ambiente cadastrado com sucesso!";

            return RedirectToAction(nameof(Index));
        }

        // Exibe o formulário de edição
        [HttpGet]
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var ambiente = await _context.Ambientes
                .FindAsync(id);

            if (ambiente == null)
            {
                return NotFound();
            }

            return View(ambiente);
        }

        // Salva as alterações do ambiente
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(
            int id,
            Ambiente ambiente)
        {
            if (id != ambiente.Id)
            {
                return NotFound();
            }

            if (!ModelState.IsValid)
            {
                return View(ambiente);
            }

            try
            {
                _context.Ambientes.Update(ambiente);
                await _context.SaveChangesAsync();

                TempData["Sucesso"] =
                    "Ambiente atualizado com sucesso!";
            }
            catch (DbUpdateConcurrencyException)
            {
                var existe = await _context.Ambientes
                    .AnyAsync(a => a.Id == ambiente.Id);

                if (!existe)
                {
                    return NotFound();
                }

                throw;
            }

            return RedirectToAction(nameof(Index));
        }


        // Exibe a confirmação de exclusão
        [HttpGet]
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var ambiente = await _context.Ambientes
                .FirstOrDefaultAsync(a => a.Id == id);

            if (ambiente == null)
            {
                return NotFound();
            }

            return View(ambiente);
        }

        // Confirma e executa a exclusão
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var ambiente = await _context.Ambientes
                .Include(a => a.Leituras)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (ambiente == null)
            {
                return NotFound();
            }

            // Não permite excluir ambientes com leituras associadas.
            if (ambiente.Leituras.Any())
            {
                TempData["Erro"] =
                    "Este ambiente possui leituras associadas e não pode ser excluído.";

                return RedirectToAction(nameof(Index));
            }

            _context.Ambientes.Remove(ambiente);
            await _context.SaveChangesAsync();

            TempData["Sucesso"] = "Ambiente excluído com sucesso!";

            return RedirectToAction(nameof(Index));
        }

    }
}
