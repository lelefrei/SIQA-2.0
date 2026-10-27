using Microsoft.EntityFrameworkCore;
using SIQA.Models;

namespace SIQA.Services.Data
{
    public class SiaqDbContext : DbContext
    {
        public SiaqDbContext(DbContextOptions<SiaqDbContext> options)
            : base(options)
        {
        }

        public DbSet<Ambiente> Ambientes { get; set; }

        public DbSet<Leitura> Leituras { get; set; }
    }
}
