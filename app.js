// ======== Utilidades ========
const qs = new URLSearchParams(location.search);
function getParam(...names){ for(const n of names){ const v = qs.get(n); if(v!==null && v!=='') return v; } return null; }
// === CONFIG WhatsApp (SOLO DEMO; el token queda visible en el front) ===
// ⚠️ Reemplaza por tus valores reales
const WA_PHONE_NUMBER_ID = '647681155100386';  // tu phone_number_id
const WA_TOKEN = 'EAACom8rnztUBPKTuf0XRllei80r927kO0jM5C3fSLvGYoyDxI033ZBXXgudcsVoVqC1zFOOQxvZCY4eyHstdlBlwveI1Uq6QIHxXtqVUvNUl4BBfZBdfzKxPV1Qp6ULecddnCpOpBcVOXfCom3ArAF3hfQiP7rEMCHBBcKGeOykg2yoQZAqcDznw6UEvAxGyB8EGpZBgarWLT9B47ajv9fhILYpDPlp9ziUwzjcFZCTlG747splnitSATeF5ob9wZDZD';           // tu token de acceso


function parseAmount(value){
  if (typeof value === 'number') return value;
  let s = String(value || '').trim();
  if(!s) return 0;
  s = s.replace(/\s/g, '');
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && !hasDot){
    s = s.replace(/\./g,'');
    s = s.replace(',', '.');
  } else if (hasComma && hasDot){
    if (s.lastIndexOf(',') > s.lastIndexOf('.')){ // coma decimal
      s = s.replace(/\./g,'');
      s = s.replace(',', '.');
    } else { // punto decimal
      s = s.replace(/,/g,'');
    }
  } else {
    s = s.replace(/,/g,'');
  }
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function formatCurrency(value, currency){
  const num = parseAmount(value);
  const cur = (currency || getParam('currency') || 'CRC').toUpperCase();
  const locales = { CRC:'es-CR', MXN:'es-MX', USD:'en-US', EUR:'es-ES', COP:'es-CO', ARS:'es-AR', CLP:'es-CL', PEN:'es-PE' };
  return new Intl.NumberFormat(locales[cur]||'es-CR', { style:'currency', currency:cur, minimumFractionDigits:2 }).format(num || 0);
}
function maskPhone(p){ if(!p) return ''; const s = p.replace(/\D/g,''); if(s.length < 6) return ''; return ` al **${s.slice(-10)}**`; }

// Luhn check (tarjeta)
function luhnCheck(num){
  const s = String(num||'').replace(/\s+/g, '');
  if(!/^\d{12,19}$/.test(s)) return false;
  let sum=0, dbl=false; for(let i=s.length-1;i>=0;i--){ let d=+s[i]; if(dbl){ d*=2; if(d>9) d-=9; } sum+=d; dbl=!dbl; } return sum%10===0;
}
function formatCardNumber(v){ return String(v||'').replace(/\D/g,'').slice(0,19).replace(/(.{4})/g,'$1 ').trim(); }
function formatExp(v){ v=String(v||'').replace(/\D/g,'').slice(0,4); if(v.length>=3) v = v.slice(0,2)+"/"+v.slice(2); return v; }
function validExp(v){
  const m = /^(\d{2})\/(\d{2})$/.exec(String(v || '').trim());
  if (!m) return false;
  const MM = parseInt(m[1],10);
  const YY = parseInt(m[2],10);
  if (MM < 1 || MM > 12) return false;
  const now = new Date();
  const y   = now.getFullYear() % 100; // últimos 2 dígitos del año actual
  const mth = now.getMonth() + 1;      // mes actual (1-12)
  if (YY > y) return true;     // año futuro
  if (YY < y) return false;    // año pasado
  return MM >= mth;            // mismo año: mes no pasado
}

// ======== Carga de parámetros ========
const datos = {
  cliente: getParam('cliente','name','customer'),
  ventaId: getParam('ventaId','id','saleId','venta'),
  monto: getParam('monto','amount','total'),
  telefono: getParam('telefono','phone','whatsapp'),
  redirect: getParam('redirect') || 'exito.html'
};

// Pintar UI
const amountEl = document.getElementById('amount');
const saleIdEl = document.getElementById('saleId');
const customerEl = document.getElementById('customer');
const waToEl = document.getElementById('waTo');
amountEl.textContent = formatCurrency(datos.monto);
saleIdEl.textContent = datos.ventaId || '—';
customerEl.textContent = `Cliente: ${datos.cliente || '—'}`;
waToEl.textContent = datos.telefono ? maskPhone(datos.telefono) : '';

// Validación de parámetros mínimos
const banner = document.getElementById('banner');
const missing = [];
if(!datos.monto) missing.push('monto');
if(!datos.ventaId) missing.push('ID de venta');
if(!datos.cliente) missing.push('nombre del cliente');
if(missing.length){
  banner.className = 'banner warn';
  banner.textContent = `Faltan parámetros en la URL: ${missing.join(', ')}. Puedes probar con ?cliente=Juan&ventaId=ABC123&monto=2500&telefono=50661091434`;
}

// ======== Formateo de inputs ========
const numberInput = document.getElementById('cardNumber');
const expInput = document.getElementById('exp');
const cvvInput = document.getElementById('cvv');

numberInput.addEventListener('input', (e)=>{ e.target.value = formatCardNumber(e.target.value); });
expInput.addEventListener('input', (e)=>{ e.target.value = formatExp(e.target.value); });
cvvInput.addEventListener('input', (e)=>{ e.target.value = e.target.value.replace(/\D/g,'').slice(0,4); });

// ======== Envío del formulario ========
const form = document.getElementById('payForm');
const payBtn = document.getElementById('payBtn');
const numError = document.getElementById('numError');
const expError = document.getElementById('expError');
const cvvError = document.getElementById('cvvError');

form.addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  // Validaciones rápidas
  const numOk = luhnCheck(numberInput.value);
  const expOk = validExp(expInput.value);
  const cvvOk = /^\d{3,4}$/.test(cvvInput.value);
  numError.style.display = numOk ? 'none' : 'block';
  expError.style.display = expOk ? 'none' : 'block';
  cvvError.style.display = cvvOk ? 'none' : 'block';
  if(!(numOk && expOk && cvvOk)) return;

  const original = payBtn.textContent;
  payBtn.disabled = true; payBtn.textContent = 'Procesando…';

  // Aquí iría la integración real con tu pasarela de pago
  await new Promise(r=>setTimeout(r, 1200)); // simulación

  // ===== WhatsApp =====
  try{ await enviarWhatsApp({ telefono: datos.telefono, cliente: datos.cliente, ventaId: datos.ventaId, monto: datos.monto }); }catch(err){ console.warn('WhatsApp no enviado:', err); }

  // Redirigir a página de éxito (pasa parámetros para mostrar el resumen)
const params = new URLSearchParams({
    cliente: datos.cliente || '',
    ventaId: datos.ventaId || '',
    monto: parseAmount(datos.monto || 0),
    currency: (getParam('currency') || 'CRC'),
    telefono: datos.telefono || ''  
});
  const sep = datos.redirect.includes('?') ? '&' : '?';
  location.href = datos.redirect + sep + params.toString();
  payBtn.textContent = original; // por si la redirección tarda
});

// === Enviar WhatsApp vía TU API en Azure (recomendado para prod) ===
async function enviarWhatsApp({ telefono, cliente, ventaId, monto }) {
  if (!telefono) return;

  const API_URL = 'https://apuestaspruebas.azurewebsites.net/api/WhatsApp/send';

  // Normaliza a E.164 (solo dígitos, incluye código país)
  const to = String(telefono).replace(/\D/g, '');
  const message = `Hola ${cliente || ''}! Tu pago de ${formatCurrency(monto)} (ID ${ventaId}) fue recibido. ¡Gracias por tu compra!`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000); // timeout 12s

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message, ventaId, monto: parseAmount(monto) }),
      signal: controller.signal
    });
    clearTimeout(t);

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      console.warn('API WhatsApp error:', resp.status, txt);
      // (Opcional) Fallback a wa.me:
      // window.open(`https://wa.me/${to}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    }
  } catch (err) {
    console.warn('API WhatsApp fallo/timeout:', err?.message || err);
    // (Opcional) Fallback a wa.me:
    // window.open(`https://wa.me/${to}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }
}