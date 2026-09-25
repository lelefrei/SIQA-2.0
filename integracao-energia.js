
/*
 * SIQA + Energia - integração Supabase
 * Este arquivo consulta diretamente as tabelas do Supabase.
 * IMPORTANTE: preencha SUPABASE_URL e SUPABASE_ANON_KEY em config-energia.js.
 */
(function () {
  const cfg = window.SIQA_CONFIG || {};
  const SUPABASE_URL = cfg.SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY || "";

  const state = {
    energia: [],
    alertas: [],
    ambientes: [],
    leituras: []
  };

  function show(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function fmt(n, digits = 2) {
    const x = Number(n);
    return Number.isFinite(x) ? x.toLocaleString("pt-BR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }) : "0,00";
  }

  async function supabase(table, query = "") {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY em config-energia.js");
    }
    const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
    const r = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (!r.ok) throw new Error(`${table}: HTTP ${r.status}`);
    return r.json();
  }

  async function carregarEnergia() {
    state.energia = await supabase(
      "leituras_energia",
      "?select=*&order=data_hora.asc"
    );
    state.alertas = await supabase(
      "historico_alertas",
      "?select=*&order=data_hora.desc"
    );

    atualizarKPIs();
    desenharGraficos();
  }

  async function carregarSIQA() {
    try {
      state.ambientes = await supabase("ambientes", "?select=*");
      state.leituras = await supabase(
        "leituras",
        "?select=*&order=created_at.desc"
      );
      atualizarKPIsSIQA();
    } catch (e) {
      console.warn("Dados SIQA não carregados:", e.message);
    }
  }

  function atualizarKPIs() {
    const rows = state.energia;
    const alerts = state.alertas;

    const ultima = rows.length ? rows[rows.length - 1] : null;
    const potencia = ultima ? Number(ultima.potencia_watts || 0) : 0;

    // O cálculo segue a mesma lógica do servidor.py:
    // potencia/1000 * (2/3600), acumulado por leitura.
    const hoje = new Date().toISOString().slice(0, 10);
    const hojeRows = rows.filter(r => String(r.data_hora || "").slice(0, 10) === hoje);
    const energiaDia = hojeRows.reduce(
      (s, r) => s + Number(r.potencia_watts || 0) / 1000 * (2 / 3600), 0
    );
    const pico = hojeRows.reduce(
      (m, r) => Math.max(m, Number(r.potencia_watts || 0)), 0
    );
    const alertasHoje = alerts.filter(
      r => String(r.data_hora || "").slice(0, 10) === hoje
    ).length;

    show("energia-potencia", `${fmt(potencia)} W`);
    show("energia-dia", `${fmt(energiaDia, 3)} kWh`);
    show("energia-pico", `${fmt(pico)} W`);
    show("energia-alertas", String(alertasHoje));

    const status = document.getElementById("energia-status");
    if (status) {
      status.textContent = potencia > 14080 ? "Consumo acima do limite" : "Consumo dentro do limite";
      status.className = potencia > 14080 ? "status status-danger" : "status status-ok";
    }
  }

  function atualizarKPIsSIQA() {
    show("siqa-ambientes", String(state.ambientes.length));
    show("siqa-leituras", String(state.leituras.length));
  }

  function agruparDiario() {
    const map = {};
    for (const r of state.energia) {
      const d = String(r.data_hora || "").slice(0, 10);
      if (!d) continue;
      map[d] = (map[d] || 0) + Number(r.potencia_watts || 0) / 1000 * (2 / 3600);
    }
    return Object.entries(map).slice(-7);
  }

  function agruparMensal() {
    const map = {};
    for (const r of state.energia) {
      const d = new Date(r.data_hora);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
      map[key] = (map[key] || 0) + Number(r.potencia_watts || 0) / 1000 * (2 / 3600);
    }
    return Object.entries(map);
  }

  function desenharBarChart(canvasId, labels, values, suffix) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === "undefined") return;
    if (canvas._chart) canvas._chart.destroy();

    canvas._chart = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: suffix,
          data: values,
          borderWidth: 1,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${fmt(ctx.raw, 3)} ${suffix}`
            }
          }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  function desenharGraficos() {
    const diarios = agruparDiario();
    desenharBarChart(
      "energia-grafico-diario",
      diarios.map(x => {
        const [y,m,d] = x[0].split("-");
        return `${d}/${m}`;
      }),
      diarios.map(x => x[1]),
      "kWh"
    );

    const mensais = agruparMensal();
    desenharBarChart(
      "energia-grafico-mensal",
      mensais.map(x => x[0]),
      mensais.map(x => x[1]),
      "kWh"
    );
  }

  window.addEventListener("DOMContentLoaded", () => {
    carregarEnergia().catch(e => {
      console.error(e);
      const box = document.getElementById("energia-erro");
      if (box) {
        box.textContent = e.message;
        box.hidden = false;
      }
    });
    carregarSIQA();
  });

  window.SIQA_ENERGIA = { carregarEnergia, state };
})();
