let adminUser = null;
let turnoAReprogramar = null;

document.addEventListener('DOMContentLoaded', () => {
  adminUser = verificarSesion('admin');
  if (!adminUser) return;
  document.getElementById('adminName').textContent = adminUser.nombre;
  
  // Manejo del menú lateral
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      switchView(view, item);
    });
  });

  renderAll();
});

function switchView(viewName, navElement) {
  // Ocultar todas las vistas
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
  // Mostrar la seleccionada
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active');
  
  // Actualizar estado del menú
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navElement) navElement.classList.add('active');

  // Actualizar título
  const titles = {
    dashboard: 'Resumen',
    pending: 'Solicitudes de Turno',
    agenda: 'Agenda de Turnos',
    patients: 'Pacientes',
    history: 'Historial'
  };
  document.getElementById('viewTitle').textContent = titles[viewName] || 'Panel';
  
  // Re-renderizar la vista activa
  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'pending') renderPending();
  if (viewName === 'agenda') renderAgenda();
  if (viewName === 'patients') renderPatients();
  if (viewName === 'history') renderHistory();
}

function renderAll() {
  renderDashboard();
  renderPending();
  renderAgenda();
  renderPatients();
  renderHistory();
}

/* ========== VISTA: DASHBOARD ========== */
function renderDashboard() {
  const turnos = getTurnos();
  document.getElementById('statPending').textContent = turnos.filter(t => t.estado === 'pendiente').length;
  document.getElementById('statApproved').textContent = turnos.filter(t => t.estado === 'aprobado').length;
  document.getElementById('statCancelled').textContent = turnos.filter(t => t.estado === 'cancelado').length;

  const notifs = getNotifs().filter(n => n.para === 'admin').slice(-5).reverse();
  const cont = document.getElementById('recentActivity');
  if (notifs.length === 0) {
    cont.innerHTML = '<p class="empty-state">Sin actividad reciente.</p>';
    return;
  }
  cont.innerHTML = notifs.map(n => `
    <div class="list-item">
      <span class="list-time">${new Date(n.fecha).toLocaleString()}</span>
      <span class="list-text">${n.mensaje}</span>
    </div>
  `).join('');
}

/* ========== VISTA: PENDIENTES ========== */
function renderPending() {
  const cont = document.getElementById('pendingList');
  const turnos = getTurnos().filter(t => t.estado === 'pendiente');
  if (turnos.length === 0) {
    cont.innerHTML = '<p class="empty-state">No hay solicitudes pendientes.</p>';
    return;
  }
  cont.innerHTML = turnos.map(t => {
    const c = getCliente(t.cliente);
    return `
      <div class="card card-pending">
        <div class="card-header">
          <span class="badge badge-pending">Pendiente</span>
          <span class="card-date">${t.fecha} · ${t.hora}</span>
        </div>
        <div class="card-body">
          <p class="patient-name">${c?.nombre || t.cliente}</p>
          <p class="patient-contact">Tel: ${c?.telefono || '-'}</p>
        </div>
        <div class="card-actions">
          <button class="btn-sm btn-primary" onclick="aprobar(${t.id})">Aprobar</button>
          <button class="btn-sm btn-outline" onclick="rechazar(${t.id})">Rechazar</button>
        </div>
      </div>
    `;
  }).join('');
}

/* ========== VISTA: AGENDA (Aprobados) ========== */
function renderAgenda() {
  const cont = document.getElementById('agendaList');
  const turnos = getTurnos().filter(t => t.estado === 'aprobado');
  if (turnos.length === 0) {
    cont.innerHTML = '<p class="empty-state">No hay turnos confirmados en la agenda.</p>';
    return;
  }
  cont.innerHTML = turnos.map(t => {
    const c = getCliente(t.cliente);
    return `
      <div class="card card-approved">
        <div class="card-header">
          <span class="badge badge-approved">Confirmado</span>
          <span class="card-date">${t.fecha} · ${t.hora}</span>
        </div>
        <div class="card-body">
          <p class="patient-name">${c?.nombre || t.cliente}</p>
          <p class="patient-contact">Tel: ${c?.telefono || '-'}</p>
        </div>
        <div class="card-actions">
          <button class="btn-sm btn-outline" onclick="abrirReprogramar(${t.id})">Reprogramar</button>
          <button class="btn-sm btn-outline-danger" onclick="cancelarAdmin(${t.id})">Cancelar</button>
          <button class="btn-sm btn-icon" onclick="reenviarWA(${t.id})" title="Reenviar WhatsApp">
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/* ========== VISTA: PACIENTES ========== */
function renderPatients() {
  const cont = document.getElementById('patientsList');
  const usuarios = getUsuarios().filter(u => u.rol === 'cliente');
  cont.innerHTML = usuarios.map(u => `
    <div class="list-item">
      <div>
        <p class="list-text" style="font-weight:600; color: var(--azul-oscuro);">${u.nombre}</p>
        <p class="list-text" style="font-size:0.85rem; color: var(--texto-suave);">${u.telefono || 'Sin teléfono'} · ${u.email || 'Sin email'}</p>
      </div>
    </div>
  `).join('');
}

/* ========== VISTA: HISTORIAL ========== */
function renderHistory() {
  const cont = document.getElementById('historyList');
  const turnos = getTurnos().filter(t => ['cancelado', 'rechazado'].includes(t.estado));
  if (turnos.length === 0) {
    cont.innerHTML = '<p class="empty-state">Sin registros en el historial.</p>';
    return;
  }
  cont.innerHTML = turnos.map(t => {
    const c = getCliente(t.cliente);
    const estadoTexto = t.estado === 'cancelado' ? 'Cancelado' : 'Rechazado';
    const claseBadge = t.estado === 'cancelado' ? 'badge-cancelled' : 'badge-rejected';
    return `
      <div class="list-item">
        <div>
          <span class="badge ${claseBadge}">${estadoTexto}</span>
          <p class="list-text" style="margin-top:4px;">${c?.nombre || t.cliente} · ${t.fecha} ${t.hora}</p>
        </div>
      </div>
    `;
  }).join('');
}

/* ========== ACCIONES ========== */
function aprobar(id) {
  const turnos = getTurnos();
  const t = turnos.find(x => x.id === id);
  if (!t) return;
  t.estado = 'aprobado';
  t.fechaAprobacion = new Date().toISOString();
  saveTurnos(turnos);
  
  addNotif({
    para: t.cliente,
    tipo: 'aprobacion',
    mensaje: `Tu turno del ${t.fecha} a las ${t.hora} fue aprobado.`
  });

  const cliente = getCliente(t.cliente);
  enviarWhatsAppCliente(cliente, t);
  renderAll();
  switchView('pending', document.querySelector('[data-view="pending"]'));
}

function rechazar(id) {
  if (!confirm('¿Rechazar esta solicitud?')) return;
  const turnos = getTurnos();
  const t = turnos.find(x => x.id === id);
  if (!t) return;
  t.estado = 'rechazado';
  saveTurnos(turnos);
  addNotif({ para: t.cliente, tipo: 'rechazo', mensaje: `Tu solicitud del ${t.fecha} ${t.hora} fue rechazada.` });
  renderAll();
  switchView('pending', document.querySelector('[data-view="pending"]'));
}

function cancelarAdmin(id) {
  if (!confirm('¿Cancelar este turno? Se notificará a la doctora.')) return;
  const turnos = getTurnos();
  const t = turnos.find(x => x.id === id);
  if (!t) return;
  t.estado = 'cancelado';
  t.fechaCancelacion = new Date().toISOString();
  saveTurnos(turnos);
  
  addNotif({ para: t.cliente, tipo: 'cancelacion', mensaje: `Tu turno del ${t.fecha} ${t.hora} fue cancelado por el administrador.` });
  addNotif({ para: 'admin', tipo: 'cancelacion_admin', mensaje: `Cancelaste el turno de ${t.cliente} (${t.fecha} ${t.hora}).` });
  
  renderAll();
  switchView('agenda', document.querySelector('[data-view="agenda"]'));
}

/* ========== REPROGRAMACIÓN ========== */
function abrirReprogramar(id) {
  const t = getTurnos().find(x => x.id === id);
  if (!t) {
    alert('No se encontró el turno.');
    return;
  }
  turnoAReprogramar = id;

  document.getElementById('reprogramInfo').textContent =
    `Turno actual: ${t.fecha} a las ${t.hora} — Paciente: ${t.cliente}`;
  document.getElementById('newDate').value = t.fecha;
  document.getElementById('newTime').value = t.hora;

  const modal = document.getElementById('reprogramModal');
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const modal = document.getElementById('reprogramModal');
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  turnoAReprogramar = null;
}

function confirmReprogram() {
  if (!turnoAReprogramar) {
    alert('No hay ningún turno seleccionado.');
    return;
  }
  const nuevaFecha = document.getElementById('newDate').value;
  const nuevaHora = document.getElementById('newTime').value;
  if (!nuevaFecha || !nuevaHora) {
    alert('Completá fecha y hora.');
    return;
  }

  const turnos = getTurnos();
  const t = turnos.find(x => x.id === turnoAReprogramar);
  if (!t) {
    alert('No se encontró el turno.');
    return;
  }

  t.fecha = nuevaFecha;
  t.hora = nuevaHora;
  t.fechaReprogramacion = new Date().toISOString();
  saveTurnos(turnos);

  addNotif({
    para: t.cliente,
    tipo: 'reprogramacion',
    mensaje: `Tu turno fue reprogramado para el ${nuevaFecha} a las ${nuevaHora}.`
  });

  closeModal();
  renderAll();
  switchView('agenda', document.querySelector('[data-view="agenda"]'));
}

/* ========== HELPERS ========== */
function getCliente(usuario) {
  return getUsuarios().find(u => u.usuario === usuario);
}

function enviarWhatsAppCliente(cliente, turno) {
  const texto = encodeURIComponent(
`Hola ${cliente.nombre}!

Tu turno de Reumatología fue CONFIRMADO.

Fecha: ${turno.fecha}
Hora: ${turno.hora}
Profesional: ${turno.doctora}

Importante:
- Llegá 10 minutos antes con DNI y orden médica.
- Podés cancelar hasta 24 hs antes desde la app.
- Cancelaciones con menos de 24 hs deben coordinarse directamente con la doctora.`);
  window.open(`https://wa.me/${cliente.telefono}?text=${texto}`, '_blank');
}

function reenviarWA(id) {
  const t = getTurnos().find(x => x.id === id);
  const c = getCliente(t.cliente);
  enviarWhatsAppCliente(c, t);
}

// Cerrar modal con Escape o clic fuera
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
document.addEventListener('click', (e) => {
  const modal = document.getElementById('reprogramModal');
  if (modal && modal.classList.contains('is-open') && e.target === modal) {
    closeModal();
  }
});