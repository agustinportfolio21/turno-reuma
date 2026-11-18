document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      login();
    });
  }
});

function mostrarError(msg) {
  const el = document.getElementById('loginError');
  if (!el) { alert(msg); return; }
  el.textContent = msg;
  el.hidden = false;
}

function login() {
  if (typeof getUsuarios !== 'function') {
    mostrarError('Error interno: no se pudo cargar la base de datos local.');
    return;
  }

  const usuario = document.getElementById('usuario').value.trim();
  const password = document.getElementById('password').value;

  if (!usuario || !password) {
    mostrarError('Completá usuario y contraseña.');
    return;
  }

  // Compara usando el hash
  const user = getUsuarios().find(u => u.usuario === usuario && u.password === hashPassword(password));

  if (!user) {
    mostrarError('Usuario o contraseña incorrectos.');
    return;
  }

  localStorage.setItem('sesion', JSON.stringify(user));

  if (user.rol === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'cliente.html';
  }
}

function verificarSesion(rolRequerido) {
  const sesion = JSON.parse(localStorage.getItem('sesion'));
  if (!sesion || sesion.rol !== rolRequerido) {
    window.location.href = 'index.html';
    return null;
  }
  return sesion;
}

function logout() {
  localStorage.removeItem('sesion');
  window.location.href = 'index.html';
}