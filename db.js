// db.js — Conexión a MySQL con pool para Dulcería Lupita
// Exporta el promisePool (mysql2/promise) para uso con async/await Y callbacks
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',          // Cambia si tu usuario es diferente
  password: 'Thebeatles1995*',          // Cambia si tienes contraseña
  database: 'dulceria_lupitabd',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8'
});

// Verificar conexión al arrancar
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err.message);
    return;
  }
  console.log('✅ Conectado exitosamente a MySQL — dulceria_lupitabd');
  connection.release();
});

// promisePool para async/await (módulo notificaciones)
const promisePool = pool.promise();

// Adjuntar query con callback para compatibilidad con el código original de index.js
// Uso: db.query(sql, params, callback) — igual que antes
promisePool.query = function(sql, params, callback) {
  if (typeof params === 'function') {
    // db.query(sql, callback)
    callback = params;
    params = [];
  }
  if (typeof callback === 'function') {
    // Modo callback (compatibilidad con código original)
    pool.query(sql, params, callback);
  } else {
    // Modo promesa (async/await del módulo notificaciones)
    return pool.promise().query(sql, params);
  }
};

module.exports = promisePool;
