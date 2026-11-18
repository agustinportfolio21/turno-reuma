/* ============================================================
   PANEL DEL CLIENTE - Lógica completa y profesional
   ============================================================ */

let cliente = null;
let turnoClienteReprogramar = null;
let turnoSeleccionadoReserva = null;
let relojInterval = null;
let fotoBase64 = null;

document.addEventListener('DOMContentLoaded', () => {
  cliente = verificarSesion('cliente');
  if (!cliente) return;

  document.getElementById('nombreCliente').textContent = cliente.nombre;
  const primerNombre = cliente.nombre.split(' ')[0];
  const saludoEl = document.getElementById('saludoNombre');
  if (saludoEl) saludoEl.textContent = primerNombre;

  iniciarReloj();

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(item.dataset.view, item);
      document.querySelector('.sidebar').classList.remove('open');
    });
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModalCliente(); });
  document.addEventListener('click', (e) => {
    const modal = document.getElementById('reprogramModal');
    if (modal && modal.classList.contains('is-open') && e.target === modal) closeModalCliente();
  });

  renderAll();

  // Simular actualización en tiempo real (cada 10 seg)
  setInterval(() => {
    if (cliente) {
      renderMisTurnos();
      renderAlertaInicio();
    }
  }, 10000);
});

function iniciarReloj() {
  const el = document.getElementById('fechaHoraActual');
  if (!el) return;
  const actualizar = () => {
    const ahora = new Date();
    const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
    let fechaStr = ahora.toLocaleDateString('es-AR', opciones);
    fechaStr = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1);
    const horaStr = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    el.textContent = `${fechaStr} · ${horaStr} hs`;
  };
  actualizar();
  relojInterval = setInterval(actualizar, 60000);
}

function switchView(viewName, navElement) {
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navElement) navElement.classList.add('active');

  const titles = {
    inicio: 'Inicio', turnos: 'Mis Turnos', reservar: 'Reservar Turno',
    historial: 'Historial', datos: 'Mis Datos', notificaciones: 'Notificaciones'
  };
  document.getElementById('viewTitle').textContent = titles[viewName] || 'Portal';

  if (viewName === 'turnos') renderMisTurnos();
  if (viewName === 'reservar') { renderTurnosDisponibles(); cancelarReserva(); }
  if (viewName === 'historial') renderHistorial();
  if (viewName === 'datos') cargarDatosContacto();
  if (viewName === 'notificaciones') renderNotificaciones();
}

function renderAll() {
  renderMisTurnos();
  renderTurnosDisponibles();
  renderHistorial();
  renderNotificaciones();
  cargarDatosContacto();
  renderAlertaInicio();
}

/* ---------- ALERTA EN INICIO ---------- */
function renderAlertaInicio() {
  const alertaEl = document.getElementById('alertaInicioPendiente');
  if (!alertaEl) return;

  const pendientes = getTurnos().filter(t => t.cliente === cliente.usuario && t.estado === 'pendiente');

  if (pendientes.length > 0) {
    alertaEl.style.display = 'block';
    alertaEl.innerHTML = `
      <div class="alert-pending">
        <div class="alert-pending-icon">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 28px; height: 28px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <div class="alert-pending-text">
          <strong>Tenés ${pendientes.length} turno(s) esperando confirmación</strong>
          <p>La secretaria está revisando tu solicitud. Te avisaremos por WhatsApp cuando esté confirmado.</p>
        </div>
      </div>
    `;
  } else {
    alertaEl.style.display = 'none';
  }
}

/* ---------- TURNOS DISPONIBLES ---------- */
function renderTurnosDisponibles() {
  const cont = document.getElementById('listaTurnos');
  if (!cont) return;
  const turnos = getTurnos().filter(t => t.estado === 'disponible');
  
  if (turnos.length === 0) { cont.innerHTML = '<p class="empty-state">No hay turnos disponibles por el momento.</p>'; return; }
  
  cont.innerHTML = turnos.map(t => `
    <div class="card card-available" id="card-${t.id}">
      <div class="card-header"><span class="card-date">${t.fecha} <span>${t.hora} hs</span></span></div>
      <div class="card-body">
        <p class="doctor-name">${t.doctora}</p>
        <p style="font-size: 0.8rem; color: var(--texto-suave); margin-top: 4px;">Consulta de reumatología</p>
      </div>
      <div class="card-actions"><button class="btn-sm btn-primary" onclick="seleccionarTurno(${t.id})">Seleccionar</button></div>
    </div>
  `).join('');
}

function seleccionarTurno(id) {
  const t = getTurnos().find(x => x.id === id);
  if (!t || t.estado !== 'disponible') { alert('El turno ya no está disponible.'); renderTurnosDisponibles(); return; }
  
  turnoSeleccionadoReserva = id;
  document.querySelectorAll('.card-available').forEach(c => c.classList.remove('selected'));
  const cardEl = document.getElementById(`card-${id}`);
  if (cardEl) cardEl.classList.add('selected');
  
  document.getElementById('reservaNombre').value = cliente.nombre || '';
  document.getElementById('reservaTelefono').value = cliente.telefono || '';
  document.getElementById('reservaEmail').value = cliente.email || '';
  document.getElementById('reservaMotivo').value = '';
  document.getElementById('reservaTurnoInfo').innerHTML = `📅 Turno seleccionado: <b>${t.fecha}</b> a las <b>${t.hora} hs</b> — ${t.doctora}`;
  document.getElementById('formReserva').style.display = 'block';
  document.getElementById('msgReserva').style.display = 'none';
  document.getElementById('formReserva').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelarReserva() {
  turnoSeleccionadoReserva = null;
  document.querySelectorAll('.card-available').forEach(c => c.classList.remove('selected'));
  const form = document.getElementById('formReserva');
  if (form) form.style.display = 'none';
}

function confirmarReserva() {
  if (!turnoSeleccionadoReserva) return;
  const telefono = document.getElementById('reservaTelefono').value.trim();
  const email = document.getElementById('reservaEmail').value.trim();
  const motivo = document.getElementById('reservaMotivo').value.trim();
  const orden = document.getElementById('reservaOrden').value;

  if (!telefono || telefono.length < 8) { mostrarMsgReserva('Ingresá un teléfono válido.', 'error'); return; }
  if (!motivo) { mostrarMsgReserva('El motivo es obligatorio.', 'error'); return; }

  if (telefono !== cliente.telefono || email !== cliente.email) {
    const usuarios = getUsuarios();
    const user = usuarios.find(u => u.usuario === cliente.usuario);
    if (user) {
      user.telefono = telefono; user.email = email;
      localStorage.setItem('usuarios', JSON.stringify(usuarios));
      cliente.telefono = telefono; cliente.email = email;
      localStorage.setItem('sesion', JSON.stringify(cliente));
    }
  }

  const turnos = getTurnos();
  const turno = turnos.find(x => x.id === turnoSeleccionadoReserva);
  if (!turno || turno.estado !== 'disponible') { mostrarMsgReserva('El turno ya fue reservado.', 'error'); renderTurnosDisponibles(); return; }

  turno.estado = 'pendiente'; turno.cliente = cliente.usuario; turno.telefono = telefono;
  turno.motivo = motivo; turno.ordenMedica = orden; turno.fechaReserva = new Date().toISOString();
  saveTurnos(turnos);
  addNotif({ para: 'admin', tipo: 'nueva_reserva', mensaje: `${cliente.nombre} solicitó el turno del ${turno.fecha} ${turno.hora}.` });

  mostrarMsgReserva('✅ Solicitud enviada. Esperá la confirmación.', 'ok');
  turnoSeleccionadoReserva = null;
  document.getElementById('formReserva').style.display = 'none';
  document.querySelectorAll('.card-available').forEach(c => c.classList.remove('selected'));
  renderAll();
  setTimeout(() => { switchView('turnos', document.querySelector('[data-view="turnos"]')); }, 2000);
}

function mostrarMsgReserva(texto, tipo) {
  const el = document.getElementById('msgReserva');
  el.textContent = texto; el.style.display = 'block';
  el.style.color = tipo === 'error' ? 'var(--error)' : 'var(--ok)';
  el.style.fontWeight = '500';
}

/* ---------- MIS TURNOS ---------- */
function renderMisTurnos() {
  const cont = document.getElementById('misTurnos');
  if (!cont) return;
  const todos = getTurnos().filter(t => t.cliente === cliente.usuario);
  const hoy = new Date();
  const activos = todos.filter(t => {
    const fechaTurno = new Date(`${t.fecha}T${t.hora}:00`);
    if (['cancelado', 'rechazado'].includes(t.estado)) return false;
    return fechaTurno >= hoy;
  });

  if (activos.length === 0) { cont.innerHTML = '<p class="empty-state">No tenés turnos activos reservados.</p>'; return; }

  cont.innerHTML = activos.map(t => {
    if (t.estado === 'aprobado') {
      return `
        <div class="card checkin-active">
          <div class="checkin-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
          <h3 class="checkin-title">¡Turno Confirmado!</h3>
          <p class="checkin-subtitle">${t.fecha} a las ${t.hora} hs — ${t.doctora}</p>
          <div class="card-actions" style="justify-content: center;">
            <button class="btn-sm btn-outline" onclick="abrirReprogramarCliente(${t.id})">Reprogramar</button>
            <button class="btn-sm btn-outline-danger" onclick="cancelar(${t.id})">Cancelar</button>
          </div>
        </div>`;
    }
    return `
      <div class="card" style="border-left: 4px solid var(--warn);">
        <div class="card-header"><span class="badge badge-pending">Esperando confirmación</span><span class="card-date">${t.fecha} <span>${t.hora} hs</span></span></div>
        <div class="card-body">
          <p class="doctor-name">${t.doctora}</p>
          <p style="font-size:0.8rem; color:var(--texto-suave); margin-top:8px;">La secretaria revisará tu solicitud a la brevedad.</p>
        </div>
      </div>`;
  }).join('');
}

/* ---------- HISTORIAL (TABLA) ---------- */
function renderHistorial() {
  const tbody = document.getElementById('historialTableBody');
  if (!tbody) return;
  
  const todos = getTurnos().filter(t => t.cliente === cliente.usuario);
  const hoy = new Date();

  const historial = todos.filter(t => {
    const fechaTurno = new Date(`${t.fecha}T${t.hora}:00`);
    return fechaTurno < hoy || ['cancelado', 'rechazado'].includes(t.estado);
  });

  if (historial.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--texto-suave); padding: 24px;">Todavía no tenés turnos en tu historial.</td></tr>';
    return;
  }

  // Ordenar por fecha descendente
  historial.sort((a, b) => new Date(`${b.fecha}T${b.hora}:00`) - new Date(`${a.fecha}T${a.hora}:00`));

  tbody.innerHTML = historial.map(t => {
    let badgeClass = '', badgeText = '';
    if (t.estado === 'cancelado') { badgeClass = 'badge-cancelled'; badgeText = 'Cancelado'; }
    else if (t.estado === 'rechazado') { badgeClass = 'badge-rejected'; badgeText = 'Rechazado'; }
    else { badgeClass = 'badge-approved'; badgeText = 'Atendido'; }

    return `
      <tr>
        <td>${t.fecha}</td>
        <td>${t.hora} hs</td>
        <td>${t.doctora}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
      </tr>
    `;
  }).join('');
}

/* ---------- NOTIFICACIONES ---------- */
function renderNotificaciones() {
  const cont = document.getElementById('notificaciones');
  if (!cont) return;
  const notifs = getNotifs().filter(n => n.para === cliente.usuario).slice(-10).reverse();
  if (notifs.length === 0) { cont.innerHTML = '<p class="empty-state">Sin notificaciones.</p>'; return; }
  cont.innerHTML = notifs.map(n => `
    <div class="list-item">
      <span class="list-time">${new Date(n.fecha).toLocaleString()}</span>
      <span class="list-text">${n.mensaje}</span>
    </div>`).join('');
}

/* ---------- DATOS DE CONTACTO ---------- */
function cargarDatosContacto() {
  if (!document.getElementById('datoNombre')) return;
  
  document.getElementById('datoNombre').value = cliente.nombre || '';
  document.getElementById('datoDni').value = desofuscar(cliente.dni || '');
  document.getElementById('datoNacimiento').value = cliente.fechaNacimiento || '';
  document.getElementById('datoObraSocial').value = cliente.obraSocial || '';
  document.getElementById('datoTelefono').value = cliente.telefono || '';
  document.getElementById('datoEmail').value = cliente.email || '';
  document.getElementById('datoDireccion').value = cliente.direccion || '';
  document.getElementById('datoEmergencia').value = cliente.emergencia || '';
  document.getElementById('datoAlergias').value = desofuscar(cliente.alergias || '');

  const preview = document.getElementById('profilePreview');
  const headerAvatar = document.getElementById('headerAvatar');
  if (cliente.foto) {
    preview.innerHTML = `<img src="${cliente.foto}" alt="Perfil">`;
    headerAvatar.innerHTML = `<img src="${cliente.foto}" alt="Perfil">`;
  } else {
    const iniciales = cliente.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    preview.innerHTML = `<span>${iniciales}</span>`;
    headerAvatar.innerHTML = `<span>${iniciales}</span>`;
  }
}

function previsualizarFoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { alert('La imagen es muy pesada. Máximo 2MB.'); event.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    fotoBase64 = e.target.result;
    document.getElementById('profilePreview').innerHTML = `<img src="${fotoBase64}" alt="Preview">`;
  };
  reader.readAsDataURL(file);
}

function guardarDatos() {
  const nuevoTel = document.getElementById('datoTelefono').value.trim();
  const nuevoDni = document.getElementById('datoDni').value.trim();
  if (!nuevoTel || nuevoTel.length < 8) { alert('Ingresá un teléfono válido.'); return; }
  if (!nuevoDni) { alert('El DNI es obligatorio.'); return; }

  const datosActualizados = {
    ...cliente,
    dni: ofuscar(nuevoDni),
    fechaNacimiento: document.getElementById('datoNacimiento').value,
    obraSocial: document.getElementById('datoObraSocial').value.trim(),
    telefono: nuevoTel,
    email: document.getElementById('datoEmail').value.trim(),
    direccion: document.getElementById('datoDireccion').value.trim(),
    emergencia: document.getElementById('datoEmergencia').value.trim(),
    alergias: ofuscar(document.getElementById('datoAlergias').value.trim())
  };

  if (fotoBase64) datosActualizados.foto = fotoBase64;

  const usuarios = getUsuarios();
  const index = usuarios.findIndex(u => u.usuario === cliente.usuario);
  if (index !== -1) {
    usuarios[index] = datosActualizados;
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
  }
  cliente = datosActualizados;
  localStorage.setItem('sesion', JSON.stringify(cliente));
  cargarDatosContacto();
  
  const msg = document.getElementById('msgDatos');
  msg.style.display = 'block';
  setTimeout(() => { msg.style.display = 'none'; }, 3000);
  fotoBase64 = null;
}

/* ---------- CANCELAR TURNO ---------- */
function cancelar(id) {
  const turnos = getTurnos(); const t = turnos.find(x => x.id === id);
  if (!t) return;
  const fechaTurno = new Date(`${t.fecha}T${t.hora}:00`);
  const horas = (fechaTurno - new Date()) / (1000 * 60 * 60);
  if (horas < 24) { alert('No podés cancelar con menos de 24 hs de anticipación.'); return; }
  if (!confirm('¿Seguro querés cancelar este turno?')) return;
  t.estado = 'cancelado'; t.fechaCancelacion = new Date().toISOString(); saveTurnos(turnos);
  addNotif({ para: 'admin', tipo: 'cancelacion', mensaje: `${cliente.nombre} canceló el turno del ${t.fecha} ${t.hora}` });
  alert('Turno cancelado.'); renderAll();
}

/* ---------- REPROGRAMAR ---------- */
function abrirReprogramarCliente(id) {
  const t = getTurnos().find(x => x.id === id);
  if (!t) return;
  const fechaTurno = new Date(`${t.fecha}T${t.hora}:00`);
  const horas = (fechaTurno - new Date()) / (1000 * 60 * 60);
  if (horas < 24) { alert('No podés reprogramar con menos de 24 hs de anticipación.'); return; }
  turnoClienteReprogramar = id;
  document.getElementById('reprogramInfo').textContent = `Turno actual: ${t.fecha} a las ${t.hora} — Profesional: ${t.doctora}`;
  document.getElementById('newDateCliente').value = t.fecha;
  document.getElementById('newTimeCliente').value = t.hora;
  const modal = document.getElementById('reprogramModal');
  modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false');
}

function closeModalCliente() {
  const modal = document.getElementById('reprogramModal');
  modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); turnoClienteReprogramar = null;
}

function confirmReprogramCliente() {
  if (!turnoClienteReprogramar) return;
  const nuevaFecha = document.getElementById('newDateCliente').value;
  const nuevaHora = document.getElementById('newTimeCliente').value;
  if (!nuevaFecha || !nuevaHora) { alert('Completá fecha y hora.'); return; }
  const turnos = getTurnos(); const t = turnos.find(x => x.id === turnoClienteReprogramar);
  if (!t) return;
  t.fecha = nuevaFecha; t.hora = nuevaHora; t.estado = 'pendiente'; t.fechaReprogramacion = new Date().toISOString();
  saveTurnos(turnos);
  addNotif({ para: 'admin', tipo: 'reprogramacion_cliente', mensaje: `${cliente.nombre} solicitó reprogramar turno.` });
  closeModalCliente(); alert('Solicitud de reprogramación enviada.'); renderAll();
}