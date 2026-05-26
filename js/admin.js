// js/admin.js
function cerrarSesion() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        sessionStorage.removeItem('usuario');
        window.location.href = '/';
    }
}
