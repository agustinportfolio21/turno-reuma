// Función simple de hash para simular seguridad (NO usar en producción real sin un backend)
function hashPassword(pass) {
  let hash = 0;
  for (let i = 0; i < pass.length; i++) {
    const char = pass.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a entero de 32 bits
  }
  return hash.toString();
}

// Inicializar datos si no existen
function initDB() {
  if (!localStorage.getItem('usuarios')) {
    localStorage.setItem('usuarios', JSON.stringify([
      { usuario: 'admin', password: hashPassword('admin123'), rol: 'admin', nombre: 'Administrador' },
      { usuario: 'juan', password: hashPassword('1234'), rol: 'cliente', nombre: 'Juan Pérez',
        telefono: '5491123456789', email: 'juan@mail.com' }
    ]));
  }

  if (!localStorage.getItem('turnos')) {
    const turnos = [
      { id: 1, fecha: '2026-06-10', hora: '09:00', doctora: 'Dra. Gómez', estado: 'disponible', cliente: null },
      { id: 2, fecha: '2026-06-10', hora: '10:30', doctora: 'Dra. Gómez', estado: 'disponible', cliente: null },
      { id: 3, fecha: '2026-06-12', hora: '11:00', doctora: 'Dra. Gómez', estado: 'disponible', cliente: null },
      { id: 4, fecha: '2026-06-15', hora: '15:00', doctora: 'Dra. Gómez', estado: 'disponible', cliente: null }
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

// Utilidades de privacidad (Ofuscación simple en Base64)
function ofuscar(texto) { return texto ? btoa(texto) : ''; }
function desofuscar(texto) { try { return atob(texto); } catch(e) { return texto; } }

initDB();