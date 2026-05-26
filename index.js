// index.js — Servidor principal Dulcería Lupita (con módulo de notificaciones integrado)
const express = require('express');
const session = require('express-session');
const path    = require('path');
const multer  = require('multer');
const fs      = require('fs');
const db      = require('./db');

// ─── MULTER: Filtro de archivos (debe ir PRIMERO) ────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg','.jpeg','.png','.webp','.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Solo se permiten imagenes JPG, PNG, WEBP o GIF'));
};

// ─── MULTER: Fotos de productos ──────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads', 'productos');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nombreProducto = (req.body.Nombre || 'producto')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 60);
    cb(null, nombreProducto + '_' + Date.now() + ext);
  }
});
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── MULTER: Fotos de ubicaciones ────────────────────────────────────────────
const ubicacionDir = path.join(__dirname, 'uploads', 'ubicaciones');
if (!fs.existsSync(ubicacionDir)) fs.mkdirSync(ubicacionDir, { recursive: true });

const storageUbicacion = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ubicacionDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'ubic_prod_' + Date.now() + ext);
  }
});
const uploadUbicacion = multer({ storage: storageUbicacion, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const app = express();

// ─── MOTOR DE PLANTILLAS EJS ──────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views', 'notificaciones'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── SESIONES DEL SERVIDOR ────────────────────────────────────────────────────
app.use(session({
  secret: 'dulceria_lupita_secret_2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000, // 8 horas
    httpOnly: true
  }
}));

// ─── MIDDLEWARE DE AUTENTICACIÓN ──────────────────────────────────────────────
// Rutas públicas (no requieren login)
const RUTAS_PUBLICAS = ['/', '/login']; // /register ahora requiere sesión con rol Dueña

function requireAuth(req, res, next) {
  if (RUTAS_PUBLICAS.includes(req.path)) return next();
  // Permitir assets estáticos sin auth
  if (req.path.startsWith('/src') || req.path.startsWith('/img') ||
      req.path.startsWith('/js')  || req.path.startsWith('/css')) return next();
  if (req.session && req.session.usuario) return next();
  // Si es petición API → responder JSON
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'No autenticado. Inicia sesión primero.' });
  }
  // Si es página HTML → redirigir al login
  res.redirect('/');
}

app.use(requireAuth);

app.use('/src',     express.static(path.join(__dirname, 'src')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/js',  express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'src', 'notificaciones-assets', 'css')));
app.use('/js',  express.static(path.join(__dirname, 'src', 'notificaciones-assets', 'js')));

// ==================== HELPERS DE FECHA (módulo notificaciones) ====================
function formatearFecha(fecha) {
  if (!fecha) return '-';
  const meses = [
    'enero','febrero','marzo','abril','mayo','junio',
    'julio','agosto','septiembre','octubre','noviembre','diciembre'
  ];
  const diasSemana = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const date = new Date(fecha);
  return `${diasSemana[date.getDay()]} ${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
}

function formatearFechaHoraMexico() {
  return new Date().toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
}

// ─── RUTA PRINCIPAL ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'views', 'login.html'));
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
app.post('/login', (req, res) => {
  const { user, password } = req.body;
  if (!user || !password) {
    return res.status(400).json({ success: false, mensaje: 'Correo y contraseña requeridos' });
  }
  // Validar formato y longitud del correo antes de consultar la BD
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (user.length > 150 || !emailRe.test(user)) {
    return res.json({ success: false, mensaje: 'Correo electrónico no válido.' });
  }
  if (password.length > 100) {
    return res.json({ success: false, mensaje: 'Contraseña demasiado larga.' });
  }
  const sql = 'SELECT ID_usuario, Nombre, Rol, Correo FROM usuarios WHERE Correo = ? AND contraseña_hash = ?';
  db.query(sql, [user.trim().toLowerCase(), password], (err, results) => {
    if (err) return res.status(500).json({ success: false, mensaje: 'Error del servidor' });
    if (results.length === 0) {
      return res.json({ success: false, mensaje: 'Correo o contraseña incorrectos' });
    }
    req.session.usuario = results[0];
    // Regenerar session ID tras login para prevenir session fixation
    req.session.regenerate((err2) => {
      if (err2) return res.status(500).json({ success: false, mensaje: 'Error de sesión' });
      req.session.usuario = results[0];
      res.json({ success: true, usuario: results[0] });
    });
  });
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// ─── REGISTRO: Solo accesible para la Dueña (sesión activa con rol Dueña) ───
app.get('/register', (req, res) => {
  if (!req.session?.usuario || req.session.usuario.Rol !== 'Dueña') {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'src', 'views', 'register.html'));
});

app.get('/admin',         (req, res) => res.sendFile(path.join(__dirname, 'src', 'views', 'admin.html')));
app.get('/inventario',    (req, res) => res.sendFile(path.join(__dirname, 'src', 'views', 'inventario.html')));
app.get('/devoluciones',  (req, res) => res.sendFile(path.join(__dirname, 'src', 'views', 'devoluciones.html')));
app.get('/configuracion', (req, res) => res.sendFile(path.join(__dirname, 'src', 'views', 'configuracion.html')));

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: NOTIFICACIONES
// Mejoras implementadas:
//   1. Caché en memoria (30 s) para /api/notificaciones — evita N queries por badge
//   2. Umbral dinámico por producto desde alertas_stock (no hardcodeado a 10)
//   3. Devoluciones pendientes desde ajustes_inventario
//   4. Badge actualizado por polling cada 30 s en el frontend
// ═══════════════════════════════════════════════════════════════════════════════

// ─── CACHÉ EN MEMORIA ────────────────────────────────────────────────────────
// Se invalida automáticamente cada 30 segundos
// _notifPending evita queries duplicadas cuando múltiples requests llegan antes de que la caché esté lista
let _notifCache    = null;
let _notifCacheTs  = 0;
let _notifPending  = null;
const CACHE_TTL_MS = 30_000; // 30 segundos

async function obtenerResumenNotificaciones() {
  const ahora = Date.now();
  if (_notifCache && (ahora - _notifCacheTs) < CACHE_TTL_MS) {
    return _notifCache; // devolver caché vigente
  }
  // Si ya hay una consulta en curso, esperar su resultado en vez de lanzar otra
  if (_notifPending) return _notifPending;

  // ── 1. Stock bajo usando umbral DINÁMICO de alertas_stock ──────────────────
  // Si un producto tiene fila en alertas_stock, usa su Stock_minimo.
  // Si no, usa el valor global configurable (default 10).
  const [stockBajo] = await db.query(`
    SELECT p.ID_producto, p.Nombre, p.Stock_anual, p.Precio_unitario,
           COALESCE(a.Stock_minimo, 10) AS Umbral
    FROM productos p
    LEFT JOIN alertas_stock a ON a.ID_producto = p.ID_producto AND a.Estado_alerta = 'Activa'
    WHERE p.Stock_anual <= COALESCE(a.Stock_minimo, 10)
    ORDER BY p.Stock_anual ASC
  `);

  // ── 2. Próximos a caducar (30 días) ────────────────────────────────────────
  const [proximoCaducar] = await db.query(`
    SELECT ID_producto, Nombre, Stock_anual, Fecha_caducidad,
           DATEDIFF(Fecha_caducidad, CURDATE()) AS Dias_restantes
    FROM productos
    WHERE Fecha_caducidad IS NOT NULL
      AND Fecha_caducidad <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      AND Fecha_caducidad >= CURDATE()
    ORDER BY Fecha_caducidad ASC
  `);

  // ── 3. Devoluciones pendientes (ajustes con motivo devolucion) ─────────────
  const [devolucionesPendientes] = await db.query(`
    SELECT a.ID_ajuste, a.ID_producto, a.Cantidad_ajustada, a.Motivo,
           a.Fecha_ajuste, p.Nombre AS Producto
    FROM ajustes_inventario a
    JOIN productos p ON a.ID_producto = p.ID_producto
    WHERE a.Motivo IN ('Devolucion a proveedor','Devolución a proveedor',
                       'Producto dañado','Producto vencido',
                       'Error en pedido','Calidad deficiente')
      AND a.Fecha_ajuste >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    ORDER BY a.Fecha_ajuste DESC
    LIMIT 20
  `);

  const resumen = {
    stockBajo,
    proximoCaducar,
    devolucionesPendientes,
    contadores: {
      stockBajo:            stockBajo.length,
      stockCritico:         stockBajo.filter(p => p.Stock_anual <= Math.floor(p.Umbral / 2)).length,
      proximoCaducar:       proximoCaducar.length,
      caducarUrgente:       proximoCaducar.filter(p => p.Dias_restantes <= 7).length,
      devolucionesPendientes: devolucionesPendientes.length,
      total:                stockBajo.length + proximoCaducar.length + devolucionesPendientes.length
    }
  };

  _notifCache   = resumen;
  _notifCacheTs = Date.now();
  _notifPending = null;
  return resumen;
}

// Forzar invalidación del caché (llamar después de INSERT/UPDATE relevante)
function invalidarCacheNotificaciones() {
  _notifCache   = null;
  _notifCacheTs = 0;
}

// Invalidar caché automáticamente cuando haya cambios en productos, entradas, salidas o ajustes
// (envolvemos los endpoints que mutan datos más adelante con una llamada a esta función)

// ─── RUTA: Dashboard de notificaciones ───────────────────────────────────────
app.get('/notificaciones', async (req, res) => {
  try {
    const [todosProductos] = await db.query('SELECT COUNT(*) as total FROM productos');
    const totalProductos   = todosProductos[0]?.total || 0;

    const [movimientosRecientes] = await db.query(`
      (SELECT 'entrada' as tipo, e.Fecha_entrada as fecha, p.Nombre, e.Cantidad, e.Costo_unitario as valor
       FROM entradas e JOIN productos p ON e.ID_producto = p.ID_producto
       ORDER BY e.Fecha_entrada DESC LIMIT 5)
      UNION ALL
      (SELECT 'salida' as tipo, s.Fecha_salida as fecha, p.Nombre, s.Cantidad, NULL as valor
       FROM salidas s JOIN productos p ON s.ID_producto = p.ID_producto
       ORDER BY s.Fecha_salida DESC LIMIT 5)
      ORDER BY fecha DESC LIMIT 10
    `);

    const { stockBajo, proximoCaducar, devolucionesPendientes, contadores } =
      await obtenerResumenNotificaciones();

    res.render('index', {
      totalProductos,
      stockBajo,
      proximoCaducar,
      devolucionesPendientes,
      movimientosRecientes,
      notificaciones: contadores,
      fechaActual: formatearFechaHoraMexico(),
      formatearFecha
    });
  } catch (error) {
    console.error('Error en /notificaciones:', error);
    res.status(500).send('Error al cargar las notificaciones: ' + error.message);
  }
});

// ─── RUTA: Centro de alertas ──────────────────────────────────────────────────
app.get('/alertas', async (req, res) => {
  try {
    const [productos] = await db.query(`
      SELECT p.*, c.Nombre_categoria, um.Unidad_medida,
             COALESCE(a.Stock_minimo, 10) AS Umbral,
             COALESCE(a.Stock_maximo, 100) AS Umbral_max,
             COALESCE(a.Estado_alerta, 'Sin configurar') AS Estado_alerta
      FROM productos p
      LEFT JOIN categorias c ON p.ID_categoria = c.ID_categoria
      LEFT JOIN unidad_medida um ON p.ID_unidad = um.ID_unidad
      LEFT JOIN alertas_stock a ON a.ID_producto = p.ID_producto AND a.Estado_alerta = 'Activa'
      ORDER BY p.Stock_anual ASC
    `);

    const { stockBajo, proximoCaducar, devolucionesPendientes, contadores } =
      await obtenerResumenNotificaciones();

    const [alertasStock] = await db.query(`
      SELECT a.*, p.Nombre, p.Stock_anual
      FROM alertas_stock a
      JOIN productos p ON a.ID_producto = p.ID_producto
    `);

    res.render('Alertas', {
      productos,
      alertasStock,
      stockBajo,
      proximoCaducar,
      devolucionesPendientes,
      notificaciones: contadores,
      fechaActual: formatearFechaHoraMexico(),
      formatearFecha
    });
  } catch (error) {
    console.error('Error en /alertas:', error);
    res.status(500).send('Error al cargar las alertas: ' + error.message);
  }
});

// ─── API: Resumen JSON para badge (con caché) ─────────────────────────────────
app.get('/api/notificaciones', async (req, res) => {
  try {
    const { stockBajo, proximoCaducar, devolucionesPendientes, contadores } =
      await obtenerResumenNotificaciones();
    res.json({
      success: true,
      stockBajo,
      proximoCaducar,
      devolucionesPendientes,
      ...contadores,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── API: Stock bajo configurable ────────────────────────────────────────────
app.get('/api/stock-bajo/:minimo', async (req, res) => {
  try {
    const minimo = parseInt(req.params.minimo) || 10;
    const [productos] = await db.query(
      'SELECT ID_producto, Nombre, Stock_anual, Precio_unitario FROM productos WHERE Stock_anual <= ? ORDER BY Stock_anual ASC',
      [minimo]
    );
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── API: Próximos a caducar configurable ─────────────────────────────────────
app.get('/api/proximos-caducar/:dias', async (req, res) => {
  try {
    const dias = parseInt(req.params.dias) || 30;
    const [productos] = await db.query(`
      SELECT ID_producto, Nombre, Stock_anual, Fecha_caducidad,
             DATEDIFF(Fecha_caducidad, CURDATE()) AS Dias_restantes
      FROM productos
      WHERE Fecha_caducidad IS NOT NULL
        AND Fecha_caducidad <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        AND Fecha_caducidad >= CURDATE()
      ORDER BY Fecha_caducidad ASC
    `, [dias]);
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: PROVEEDORES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/proveedores', (req, res) => {
  db.query('SELECT * FROM proveedores ORDER BY Nombre', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/proveedores/registrar', (req, res) => {
  const { RFC, Nombre, Contacto, Telefono, Direccion, Gmail } = req.body;
  if (!RFC || !Nombre) return res.status(400).json({ error: 'RFC y Nombre son obligatorios' });
  db.query('INSERT INTO proveedores (RFC, Nombre, Contacto, Telefono, Direccion, Gmail) VALUES (?, ?, ?, ?, ?, ?)',
    [RFC, Nombre, Contacto || '', Telefono || '', Direccion || '', Gmail || ''], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, mensaje: 'Proveedor registrado exitosamente' });
    });
});

app.put('/api/proveedores/:rfc', (req, res) => {
  const { Nombre, Contacto, Telefono, Direccion, Gmail } = req.body;
  if (!Nombre) return res.status(400).json({ error: 'Nombre es obligatorio' });
  db.query('UPDATE proveedores SET Nombre=?, Contacto=?, Telefono=?, Direccion=?, Gmail=? WHERE RFC=?',
    [Nombre, Contacto, Telefono, Direccion, Gmail, req.params.rfc], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, mensaje: 'Proveedor actualizado' });
    });
});

app.delete('/api/proveedores/:rfc', (req, res) => {
  db.query('DELETE FROM proveedores WHERE RFC=?', [req.params.rfc], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, mensaje: 'Proveedor eliminado' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: CATEGORÍAS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/categorias', (req, res) => {
  db.query('SELECT * FROM categorias ORDER BY Nombre_categoria', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/categorias/registrar', (req, res) => {
  const { Nombre_categoria, Descripcion } = req.body;
  if (!Nombre_categoria) return res.status(400).json({ error: 'Nombre_categoria es obligatorio' });
  db.query('INSERT INTO categorias (Nombre_categoria, Descripcion) VALUES (?, ?)',
    [Nombre_categoria, Descripcion || ''], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, id: result.insertId, mensaje: 'Categoría registrada' });
    });
});

app.put('/api/categorias/:id', (req, res) => {
  const { Nombre_categoria, Descripcion } = req.body;
  if (!Nombre_categoria) return res.status(400).json({ error: 'Nombre_categoria es obligatorio' });
  db.query('UPDATE categorias SET Nombre_categoria=?, Descripcion=? WHERE ID_categoria=?',
    [Nombre_categoria, Descripcion, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, mensaje: 'Categoría actualizada' });
    });
});

app.delete('/api/categorias/:id', (req, res) => {
  db.query('DELETE FROM categorias WHERE ID_categoria=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, mensaje: 'Categoría eliminada' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: UNIDADES DE MEDIDA
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/unidades', (req, res) => {
  db.query('SELECT * FROM unidad_medida ORDER BY Tipo_unidad, Unidad_medida', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


// ═══════════════════════════════════════════════════════════════════════
// MÓDULO: PROVEEDORES
// ═══════════════════════════════════════════════════════════════════════

app.get('/api/proveedores', (req, res) => {
  db.query(
    'SELECT RFC, Nombre FROM proveedores ORDER BY Nombre',
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});


// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: PRODUCTOS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/productos', (req, res) => {
  const sql = `
    SELECT p.ID_producto, p.Nombre, p.Descripcion, p.ID_categoria, p.ID_unidad,
           p.Stock_anual, p.Stock_minimo, p.Precio_unitario, p.Fecha_caducidad,
           p.Foto, p.Ubicacion, p.Foto_ubicacion,
           c.Nombre_categoria, u.Unidad_medida
    FROM productos p
    LEFT JOIN categorias c ON p.ID_categoria = c.ID_categoria
    LEFT JOIN unidad_medida u ON p.ID_unidad = u.ID_unidad
    ORDER BY p.Nombre`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get('/api/productos/bajo-stock', (req, res) => {
  db.query('CALL productos_bajo_stock(5)', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

app.get('/api/productos/proximos-caducar', (req, res) => {
  const dias = parseInt(req.query.dias) || 30;
  db.query('CALL productos_proximos_a_caducar(?)', [dias], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

app.post('/api/productos/registrar', upload.single('foto'), (req, res) => {
  const { Nombre, Descripcion, ID_categoria, ID_unidad, Stock_anual, Stock_minimo, Precio_unitario, Fecha_caducidad, Ubicacion } = req.body;
  if (!Nombre || !ID_categoria || !ID_unidad)
    return res.status(400).json({ error: 'Nombre, ID_categoria e ID_unidad son obligatorios' });
  const Foto = req.file ? `/uploads/productos/${req.file.filename}` : null;
  const sql = `INSERT INTO productos
    (Nombre, Descripcion, ID_categoria, ID_unidad, Stock_anual, Stock_minimo, Precio_unitario, Fecha_caducidad, Foto, Ubicacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [Nombre, Descripcion || '', ID_categoria, ID_unidad,
    Stock_anual || 0, Stock_minimo || 0, Precio_unitario || 0.00,
    Fecha_caducidad || null, Foto, Ubicacion || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      invalidarCacheNotificaciones();
      res.json({ ok: true, id: result.insertId, mensaje: 'Producto registrado' });
    });
});

app.put('/api/productos/:id', upload.single('foto'), (req, res) => {
  const { Nombre, Descripcion, ID_categoria, ID_unidad, Stock_anual, Stock_minimo, Precio_unitario, Fecha_caducidad, Ubicacion } = req.body;
  // Si se sube nueva foto, usar la nueva; si no, conservar la existente
  const sql = `UPDATE productos SET
    Nombre=?, Descripcion=?, ID_categoria=?, ID_unidad=?,
    Stock_anual=?, Stock_minimo=?, Precio_unitario=?, Fecha_caducidad=?, Ubicacion=?
    ${req.file ? ", Foto=?" : ""}
    WHERE ID_producto=?`;
  const params = [Nombre, Descripcion, ID_categoria, ID_unidad,
    Stock_anual, Stock_minimo, Precio_unitario, Fecha_caducidad || null, Ubicacion || null];
  if (req.file) params.push(`/uploads/productos/${req.file.filename}`);
  params.push(req.params.id);
  db.query(sql, params, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      invalidarCacheNotificaciones();
      res.json({ ok: true, mensaje: 'Producto actualizado' });
    });
});

app.delete('/api/productos/:id', (req, res) => {
  const id = req.params.id;
  // Verificar si el producto tiene entradas o salidas relacionadas antes de eliminar
  const sqlCheck = `
    SELECT
      (SELECT COUNT(*) FROM entradas          WHERE ID_producto = ?) AS totalEntradas,
      (SELECT COUNT(*) FROM salidas           WHERE ID_producto = ?) AS totalSalidas,
      (SELECT COUNT(*) FROM ajustes_inventario WHERE ID_producto = ?) AS totalAjustes`;
  db.query(sqlCheck, [id, id, id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const { totalEntradas, totalSalidas, totalAjustes } = rows[0];
    if (totalEntradas > 0 || totalSalidas > 0 || totalAjustes > 0) {
      return res.status(400).json({
        error: `No se puede eliminar: el producto tiene ${totalEntradas} entrada(s), ${totalSalidas} salida(s) y ${totalAjustes} ajuste(s) registrados.`
      });
    }
    db.query('DELETE FROM productos WHERE ID_producto=?', [id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ ok: true, mensaje: 'Producto eliminado' });
    });
  });
});

// ─── API: Actualizar solo texto de ubicacion ────────────────────────────────
app.put('/api/productos/:id/ubicacion-texto', (req, res) => {
  const { Ubicacion } = req.body;
  db.query('UPDATE productos SET Ubicacion=? WHERE ID_producto=?',
    [Ubicacion || null, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, mensaje: 'Descripcion de ubicacion actualizada' });
    });
});

// ─── API: Subir/actualizar foto de UBICACION de un producto ──────────────────
app.post('/api/productos/:id/ubicacion-foto', uploadUbicacion.single('foto_ubicacion'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibio imagen de ubicacion' });
  const fotoUbicacion = '/uploads/ubicaciones/' + req.file.filename;
  db.query('UPDATE productos SET Foto_ubicacion=? WHERE ID_producto=?',
    [fotoUbicacion, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      invalidarCacheNotificaciones();
      res.json({ ok: true, foto_ubicacion: fotoUbicacion, mensaje: 'Foto de ubicacion guardada' });
    });
});

// ─── API: Obtener foto de ubicacion de un producto ───────────────────────────
app.get('/api/productos/:id/ubicacion-foto', (req, res) => {
  db.query('SELECT ID_producto, Nombre, Ubicacion, Foto, Foto_ubicacion FROM productos WHERE ID_producto=?',
    [req.params.id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!results.length) return res.status(404).json({ error: 'Producto no encontrado' });
      res.json(results[0]);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: ENTRADAS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/entradas', (req, res) => {
  const sql = `
    SELECT e.*, p.Nombre AS Producto, pr.Nombre AS Proveedor
    FROM entradas e
    LEFT JOIN productos p ON e.ID_producto = p.ID_producto
    LEFT JOIN proveedores pr ON e.RFC_proveedor = pr.RFC
    ORDER BY e.Fecha_entrada DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/entradas/registrar', (req, res) => {
  const { Fecha_entrada, ID_producto, Cantidad, Costo_unitario, RFC_proveedor, ID_usuario } = req.body;
  if (!Fecha_entrada || !ID_producto || !Cantidad || !RFC_proveedor)
    return res.status(400).json({ error: 'Fecha, producto, cantidad y proveedor son obligatorios' });
  db.query('INSERT INTO entradas (Fecha_entrada, ID_producto, Cantidad, Costo_unitario, RFC_proveedor, ID_usuario) VALUES (?, ?, ?, ?, ?, ?)',
    [Fecha_entrada, ID_producto, Cantidad, Costo_unitario || 0, RFC_proveedor, ID_usuario || req.session?.usuario?.ID_usuario || 1],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      invalidarCacheNotificaciones();
      res.json({ ok: true, id: result.insertId, mensaje: 'Entrada registrada y stock actualizado' });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: SALIDAS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/salidas', (req, res) => {
  const sql = `
    SELECT s.*, p.Nombre AS Producto, su.Nombre AS Sucursal
    FROM salidas s
    LEFT JOIN productos p ON s.ID_producto = p.ID_producto
    LEFT JOIN sucursal su ON s.ID_sucursal = su.ID_sucursal
    ORDER BY s.Fecha_salida DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/salidas/registrar', (req, res) => {
  const { Fecha_salida, ID_producto, Cantidad, ID_sucursal, ID_usuario } = req.body;
  if (!Fecha_salida || !ID_producto || !Cantidad || !ID_sucursal)
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  db.query('INSERT INTO salidas (Fecha_salida, ID_producto, Cantidad, ID_sucursal, ID_usuario) VALUES (?, ?, ?, ?, ?)',
    [Fecha_salida, ID_producto, Cantidad, ID_sucursal, ID_usuario || req.session?.usuario?.ID_usuario || 1],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      invalidarCacheNotificaciones();
      res.json({ ok: true, id: result.insertId, mensaje: 'Salida registrada' });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: AJUSTES DE INVENTARIO
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/ajustes', (req, res) => {
  const sql = `
    SELECT a.*,
           p.Nombre  AS Producto,
           pv.Nombre AS Proveedor,
           s.Nombre  AS Sucursal,
           u.Nombre  AS Usuario
    FROM ajustes_inventario a
    LEFT JOIN productos   p  ON a.ID_producto  = p.ID_producto
    LEFT JOIN proveedores pv ON a.RFC_proveedor = pv.RFC
    LEFT JOIN sucursal    s  ON a.ID_sucursal   = s.ID_sucursal
    LEFT JOIN usuarios    u  ON a.ID_usuario    = u.ID_usuario
    ORDER BY a.Fecha_ajuste DESC, a.ID_ajuste DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/ajustes/registrar', (req, res) => {
  const { ID_producto, Cantidad_ajustada, Motivo, Fecha_ajuste, ID_usuario, RFC_proveedor, ID_sucursal } = req.body;
  if (!ID_producto || !Cantidad_ajustada || !Motivo || !Fecha_ajuste)
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  db.query(
    'INSERT INTO ajustes_inventario (ID_producto, Cantidad_ajustada, Motivo, Fecha_ajuste, ID_usuario, RFC_proveedor, ID_sucursal, Estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [ID_producto, Cantidad_ajustada, Motivo, Fecha_ajuste, ID_usuario || req.session?.usuario?.ID_usuario || 1, RFC_proveedor || null, ID_sucursal || null, 'Registrada'],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      invalidarCacheNotificaciones();
      res.json({ ok: true, id: result.insertId, mensaje: 'Devolución registrada' });
    });
});

// Cambiar estado de una devolución
app.put('/api/ajustes/:id/estado', (req, res) => {
  const { Estado } = req.body;
  const estados = ['Registrada','En proceso','Completada','Cancelada'];
  if (!Estado || !estados.includes(Estado))
    return res.status(400).json({ error: 'Estado no válido' });
  db.query('UPDATE ajustes_inventario SET Estado = ? WHERE ID_ajuste = ?',
    [Estado, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, mensaje: 'Estado actualizado' });
    });
});

// Eliminar devolución
app.delete('/api/ajustes/:id', (req, res) => {
  db.query('DELETE FROM ajustes_inventario WHERE ID_ajuste = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, mensaje: 'Devolución eliminada' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: ALERTAS DE STOCK
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/alertas', (req, res) => {
  const sql = `
    SELECT a.*, p.Nombre AS Producto, p.Stock_anual AS Stock_actual
    FROM alertas_stock a
    LEFT JOIN productos p ON a.ID_producto = p.ID_producto`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/alertas/registrar', (req, res) => {
  const { ID_producto, Stock_minimo, Stock_maximo, Estado_alerta } = req.body;
  if (!ID_producto || !Stock_minimo || !Stock_maximo)
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  db.query('INSERT INTO alertas_stock (ID_producto, Stock_minimo, Stock_maximo, Estado_alerta) VALUES (?, ?, ?, ?)',
    [ID_producto, Stock_minimo, Stock_maximo, Estado_alerta || 'Activa'],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, id: result.insertId, mensaje: 'Alerta configurada' });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: SUCURSALES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/sucursales', (req, res) => {
  db.query('SELECT * FROM sucursal ORDER BY Nombre', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/sucursales/registrar', (req, res) => {
  const { Nombre, Contacto } = req.body;
  if (!Nombre) return res.status(400).json({ error: 'Nombre es obligatorio' });
  db.query('INSERT INTO sucursal (Nombre, Contacto) VALUES (?, ?)',
    [Nombre, Contacto || ''], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, id: result.insertId, mensaje: 'Sucursal registrada' });
    });
});

app.put('/api/sucursales/:id', (req, res) => {
  const { Nombre, Contacto } = req.body;
  if (!Nombre) return res.status(400).json({ error: 'Nombre es obligatorio' });
  db.query('UPDATE sucursal SET Nombre=?, Contacto=? WHERE ID_sucursal=?',
    [Nombre, Contacto, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, mensaje: 'Sucursal actualizada' });
    });
});

app.delete('/api/sucursales/:id', (req, res) => {
  db.query('DELETE FROM sucursal WHERE ID_sucursal=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, mensaje: 'Sucursal eliminada' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: USUARIOS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/usuarios', (req, res) => {
  db.query('SELECT ID_usuario, Nombre, Rol, Correo FROM usuarios ORDER BY Nombre', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/usuarios/registrar', (req, res) => {
  // Solo la Dueña puede registrar usuarios
  if (!req.session?.usuario || req.session.usuario.Rol !== 'Dueña') {
    return res.status(403).json({ error: 'Solo la Dueña puede registrar nuevos usuarios.' });
  }
  const { Nombre, Rol, Correo, contraseña_hash } = req.body;
  if (!Nombre || !Rol || !Correo)
    return res.status(400).json({ error: 'Nombre, Rol y Correo son obligatorios' });
  // Validar formato de correo
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(Correo))
    return res.status(400).json({ error: 'El correo electrónico no tiene un formato válido.' });
  // Validar roles permitidos
  const rolesPermitidos = ['Dueña', 'Administrativo', 'Capturista', 'Jefe Almacén'];
  if (!rolesPermitidos.includes(Rol))
    return res.status(400).json({ error: 'Rol no válido.' });
  // Verificar que el correo no esté ya registrado
  db.query('SELECT ID_usuario FROM usuarios WHERE Correo = ?', [Correo], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length > 0) return res.status(400).json({ error: 'Ya existe un usuario con ese correo.' });
    db.query('INSERT INTO usuarios (Nombre, Rol, Correo, contraseña_hash) VALUES (?, ?, ?, ?)',
      [Nombre, Rol, Correo, contraseña_hash || ''], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, id: result.insertId, mensaje: 'Usuario registrado correctamente.' });
      });
  });
});

app.put('/api/usuarios/:id', (req, res) => {
  // Solo la Dueña puede modificar roles
  if (!req.session?.usuario || req.session.usuario.Rol !== 'Dueña') {
    return res.status(403).json({ error: 'Solo la Dueña puede modificar usuarios.' });
  }
  const { Nombre, Rol, Correo } = req.body;
  if (!Nombre || !Correo) return res.status(400).json({ error: 'Nombre y Correo son obligatorios.' });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(Correo)) return res.status(400).json({ error: 'Correo no válido.' });
  const rolesPermitidos = ['Dueña', 'Administrativo', 'Capturista', 'Jefe Almacén'];
  if (!rolesPermitidos.includes(Rol)) return res.status(400).json({ error: 'Rol no válido.' });
  db.query('UPDATE usuarios SET Nombre=?, Rol=?, Correo=? WHERE ID_usuario=?',
    [Nombre, Rol, Correo, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, mensaje: 'Usuario actualizado' });
    });
});

app.delete('/api/usuarios/:id', (req, res) => {
  if (!req.session?.usuario || req.session.usuario.Rol !== 'Dueña') {
    return res.status(403).json({ error: 'Solo la Dueña puede eliminar usuarios.' });
  }
  // No permitir que la Dueña se elimine a sí misma
  if (parseInt(req.params.id) === req.session.usuario.ID_usuario) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta.' });
  }
  db.query('DELETE FROM usuarios WHERE ID_usuario=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, mensaje: 'Usuario eliminado' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: CONFIGURACIÓN DEL SISTEMA
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/configuracion', (req, res) => {
  db.query('SELECT * FROM sucursal WHERE ID_sucursal = 1', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0] || {});
  });
});

app.put('/api/configuracion', (req, res) => {
  const { Nombre, Contacto } = req.body;
  db.query('UPDATE sucursal SET Nombre=?, Contacto=? WHERE ID_sucursal=1',
    [Nombre, Contacto], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, mensaje: 'Configuración actualizada' });
    });
});

app.get('/api/configuracion/resumen', async (req, res) => {
  const sqls = {
    totalProductos:     'SELECT COUNT(*) AS total FROM productos',
    totalProveedores:   'SELECT COUNT(*) AS total FROM proveedores',
    totalUsuarios:      'SELECT COUNT(*) AS total FROM usuarios',
    totalSucursales:    'SELECT COUNT(*) AS total FROM sucursal',
    productosBajoStock: 'SELECT COUNT(*) AS total FROM productos WHERE Stock_anual <= Stock_minimo',
    totalCategorias:    'SELECT COUNT(*) AS total FROM categorias',
    totalUnidades:      'SELECT COUNT(*) AS total FROM unidad_medida',
  };
  try {
    const keys    = Object.keys(sqls);
    const results = await Promise.all(
      keys.map(k => db.promise().query(sqls[k]).then(([rows]) => rows[0].total).catch(() => 0))
    );
    const resumen = {};
    keys.forEach((k, i) => { resumen[k] = results[i]; });
    res.json(resumen);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// REPORTE PDF DEVOLUCIONES
// ═══════════════════════════════════════════════════════════════════════

app.get('/reporte-devoluciones', (req, res) => {

  const { inicio, fin } = req.query;

  let sql = `
    SELECT a.*,
           p.Nombre  AS Producto,
           pv.Nombre AS Proveedor,
           s.Nombre  AS Sucursal,
           u.Nombre  AS Usuario
    FROM ajustes_inventario a
    LEFT JOIN productos p   ON a.ID_producto = p.ID_producto
    LEFT JOIN proveedores pv ON a.RFC_proveedor = pv.RFC
    LEFT JOIN sucursal s    ON a.ID_sucursal = s.ID_sucursal
    LEFT JOIN usuarios u    ON a.ID_usuario = u.ID_usuario
    WHERE 1=1
  `;

  const params = [];

  if (inicio) {
    sql += ' AND DATE(a.Fecha_ajuste) >= ?';
    params.push(inicio);
  }

  if (fin) {
    sql += ' AND DATE(a.Fecha_ajuste) <= ?';
    params.push(fin);
  }

  sql += ' ORDER BY a.Fecha_ajuste DESC';

  db.query(sql, params, (err, results) => {

    if (err) {
      return res.status(500).send('Error generando reporte');
    }

    let html = `
      <html>
      <head>
        <title>Reporte de Devoluciones</title>

        <style>
          body{
            font-family: Arial;
            padding:40px;
          }

          h1{
            text-align:center;
            margin-bottom:30px;
          }

          table{
            width:100%;
            border-collapse:collapse;
          }

          th, td{
            border:1px solid #ccc;
            padding:10px;
            font-size:12px;
          }

          th{
            background:#eee;
          }
        </style>
      </head>

      <body>


<div style="text-align:center; margin-bottom:20px;">
  <img 
    src="http://localhost:3000/img/logo.png" 
    width="120"
    style="margin-bottom:10px;"
  >
      

      <h1>Reporte de Devoluciones</h1>
</div>
      <table>
        <thead>
          <tr>
            <th>Folio</th>
            <th>Proveedor</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>

        <tbody>
    `;

    results.forEach(d => {

      html += `
        <tr>
          <td>DEV-${String(d.ID_ajuste).padStart(4,'0')}</td>
          <td>${d.Proveedor || '--'}</td>
          <td>${d.Producto || '--'}</td>
          <td>${d.Cantidad_ajustada}</td>
          <td>${d.Motivo || '--'}</td>
          <td>${d.Estado || '--'}</td>
          <td>${new Date(d.Fecha_ajuste).toLocaleDateString('es-MX')}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>

      <script>
        window.onload = () => {
          window.print();
        }
      </script>

      </body>
      </html>
    `;

    res.send(html);

  });

});


// ═══════════════════════════════════════════════════════════════════════════════
// INICIO DEL SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════
// ─── RUTA 404 ────────────────────────────────────────────────────────────────
app.use('/img', 
  express.static(path.join(__dirname, 'img')));


app.use((req, res) => {
  // Si es peticion API devolver JSON, si no la pagina 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Ruta no encontrada: ' + req.path });
  }
  res.status(404).sendFile(path.join(__dirname, 'src', 'views', '404.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🍬 Dulcería Lupita — Servidor corriendo en http://localhost:${PORT}`);
  console.log(`   → Login:          http://localhost:${PORT}/`);
  console.log(`   → Admin:          http://localhost:${PORT}/admin`);
  console.log(`   → Inventario:     http://localhost:${PORT}/inventario`);
  console.log(`   → Devoluciones:   http://localhost:${PORT}/devoluciones`);
  console.log(`   → Configuración:  http://localhost:${PORT}/configuracion`);
  console.log(`   → Notificaciones: http://localhost:${PORT}/notificaciones`);
  console.log(`   → Alertas:        http://localhost:${PORT}/alertas\n`);
});

