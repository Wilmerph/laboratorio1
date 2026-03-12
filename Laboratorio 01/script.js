/* ============================================================
   script.js  -  Simulacion de Procesamiento por Lotes
   Lab 01 - Sistemas Operativos
   ============================================================ */
"use strict";

// ── Configuracion ──────────────────────────────────────────────
const CFG = { maxLote: 10, tMin: 1, tMax: 10, opMin: 1, opMax: 99, expMax: 6 };
const OPS = ['+', '-', '*', '/', '%', '^'];

// ── Estado global ──────────────────────────────────────────────
let procesos = [], lotes = [], corriendo = false;

// ── Referencias DOM ───────────────────────────────────────────
const $ = id => document.getElementById(id);
const D = {
  n: $('input-n'), generar: $('btn-generar'), guardar: $('btn-guardar'),
  iniciar: $('btn-iniciar'), reset: $('btn-reset'), fin: $('btn-fin'),
  loteN: $('lote-actual'), pend: $('lotes-pendientes'), total: $('lotes-total'),
  pid: $('proceso-id'), progreso: $('procesos-progreso'),
  tbody: $('tabla-lotes-body'), barraW: $('barra-relleno'), barraT: $('barra-texto'),
  zonaRes: $('zona-resumen'), resContenido: $('resumen-contenido'),
  msg: $('panel-mensaje'), msgI: $('msg-icono'), msgT: $('msg-texto'),
};

// ── Utilidades ─────────────────────────────────────────────────
const rand    = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const esperar = ms     => new Promise(r => setTimeout(r, ms));

function calcular(op, a, b) {
  if ((op === '/' || op === '%') && b === 0) return null;
  const r = { '+': a+b, '-': a-b, '*': a*b, '/': a/b, '%': a%b, '^': a**b };
  return op === '/' ? parseFloat(r[op].toFixed(4)) : r[op];
}

// Genera un proceso valido; reintenta si la operacion es invalida
function generarProceso(id, lote) {
  let op, a, b, res;
  do {
    op  = OPS[rand(0, OPS.length - 1)];
    a   = rand(CFG.opMin, CFG.opMax);
    b   = op === '^' ? rand(0, CFG.expMax) : rand(CFG.opMin, CFG.opMax);
    res = calcular(op, a, b);
  } while (res === null);
  return { id, lote, op, a, b, tiempo: rand(CFG.tMin, CFG.tMax), estado: 'pendiente', res: null };
}

// Agrupa N procesos en lotes de max CFG.maxLote
function formarLotes(n) {
  procesos = []; lotes = [];
  let id = 1, nl = 1;
  while (id <= n) {
    const lote = [];
    for (let i = 0; i < CFG.maxLote && id <= n; i++, id++)
      lote.push(generarProceso(id, nl));
    lotes.push(lote);
    procesos.push(...lote);
    nl++;
  }
}

// ── UI helpers ─────────────────────────────────────────────────
function msg(texto, tipo = 'info', icono = '▶') {
  D.msg.className    = `stone stone-mensaje msg-${tipo}`;
  D.msgI.textContent = icono;
  D.msgT.textContent = texto;
}

function renderTabla() {
  D.tbody.innerHTML = procesos.map(p => `
    <tr id="fila-${p.id}">
      <td>${p.id}</td><td>${p.lote}</td><td>${p.op}</td>
      <td>${p.a}</td><td>${p.b}</td><td>${p.tiempo}s</td>
      <td id="est-${p.id}">pendiente</td>
      <td id="res-${p.id}">—</td>
    </tr>`).join('');
}

const setEst = (id, t, c='') => { const e=$(`est-${id}`); if(e){e.textContent=t; e.style.color=c;} };
const setRes = (id, v)       => { const e=$(`res-${id}`); if(e){e.textContent=v; e.style.color='#50dd70';} };

function actualizarInd(nl, pend, tot, pid, comp) {
  D.loteN.textContent    = nl;   D.pend.textContent  = pend;
  D.total.textContent    = tot;  D.pid.textContent   = `P${pid}`;
  D.progreso.textContent = `${comp}/${procesos.length}`;
}

// Anima la barra de tiempo segundo a segundo
function animarBarra(t) {
  return new Promise(resolve => {
    let s = 0;
    D.barraW.style.cssText = 'transition:none;width:0%';
    D.barraT.textContent   = `0 / ${t} s`;
    const tick = setInterval(() => {
      s++;
      D.barraW.style.transition = 'width 1s linear';
      D.barraW.style.width      = `${(s/t)*100}%`;
      D.barraT.textContent      = `${s} / ${t} s`;
      if (s >= t) { clearInterval(tick); resolve(); }
    }, 1000);
  });
}

// ── Ejecucion de lotes ─────────────────────────────────────────
async function ejecutarLotes() {
  corriendo = true;
  let comp  = 0;

  for (let i = 0; i < lotes.length; i++) {
    const pend = lotes.length - i - 1;
    msg(`Iniciando Lote ${i+1} de ${lotes.length}`, 'warn', '▣');

    for (const p of lotes[i]) {
      actualizarInd(i+1, pend, lotes.length, p.id, comp);
      setEst(p.id, 'ejecutando', '#ffd040');
      msg(`P${p.id}: ${p.a} ${p.op} ${p.b}  |  ${p.tiempo}s`, 'warn', '⚙');

      await animarBarra(p.tiempo);

      p.res    = calcular(p.op, p.a, p.b);
      p.estado = 'terminado';
      comp++;

      setEst(p.id, 'terminado', '#50dd70');
      setRes(p.id, p.res);
      msg(`P${p.id}: ${p.a} ${p.op} ${p.b} = ${p.res}`, 'exito', '✔');
      D.progreso.textContent = `${comp}/${procesos.length}`;
      await esperar(400);
    }

    msg(`Lote ${i+1} completado. Restantes: ${pend}`, 'exito', '▣');
    if (pend > 0) await esperar(1000);
  }

  corriendo = false;
  msg('Todos los procesos completados.', 'exito', '★');
  mostrarResumen();
  activarPausaFinal();
}

// ── Resumen final ──────────────────────────────────────────────
function mostrarResumen() {
  D.zonaRes.style.display = '';
  D.resContenido.innerHTML = lotes.map((lote, i) =>
    `<p style="color:#ffd040">--- Lote ${i+1} ---</p>` +
    lote.map(p =>
      `<p>P${p.id}: ${p.a} ${p.op} ${p.b} = ${p.res} | ${p.tiempo}s | <span style="color:#50dd70">${p.estado}</span></p>`
    ).join('')
  ).join('<br>');
}

function activarPausaFinal() {
  D.fin.style.display = '';
  const onEnter = e => {
    if (e.key === 'Enter') { D.fin.style.display='none'; document.removeEventListener('keydown', onEnter); }
  };
  document.addEventListener('keydown', onEnter);
}

// ── Guardar JSON ───────────────────────────────────────────────
function guardarJSON() {
  const datos = procesos.map(p => ({
    id: p.id, lote: p.lote, operacion: p.op, a: p.a, b: p.b,
    tiempo_s: p.tiempo, estado: p.estado, resultado: p.res
  }));
  const a = Object.assign(document.createElement('a'), {
    href    : URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })),
    download: 'lotes.json',
  });
  a.click();
  msg('Archivo lotes.json descargado.', 'exito', '💾');
}

// ── Reiniciar ──────────────────────────────────────────────────
function reiniciar() {
  corriendo = false; procesos = []; lotes = [];
  D.tbody.innerHTML = '';
  ['loteN','pend','total','pid','progreso'].forEach(k => D[k].textContent = '—');
  D.barraW.style.width = '0%'; D.barraT.textContent = '0 / 0 s';
  D.zonaRes.style.display = 'none'; D.fin.style.display = 'none';
  D.guardar.disabled = D.iniciar.disabled = true;
  D.generar.disabled = false;
  D.msg.className = 'stone stone-mensaje';
  msg('Listo para iniciar.', 'info', '▶');
}

// ── Eventos ────────────────────────────────────────────────────
D.generar.addEventListener('click', () => {
  if (corriendo) return;
  const n = parseInt(D.n.value, 10);
  if (isNaN(n) || n < 1) return msg('Ingrese un N valido (minimo 1).', 'error', '✘');
  formarLotes(n);
  renderTabla();
  D.guardar.disabled = D.iniciar.disabled = false;
  D.zonaRes.style.display = D.fin.style.display = 'none';
  D.total.textContent = D.pend.textContent = lotes.length;
  D.progreso.textContent = `0/${procesos.length}`;
  msg(`${n} proceso(s) en ${lotes.length} lote(s) generados.`, 'exito', '✔');
});

D.guardar.addEventListener('click', () =>
  procesos.length ? guardarJSON() : msg('Primero genere los procesos.', 'warn', '!')
);

D.iniciar.addEventListener('click', () => {
  if (corriendo || !procesos.length) return;
  D.iniciar.disabled = D.generar.disabled = D.guardar.disabled = true;
  ejecutarLotes().then(() => { D.generar.disabled = D.guardar.disabled = false; });
});

D.reset.addEventListener('click', reiniciar);
D.fin.addEventListener('click', () => D.fin.style.display = 'none');

// ── Init ───────────────────────────────────────────────────────
msg('Listo para iniciar.', 'info', '▶');