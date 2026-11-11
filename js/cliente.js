/* ============================================================
   PANEL DEL CLIENTE - Lógica completa con navegación
   ============================================================ */

let cliente = null;
let turnoClienteReprogramar = null;
let turnoSeleccionadoReserva = null;

/* ---------- INICIALIZACIÓN ---------- */
document.addEventListener('DOMContentLoaded', () => {
  cliente = verificarSesion('cliente');
  if (!cliente) return;

  document.getElementById('nombreCliente').textContent = cliente.nombre;

  // Navegación del sidebar
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      switchView(view, item);
    });
  });

  // Cerrar modal con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModalCliente();
  });

  // Cerrar modal con clic fuera
  document.addEventListener('click', (e) => {
    const modal = document.getElementById('reprogramModal');
    if (modal && modal.classList.contains('is-open') && e.target === modal) {
      closeModalCliente();
    }
  });

  renderAll();
});

/* ---------- NAVEGACIÓN ENTRE VISTAS ---------- */
function switchView(viewName, navElement) {
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navElement) navElement.classList.add('active');

  const titles = {
    inicio: 'Inicio',
    turnos: 'Mis Turnos',
    reservar: 'Reservar Turno',
    historial: 'Historial',
    datos: 'Mis Datos',
    notificaciones: 'Notificaciones'
  };
  document.getElementById('viewTitle').textContent = titles[viewName] || 'Portal';

  // Refrescar vista activa
  if (viewName === 'turnos') renderMisTurnos();
  if (viewName === 'reservar') renderTurnosDisponibles();
  if (viewName === 'historial') renderHistorial();
  if (viewName === 'datos') cargarDatosContacto();
  if (viewName === 'notificaciones') renderNotificaciones();
}

/* ---------- RENDER GENERAL ---------- */
function renderAll() {
  renderMisTurnos();
  renderTurnosDisponibles();
  renderHistorial();
  renderNotificaciones();
  cargarDatosContacto();
}

/* ---------- TURNOS DISPONIBLES (para reservar) ---------- */
function renderTurnosDisponibles() {
  const cont = document.getElementById('listaTurnos');
  const turnos = getTurnos().filter(t => t.estado === 'disponible');

  if (turnos.length === 0) {
    cont.innerHTML = '<p class="empty-state">No hay turnos disponibles por el momento.</p>';
    return;
  }

  cont.innerHTML = turnos.map(t => `
    <div class="card card-available">
      <div class="card-header">
        <span class="card-date">${t.fecha}</span>
        <span class="card-time">${t.hora}</span>
      </div>
      <div class="card-body">
        <p class="doctor-name">${t.doctora}</p>
      </div>
      <div class="card-actions">
        <button class="btn-sm btn-primary" onclick="seleccionarTurno(${t.id})">Seleccionar</button>
      </div>
    </div>
  `).join('');
}

/* ---------- SELECCIONAR TURNO Y MOSTRAR FORMULARIO ---------- */
function seleccionarTurno(id) {
  const t = getTurnos().find(x => x.id === id);
  if (!t) return;

  turnoSeleccionadoReserva = id;

  // Rellenar formulario con datos actuales
  document.getElementById('reservaNombre').value = cliente.nombre || '';
  document.getElementById('reservaTelefono').value = cliente.telefono || '';
  document.getElementById('reservaEmail').value = cliente.email || '';
  document.getElementById('reservaMotivo').value = '';

  document.getElementById('reservaTurnoInfo').textContent =
    `Turno seleccionado: ${t.fecha} a las ${t.hora} — ${t.doctora}`;

  document.getElementById('formReserva').style.display = 'block';
  document.getElementById('msgReserva').style.display = 'none';

  // Scroll al formulario
  document.getElementById('formReserva').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- CANCELAR RESERVA (volver a la lista) ---------- */
function cancelarReserva() {
  turnoSeleccionadoReserva = null;
  document.getElementById('formReserva').style.display = 'none';
}

/* ---------- CONFIRMAR RESERVA CON VALIDACIÓN ---------- */
function confirmarReserva() {
  if (!turnoSeleccionadoReserva) return;

  const telefono = document.getElementById('reservaTelefono').value.trim();
  const email = document.getElementById('reservaEmail').value.trim();
  const motivo = document.getElementById('reservaMotivo').value.trim();
  const orden = document.getElementById('reservaOrden').value;

  // Validaciones
  if (!telefono || telefono.length < 8) {
    mostrarMsgReserva('Ingresá un teléfono válido (mínimo 8 dígitos, con código de país).', 'error');
    return;
  }
  if (!motivo) {
    mostrarMsgReserva('El motivo de la consulta es obligatorio.', 'error');
    return;
  }

  // Actualizar datos del cliente si cambiaron
  if (telefono !== cliente.telefono || email !== cliente.email) {
    const usuarios = getUsuarios();
    const user = usuarios.find(u => u.usuario === cliente.usuario);
    if (user) {
      user.telefono = telefono;
      user.email = email;
      localStorage.setItem('usuarios', JSON.stringify(usuarios));
      cliente.telefono = telefono;
      cliente.email = email;
      localStorage.setItem('sesion', JSON.stringify(cliente));
    }
  }

  // Actualizar turno
  const turnos = getTurnos();
  const turno = turnos.find(x => x.id === turnoSeleccionadoReserva);
  if (!turno || turno.estado !== 'disponible') {
    mostrarMsgReserva('El turno ya no está disponible. Elegí otro.', 'error');
    return;
  }

  turno.estado = 'pendiente';
  turno.cliente = cliente.usuario;
  turno.telefono = telefono;
  turno.motivo = motivo;
  turno.ordenMedica = orden;
  turno.fechaReserva = new Date().toISOString();
  saveTurnos(turnos);

  addNotif({
    para: 'admin',
    tipo: 'nueva_reserva',
    mensaje: `${cliente.nombre} solicitó el turno del ${turno.fecha} ${turno.hora}. Motivo: ${motivo.substring(0, 60)}${motivo.length > 60 ? '...' : ''}`
  });

  mostrarMsgReserva('Solicitud enviada correctamente. Esperá la confirmación del administrador.', 'ok');

  // Reset
  turnoSeleccionadoReserva = null;
  document.getElementById('formReserva').style.display = 'none';

  // Refrescar
  renderAll();

  // Cambiar a "Mis Turnos" después de 1.5s
  setTimeout(() => {
    switchView('turnos', document.querySelector('[data-view="turnos"]'));
  }, 1500);
}

function mostrarMsgReserva(texto, tipo) {
  const el = document.getElementById('msgReserva');
  el.textContent = texto;
  el.style.display = 'block';
  el.style.color = tipo === 'error' ? 'var(--error)' : 'var(--ok)';
  el.style.fontWeight = '500';
}

/* ---------- MIS TURNOS (activos) ---------- */
function renderMisTurnos() {
  const cont = document.getElementById('misTurnos');
  const todos = getTurnos().filter(t => t.cliente === cliente.usuario);
  const hoy = new Date();

  const activos = todos.filter(t => {
    const fechaTurno = new Date(`${t.fecha}T${t.hora}:00`);
    if (['cancelado', 'rechazado'].includes(t.estado)) return false;
    return fechaTurno >= hoy;
  });

  if (activos.length === 0) {
    cont.innerHTML = '<p class="empty-state">No tenés turnos activos. Podés reservar uno nuevo desde la sección "Reservar Turno".</p>';
    return;
  }

  cont.innerHTML = activos.map(t => {
    let badgeClass = '';
    let badgeText = '';
    let botones = '';

    if (t.estado === 'pendiente') {
      badgeClass = 'badge-pending';
      badgeText = 'Pendiente de aprobación';
    } else if (t.estado === 'aprobado') {
      badgeClass = 'badge-approved';
      badgeText = 'Confirmado';
      botones = `
        <button class="btn-sm btn-outline" onclick="abrirReprogramarCliente(${t.id})">Reprogramar</button>
        <button class="btn-sm btn-outline-danger" onclick="cancelar(${t.id})">Cancelar</button>
      `;
    }

    return `
      <div class="card">
        <div class="card-header">
          <span class="badge ${badgeClass}">${badgeText}</span>
          <span class="card-date">${t.fecha} · ${t.hora}</span>
        </div>
        <div class="card-body">
          <p class="doctor-name">${t.doctora}</p>
          ${t.motivo ? `<p style="font-size:0.82rem; color:var(--texto-suave); margin-top:6px;">Motivo: ${t.motivo.substring(0, 80)}${t.motivo.length > 80 ? '...' : ''}</p>` : ''}
        </div>
        <div class="card-actions">${botones}</div>
      </div>
    `;
  }).join('');
}

/* ---------- HISTORIAL ---------- */
function renderHistorial() {
  const cont = document.getElementById('historialTurnos');
  const todos = getTurnos().filter(t => t.cliente === cliente.usuario);
  const hoy = new Date();

  const historial = todos.filter(t => {
    const fechaTurno = new Date(`${t.fecha}T${t.hora}:00`);
    return fechaTurno < hoy || ['cancelado', 'rechazado'].includes(t.estado);
  });

  if (historial.length === 0) {
    cont.innerHTML = '<p class="empty-state">Todavía no tenés turnos en tu historial.</p>';
    return;
  }

  cont.innerHTML = historial.map(t => {
    let badgeClass = '';
    let badgeText = '';

    if (t.estado === 'cancelado') { badgeClass = 'badge-cancelled'; badgeText = 'Cancelado'; }
    else if (t.estado === 'rechazado') { badgeClass = 'badge-rejected'; badgeText = 'Rechazado'; }
    else { badgeClass = 'badge-approved'; badgeText = 'Atendido'; }

    return `
      <div class="card" style="opacity: 0.85;">
        <div class="card-header">
          <span class="badge ${badgeClass}">${badgeText}</span>
          <span class="card-date">${t.fecha} · ${t.hora}</span>
        </div>
        <div class="card-body">
          <p class="doctor-name">${t.doctora}</p>
        </div>
      </div>
    `;
  }).join('');
}

/* ---------- NOTIFICACIONES ---------- */
function renderNotificaciones() {
  const cont = document.getElementById('notificaciones');
  const notifs = getNotifs()
    .filter(n => n.para === cliente.usuario)
    .slice(-10)
    .reverse();

  if (notifs.length === 0) {
    cont.innerHTML = '<p class="empty-state">Sin notificaciones.</p>';
    return;
  }

  cont.innerHTML = notifs.map(n => `
    <div class="list-item">
      <span class="list-time">${new Date(n.fecha).toLocaleString()}</span>
      <span class="list-text">${n.mensaje}</span>
    </div>
  `).join('');
}

/* ---------- DATOS DE CONTACTO ---------- */
function cargarDatosContacto() {
  document.getElementById('telefonoCliente').value = cliente.telefono || '';
  document.getElementById('emailCliente').value = cliente.email || '';
}

function guardarDatos() {
  const nuevoTel = document.getElementById('telefonoCliente').value.trim();
  const nuevoEmail = document.getElementById('emailCliente').value.trim();

  if (!nuevoTel || nuevoTel.length < 8) {
    alert('Ingresá un teléfono válido (mínimo 8 dígitos, con código de país).');
    return;
  }

  const usuarios = getUsuarios();
  const user = usuarios.find(u => u.usuario === cliente.usuario);
  if (!user) return;

  user.telefono = nuevoTel;
  user.email = nuevoEmail;
  localStorage.setItem('usuarios', JSON.stringify(usuarios));

  cliente.telefono = nuevoTel;
  cliente.email = nuevoEmail;
  localStorage.setItem('sesion', JSON.stringify(cliente));

  const msg = document.getElementById('msgDatos');
  msg.style.display = 'block';
  setTimeout(() => { msg.style.display = 'none'; }, 3000);
}

/* ---------- CANCELAR TURNO ---------- */
function cancelar(id) {
  const turnos = getTurnos();
  const t = turnos.find(x => x.id === id);
  if (!t) return;

  const fechaTurno = new Date(`${t.fecha}T${t.hora}:00`);
  const horas = (fechaTurno - new Date()) / (1000 * 60 * 60);

  if (horas < 24) {
    alert('No podés cancelar con menos de 24 hs de anticipación.\nContactá directamente a la doctora.');
    return;
  }

  if (!confirm('¿Seguro querés cancelar este turno?\nUna vez cancelado, el turno queda liberado.')) return;

  t.estado = 'cancelado';
  t.fechaCancelacion = new Date().toISOString();
  saveTurnos(turnos);

  addNotif({
    para: 'admin',
    tipo: 'cancelacion',
    mensaje: `${cliente.nombre} canceló el turno del ${t.fecha} ${t.hora}`
  });

  alert('Turno cancelado. Se notificó al administrador.');
  renderAll();
}

/* ---------- REPROGRAMAR (modal) ---------- */
function abrirReprogramarCliente(id) {
  const t = getTurnos().find(x => x.id === id);
  if (!t) return;

  const fechaTurno = new Date(`${t.fecha}T${t.hora}:00`);
  const horas = (fechaTurno - new Date()) / (1000 * 60 * 60);

  if (horas < 24) {
    alert('No podés reprogramar con menos de 24 hs de anticipación.\nContactá directamente a la doctora.');
    return;
  }

  turnoClienteReprogramar = id;

  document.getElementById('reprogramInfo').textContent =
    `Turno actual: ${t.fecha} a las ${t.hora} — Profesional: ${t.doctora}`;
  document.getElementById('newDateCliente').value = t.fecha;
  document.getElementById('newTimeCliente').value = t.hora;

  const modal = document.getElementById('reprogramModal');
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModalCliente() {
  const modal = document.getElementById('reprogramModal');
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  turnoClienteReprogramar = null;
}

function confirmReprogramCliente() {
  if (!turnoClienteReprogramar) return;

  const nuevaFecha = document.getElementById('newDateCliente').value;
  const nuevaHora = document.getElementById('newTimeCliente').value;

  if (!nuevaFecha || !nuevaHora) {
    alert('Completá fecha y hora.');
    return;
  }

  const turnos = getTurnos();
  const t = turnos.find(x => x.id === turnoClienteReprogramar);
  if (!t) return;

  const fechaOriginal = `${t.fecha} ${t.hora}`;

  t.fecha = nuevaFecha;
  t.hora = nuevaHora;
  t.estado = 'pendiente';
  t.fechaReprogramacion = new Date().toISOString();
  saveTurnos(turnos);

  addNotif({
    para: 'admin',
    tipo: 'reprogramacion_cliente',
    mensaje: `${cliente.nombre} solicitó reprogramar el turno del ${fechaOriginal} al ${nuevaFecha} ${nuevaHora}.`
  });

  closeModalCliente();
  alert('Solicitud de reprogramación enviada.\nEsperá la confirmación del administrador.');
  renderAll();
}