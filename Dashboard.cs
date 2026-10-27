using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;


namespace SIQA.Models
{
        public class Dashboard
        {
        public double? TemperaturaAtual { get; set; }
        public double? UmidadeAtual { get; set; }
        public DateTime? UltimaAtualizacao { get; set; }
        public int LeiturasHoje { get; set; }

        public string StatusSensor { get; set; } = "Aguardando leituras";

        public List<Leitura> LeiturasRecentes { get; set; } = new();
        public List<Leitura> LeiturasGrafico { get; set; } = new();
        public List<Ambiente> Ambientes { get; set; } = new();
    }
    }