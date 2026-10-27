using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace SIQA.Models
{
    public class Ambiente
    {
        public int Id { get; set; }

        [Required]
        [StringLength(80)]
        public string Nome { get; set; } = string.Empty;

        [StringLength(160)]
        public string? Localizacao { get; set; }

        public bool Ativo { get; set; } = true;

        public ICollection<Leitura> Leituras { get; set; }
            = new List<Leitura>();
    }
}
