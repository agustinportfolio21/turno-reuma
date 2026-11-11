// Inicializar datos si no existen
function initDB() {
  if (!localStorage.getItem('usuarios')) {
    localStorage.setItem('usuarios', JSON.stringify([
      { usuario: 'admin', password: 'admin123', rol: 'admin', nombre: 'Administrador' },
      { usuario: 'juan', password: '1234', rol: 'cliente', nombre: 'Juan Pérez',
        telefono: '5491123456789', email: 'juan@mail.com' }
    ]));
  }

  if (!localStorage.getItem('turnos')) {
    // Turnos disponibles de ejemplo
    const hoy = new Date();
    const turnos = [
      { id: 1, fecha: '2025-06-10', hora: '09:00', doctora: 'Dra. Gómez', estado: 'disponible', cliente: null },
      { id: 2, fecha: '2025-06-10', hora: '10:30', doctora: 'Dra. Gómez', estado: 'disponible', cliente: null },
      { id: 3, fecha: '2025-06-12', hora: '11:00', doctora: 'Dra. Gómez', estado: 'disponible', cliente: null },
      { id: 4, fecha: '2025-06-15', hora: '15:00', doctora: 'Dra. Gómez', estado: 'disponible', cliente: null }
    ];
    localStorage.setItem('turnos', JSON.stringify(turnos));
  }

  if (!localStorage.getItem('notificaciones')) {
    localStorage.setItem('notificaciones', JSON.stringify([]));
  }
}

function getUsuarios()  { return JSON.parse(localStorage.getItem('usuarios')); }
function getTurnos()    { return JSON.parse(localStorage.getItem('turnos')); }
function getNotifs()    { return JSON.parse(localStorage.getItem('notificaciones')); }

function saveTurnos(t)  { localStorage.setItem('turnos', JSON.stringify(t)); }
function saveNotifs(n)  { localStorage.setItem('notificaciones', JSON.stringify(n)); }

function addNotif(notif) {
  const notifs = getNotifs();
  notif.id = Date.now();
  notif.fecha = new Date().toISOString();
  notif.leida = false;
  notifs.push(notif);
  saveNotifs(notifs);
}

initDB();