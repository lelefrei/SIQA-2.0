const FALLBACK_ENVS=[
 {id:"local-1",nome:"Sala 01",limite_co2:1000},{id:"local-2",nome:"Sala 02",limite_co2:1000},
 {id:"local-3",nome:"Sala 03",limite_co2:1000},{id:"local-4",nome:"Sala 04",limite_co2:1000}
];
const FALLBACK_READINGS=[
 {hora:"08h",co2:620,temp:22.1,hum:52,pm25:12,ambiente_id:"local-1"},
 {hora:"10h",co2:710,temp:23.0,hum:54,pm25:10,ambiente_id:"local-3"},
 {hora:"12h",co2:850,temp:24.2,hum:57,pm25:13,ambiente_id:"local-1"},
 {hora:"14h",co2:980,temp:24.8,hum:59,pm25:16,ambiente_id:"local-2"},
 {hora:"16h",co2:760,temp:23.7,hum:55,pm25:11,ambiente_id:"local-4"},
 {hora:"18h",co2:680,temp:22.9,hum:53,pm25:9,ambiente_id:"local-4"}
];
const FALLBACK_ALERTS=[
 {tipo:"Atenção",texto:"Aumento de CO₂ detectado na Sala 02.",hora:"14:05",severidade:"atencao"},
 {tipo:"Informativo",texto:"Sensores sincronizados com sucesso.",hora:"13:42",severidade:"info"},
 {tipo:"Atenção",texto:"Temperatura acima da média na Sala 02.",hora:"13:15",severidade:"atencao"}
];

let db=null, useSupabase=false, charts=[], state={ambientes:[],leituras:[],alertas:[],page:"dashboard",filtro:""};

function cfgReady(){
 const c=window.SIQA_CONFIG||{};
 return c.SUPABASE_URL && c.SUPABASE_ANON_KEY &&
 !c.SUPABASE_URL.includes("COLE_AQUI") && !c.SUPABASE_ANON_KEY.includes("COLE_AQUI");
}
function initDb(){
 if(cfgReady() && window.supabase){ db=window.supabase.createClient(window.SIQA_CONFIG.SUPABASE_URL,window.SIQA_CONFIG.SUPABASE_ANON_KEY); useSupabase=true; }
 setConnection(useSupabase?"Supabase conectado":"Modo demonstração/local");
}
function setConnection(text){
 const el=document.getElementById("connectionStatus");
 el.innerHTML=`<i></i> ${text}`; el.classList.toggle("offline",!useSupabase);
}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function fmtDate(v){return new Date(v).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}
function statusFor(co2,limit=1000){return co2>=limit*1.15?"Crítico":co2>=limit?"Atenção":"Normal"}
function pillClass(s){return s==="Normal"?"normal":s==="Atenção"?"atencao":"critico"}

async function loadData(){
 if(!useSupabase){
  state.ambientes=[...FALLBACK_ENVS];
  state.leituras=FALLBACK_READINGS.map((r,i)=>({...r,coletado_em:new Date(Date.now()-(6-i)*3600000).toISOString()}));
  state.alertas=FALLBACK_ALERTS.map((a,i)=>({...a,id:i+1,criado_em:new Date(Date.now()-(i+1)*3600000).toISOString()}));
  return;
 }
 try{
  const [a,l,al]=await Promise.all([
   db.from("ambientes").select("*").order("nome"),
   db.from("leituras").select("*").order("coletado_em",{ascending:false}).limit(200),
   db.from("alertas").select("*").order("criado_em",{ascending:false}).limit(50)
  ]);
  if(a.error) throw a.error;if(l.error) throw l.error;if(al.error) throw al.error;
  state.ambientes=a.data||[];state.leituras=l.data||[];state.alertas=al.data||[];
 }catch(e){console.error(e);toast("Falha no Supabase. Exibindo dados locais.");useSupabase=false;setConnection("Modo demonstração/local");await loadData()}
}

function latestByEnv(){
 return state.ambientes.map(e=>{
  const r=state.leituras.filter(x=>x.ambiente_id===e.id).sort((a,b)=>new Date(b.coletado_em)-new Date(a.coletado_em))[0];
  return {...e, leitura:r||null, status:r?statusFor(Number(r.co2),e.limite_co2):"Normal"};
 });
}
function aggregate(){
 const rows=state.leituras;
 if(!rows.length)return {co2:0,temp:0,hum:0,pm25:0,quality:0};
 const avg=k=>rows.reduce((s,r)=>s+Number(r[k]||0),0)/rows.length;
 const co2=avg("co2"),temp=avg("temperatura"),hum=avg("umidade"),pm25=avg("pm25");
 const quality=Math.max(0,Math.min(100,100-(co2/2000*55)-(Math.max(0,pm25-12)*1.2)));
 return {co2,temp,hum,pm25,quality};
}
function metric(icon,label,value,unit,note){return `<div class="card metric"><div class="metric-icon">${icon}</div><div><label>${label}</label><div class="metric-value">${value}<small>${unit}</small></div><p>${note}</p></div></div>`}

function dashboardHTML(){
 const m=aggregate(), env=latestByEnv(), q=Math.round(m.quality);
 return `<section class="content">
 <div class="welcome"><div><span class="tag">MONITORAMENTO ATIVO</span><h2>Qualidade do ar em visão geral</h2><p>Indicadores calculados a partir das leituras disponíveis.</p></div><div class="quality-ring" style="--quality:${q}%"><strong>${q}</strong><span>${q>=80?"Boa":q>=60?"Atenção":"Crítica"}</span></div></div>
 <div class="cards">${metric("☁","CO₂",Math.round(m.co2),"ppm",m.co2<1000?"dentro do esperado":"acima do limite")}${metric("♨","Temperatura",m.temp.toFixed(1),"°C","média dos sensores")}${metric("💧","Umidade",m.hum.toFixed(0),"%","média dos sensores")}${metric("〰","PM2.5",m.pm25.toFixed(1),"µg/m³",m.pm25<=15?"boa qualidade":"atenção necessária")}</div>
 <div class="grid2"><div class="card chart"><div class="chart-head"><div><h3>CO₂ durante o período</h3><p>Medições disponíveis no banco</p></div><span class="mini">ppm</span></div><canvas id="mainChart"></canvas></div>
 <div class="card"><div class="chart-head"><div><h3>Status dos ambientes</h3><p>Última leitura de cada ambiente</p></div></div>${env.length?env.map(e=>`<div class="env-row"><div><b>${e.nome}</b><small>${e.leitura?Math.round(e.leitura.co2):"—"} ppm · ${e.leitura?Number(e.leitura.temperatura).toFixed(1):"—"} °C</small></div><span class="pill ${pillClass(e.status)}">${e.status}</span></div>`).join(""):"<div class='empty'>Nenhum ambiente cadastrado.</div>"}</div></div>
 <div class="card"><div class="chart-head"><div><h3>Alertas recentes</h3><p>Eventos registrados</p></div><button class="btn secondary" onclick="go('alertas')">Ver todos</button></div>${state.alertas.slice(0,4).map(a=>`<div class="alert-line"><i class="dot"></i><div><b>${a.tipo||a.severidade}</b><span>${a.texto}</span></div><time>${a.hora||fmtDate(a.criado_em)}</time></div>`).join("")||"<div class='empty'>Nenhum alerta.</div>"}</div>
 <div class="ml-banner"><div style="font-size:22px">◈</div><div><strong>Análise inteligente ativa</strong><p>O dashboard calcula indicadores e sinaliza leituras acima dos limites configurados.</p></div><div class="ok">✓</div></div></section>`;
}

function ambientesHTML(){
 const env=latestByEnv(), f=state.filtro.toLowerCase();
 const list=env.filter(e=>e.nome.toLowerCase().includes(f));
 return `<section class="content"><div class="section-title"><h2>Ambientes monitorados</h2><p>Consulte as últimas medições e cadastre novos ambientes.</p></div>
 <div class="card"><div class="toolbar"><input id="envSearch" placeholder="Pesquisar ambiente..." value="${state.filtro}"><button class="btn" onclick="showEnvForm()">+ Novo ambiente</button></div><div class="env-grid">${list.map(e=>`<div class="card env"><div class="env-top"><h3>${e.nome}</h3><span class="pill ${pillClass(e.status)}">${e.status}</span></div><div class="env-number"><strong>${e.leitura?Math.round(e.leitura.co2):"—"}</strong><span>ppm CO₂</span></div><p>Temperatura: <b>${e.leitura?Number(e.leitura.temperatura).toFixed(1)+" °C":"—"}</b> · Umidade: <b>${e.leitura?Number(e.leitura.umidade).toFixed(0)+"%":"—"}</b></p><div class="meter"><i style="width:${e.leitura?Math.min(Number(e.leitura.co2)/e.limite_co2*100,100):0}%"></i></div><p class="muted">Limite de atenção: ${e.limite_co2} ppm</p></div>`).join("")||"<div class='empty'>Nenhum ambiente encontrado.</div>"}</div></div>
 <div id="envForm"></div></section>`;
}
function showEnvForm(){document.getElementById("envForm").innerHTML=`<div class="card" style="margin-top:15px"><h3>Novo ambiente</h3><div class="form-grid"><label>Nome<input id="newEnvName" placeholder="Ex.: Sala 05"></label><label>Limite de CO₂<input id="newEnvLimit" type="number" value="1000"></label><div style="display:flex;align-items:end"><button class="btn" onclick="createEnv()">Salvar</button></div><div style="display:flex;align-items:end"><button class="toolbar btn secondary" onclick="document.getElementById('envForm').innerHTML=''">Cancelar</button></div></div></div>`}
async function createEnv(){
 const nome=document.getElementById("newEnvName").value.trim(), limite=Number(document.getElementById("newEnvLimit").value||1000);
 if(!nome)return toast("Informe o nome do ambiente.");
 if(!useSupabase){state.ambientes.push({id:"local-"+Date.now(),nome,limite_co2:limite});toast("Ambiente criado no modo local.");render("ambientes");return}
 const {error}=await db.from("ambientes").insert({nome,limite_co2:limite});if(error)return toast("Erro ao criar ambiente: "+error.message);
 await loadData();toast("Ambiente criado.");render("ambientes");
}

function mlHTML(){
 const m=aggregate(), anomalies=state.leituras.filter(r=>Number(r.co2)>=1000||Number(r.pm25||0)>25).length;
 return `<section class="content"><div class="ml-hero"><div><span class="tag">ANÁLISE DE DADOS</span><h2>Detecção de padrões e anomalias</h2><p>Os indicadores abaixo são calculados diretamente sobre as leituras armazenadas. Para ML real, conecte um modelo posteriormente.</p></div><div class="ml-symbol">◈</div></div><div class="stats-grid"><div class="stat-box"><span class="muted">Classificação</span><strong>${m.co2<1000?"Normal":"Atenção"}</strong><span class="muted">baseada no CO₂ médio</span></div><div class="stat-box"><span class="muted">Anomalias</span><strong>${anomalies}</strong><span class="muted">leituras acima dos critérios</span></div><div class="stat-box"><span class="muted">Amostras</span><strong>${state.leituras.length}</strong><span class="muted">leituras analisadas</span></div></div></section>`;
}
function alertasHTML(){return `<section class="content"><div class="section-title"><h2>Alertas</h2><p>Ocorrências e notificações recentes.</p></div><div class="toolbar"><select id="alertFilter"><option value="">Todos</option><option value="critico">Críticos</option><option value="atencao">Atenção</option><option value="info">Informativos</option></select></div>${state.alertas.map(a=>`<div class="card alert-card"><div class="alert-icon">⚠</div><div><b>${a.tipo||a.severidade}</b><p>${a.texto}</p></div><time>${a.hora||fmtDate(a.criado_em)}</time></div>`).join("")||"<div class='empty'>Nenhum alerta.</div>"}</section>`}

function historicoHTML(){
 const rows=[...state.leituras].sort((a,b)=>new Date(b.coletado_em)-new Date(a.coletado_em));
 return `<section class="content"><div class="section-title"><h2>Histórico de leituras</h2><p>Filtros, gráfico e tabela das medições.</p></div><div class="card"><div class="toolbar"><select id="historyEnv"><option value="">Todos os ambientes</option>${state.ambientes.map(e=>`<option value="${e.id}">${e.nome}</option>`).join("")}</select><input id="historySearch" type="date"><button class="btn secondary" onclick="exportCSV()">Exportar CSV</button></div><div class="chart"><canvas id="historyChart"></canvas></div></div><div class="card" style="margin-top:18px"><div class="table-wrap"><table class="data-table"><thead><tr><th>Ambiente</th><th>Horário</th><th>CO₂</th><th>Temperatura</th><th>Umidade</th><th>PM2.5</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${state.ambientes.find(e=>e.id===r.ambiente_id)?.nome||"—"}</td><td>${fmtDate(r.coletado_em)}</td><td>${r.co2} ppm</td><td>${Number(r.temperatura).toFixed(1)} °C</td><td>${Number(r.umidade).toFixed(0)}%</td><td>${r.pm25??"—"}</td></tr>`).join("")}</tbody></table></div></div></section>`;
}
function configHTML(){return `<section class="content"><div class="card settings"><h2>Configurações</h2><p class="muted">Configurações básicas do dashboard.</p><label>Limite padrão de CO₂<input value="1000 ppm" readonly></label><label>Fonte de dados<input value="${useSupabase?"Supabase":"Modo demonstração"}" readonly></label><label>Atualização<input value="Automática ao abrir a página" readonly></label><p class="muted" style="margin-top:20px">Para usar o banco, configure <b>config.js</b> com a URL e a chave anon/public do Supabase.</p></div></section>`}

function chartOptions(){return {responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:false,grid:{color:"rgba(120,130,150,.12)"}}}}}
function drawMainChart(){
 const ctx=document.getElementById("mainChart");if(!ctx)return;
 const rows=[...state.leituras].sort((a,b)=>new Date(a.coletado_em)-new Date(b.coletado_em)).slice(-30);
 charts.push(new Chart(ctx,{type:"line",data:{labels:rows.map(r=>new Date(r.coletado_em).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})),datasets:[{data:rows.map(r=>r.co2),borderColor:"#ef6354",backgroundColor:"rgba(239,99,84,.12)",fill:true,tension:.35,pointRadius:3}]},options:{...chartOptions(),scales:{...chartOptions().scales,y:{beginAtZero:false,title:{display:true,text:"ppm"}}}}}));
}
function drawHistoryChart(){
 const ctx=document.getElementById("historyChart");if(!ctx)return;
 const rows=[...state.leituras].sort((a,b)=>new Date(a.coletado_em)-new Date(b.coletado_em)).slice(-50);
 charts.push(new Chart(ctx,{type:"bar",data:{labels:rows.map(r=>new Date(r.coletado_em).toLocaleString("pt-BR",{day:"2-digit",hour:"2-digit",minute:"2-digit"})),datasets:[{label:"CO₂ (ppm)",data:rows.map(r=>r.co2),backgroundColor:"#ef6354",borderRadius:5}]},options:chartOptions()}));
}
function exportCSV(){
 const rows=[["Ambiente","Data","CO2","Temperatura","Umidade","PM2.5"],...state.leituras.map(r=>[state.ambientes.find(e=>e.id===r.ambiente_id)?.nome||"",r.coletado_em,r.co2,r.temperatura,r.umidade,r.pm25??""])];
 const csv=rows.map(x=>x.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");
 const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="siqa-historico.csv";a.click();URL.revokeObjectURL(a.href);
}

async function render(page="dashboard"){
 charts.forEach(c=>c.destroy());charts=[];state.page=page;
 document.getElementById("pageTitle").textContent={dashboard:"Dashboard",ambientes:"Ambientes",ml:"Análises ML",alertas:"Alertas",historico:"Histórico",config:"Configurações"}[page]||"Dashboard";
 const app=document.getElementById("app");
 if(page==="dashboard")app.innerHTML=dashboardHTML();
 if(page==="ambientes")app.innerHTML=ambientesHTML();
 if(page==="ml")app.innerHTML=mlHTML();
 if(page==="alertas")app.innerHTML=alertasHTML();
 if(page==="historico")app.innerHTML=historicoHTML();
 if(page==="config")app.innerHTML=configHTML();
 if(page==="dashboard")drawMainChart();if(page==="historico")drawHistoryChart();
 document.getElementById("lastUpdate").innerHTML=`<i></i> Atualizado ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}`;
}
async function go(page){document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));await render(page)}
document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>go(btn.dataset.page)));
document.getElementById("menuBtn").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("closed"));
document.getElementById("themeBtn").addEventListener("click",()=>{document.body.classList.toggle("dark");document.getElementById("themeBtn").textContent=document.body.classList.contains("dark")?"☀ Modo claro":"☾ Modo escuro";localStorage.setItem("siqa-dark",document.body.classList.contains("dark"))});
if(localStorage.getItem("siqa-dark")==="true"){document.body.classList.add("dark");document.getElementById("themeBtn").textContent="☀ Modo claro"}

(async()=>{initDb();await loadData();await render();})();
