using System.ComponentModel.DataAnnotations;

namespace SIQA.Models
{
    public class Leitura
    {
        public int Id { get; set; }

        [Range(-40, 80)]
        public double Temperatura { get; set; }

        [Range(0, 100)]
        public double Umidade { get; set; }

        public DateTime DataHora { get; set; } = DateTime.Now;

        [MaxLength(80)]
        public string Origem { get; set; } = "DHT22";

        public int? AmbienteId { get; set; }

        public Ambiente? Ambiente { get; set; }
    }
}
