# Dulcería Lupita — Sistema de Inventario

## 🚀 Cómo correr el proyecto

### 1. Base de datos
1. Abre **phpMyAdmin** o MySQL Workbench
2. Crea la base de datos: `CREATE DATABASE dulceria_lupitabd;`
3. Importa el archivo: `BD-Lupita.sql`

### 2. Configurar credenciales de MySQL
Abre `db.js` y ajusta si es necesario:
```js
user: 'root',   // tu usuario
password: '',   // tu contraseña
```

### 3. Instalar dependencias y arrancar
```bash
cd proyecto_integrado_final
npm install    # ← OBLIGATORIO la primera vez
node index.js
```

> ⚠️ Si ves `Cannot find module 'express-session'` es porque faltó el `npm install`.

### 4. Abrir en el navegador
- http://localhost:3000 → **Login** *(punto de entrada — todas las rutas requieren sesión)*
- http://localhost:3000/admin → Menú principal
- http://localhost:3000/inventario → Inventario
- http://localhost:3000/devoluciones → Devoluciones
- http://localhost:3000/configuracion → Configuración
- http://localhost:3000/notificaciones → Notificaciones
- http://localhost:3000/alertas → Centro de alertas

### 🔐 Seguridad de sesión
Todas las rutas y APIs requieren sesión activa del servidor.
Sin haber iniciado sesión, cualquier URL redirige al login (o devuelve HTTP 401 si es una API).

---

## 🗄️ Estructura de la BD (`dulceria_lupitabd`)

| Tabla                | Descripción                            |
|----------------------|----------------------------------------|
| `productos`          | Catálogo de productos con stock        |
| `categorias`         | Clasificación de productos             |
| `unidad_medida`      | Unidades (piezas, kg, litros, etc.)    |
| `proveedores`        | Proveedores con RFC                    |
| `entradas`           | Compras recibidas (actualiza stock ↑)  |
| `salidas`            | Despachos a sucursal (actualiza stock ↓)|
| `ajustes_inventario` | Ajustes manuales de stock              |
| `alertas_stock`      | Mínimos y máximos configurados         |
| `sucursal`           | Tiendas/bodegas del negocio            |
| `usuarios`           | Personal con rol y credenciales        |
| `detalle_producto`   | Historial precio-proveedor por producto|
| `movimientos`        | Registro general de movimientos        |
| `inventario_inicial` | Stock inicial registrado               |

---

## 🔌 API Endpoints

### Proveedores
| Método | Ruta                           | Descripción           |
|--------|--------------------------------|-----------------------|
| GET    | `/api/proveedores`             | Listar todos          |
| POST   | `/api/proveedores/registrar`   | Registrar proveedor   |
| PUT    | `/api/proveedores/:rfc`        | Actualizar proveedor  |
| DELETE | `/api/proveedores/:rfc`        | Eliminar proveedor    |

### Productos
| Método | Ruta                              | Descripción             |
|--------|-----------------------------------|-------------------------|
| GET    | `/api/productos`                  | Listar con join         |
| POST   | `/api/productos/registrar`        | Registrar producto      |
| PUT    | `/api/productos/:id`              | Actualizar producto     |
| DELETE | `/api/productos/:id`              | Eliminar producto       |
| GET    | `/api/productos/bajo-stock`       | Proc. bajo stock        |
| GET    | `/api/productos/proximos-caducar` | Proc. próximos a caducar|

### Entradas / Salidas
| Método | Ruta                       | Descripción                 |
|--------|----------------------------|-----------------------------|
| GET    | `/api/entradas`            | Historial de entradas       |
| POST   | `/api/entradas/registrar`  | Registrar entrada (↑ stock) |
| GET    | `/api/salidas`             | Historial de salidas        |
| POST   | `/api/salidas/registrar`   | Registrar salida (↓ stock)  |

### Configuración
| Método | Ruta                        | Descripción             |
|--------|-----------------------------|-------------------------|
| GET    | `/api/configuracion`        | Datos tienda principal  |
| PUT    | `/api/configuracion`        | Actualizar tienda       |
| GET    | `/api/configuracion/resumen`| KPIs del sistema        |

### Usuarios / Sucursales / Categorías
Todos con CRUD completo:  
`GET /api/usuarios` · `POST /api/usuarios/registrar` · `PUT /api/usuarios/:id` · `DELETE /api/usuarios/:id`  
`GET /api/sucursales` · `POST /api/sucursales/registrar` · `PUT /api/sucursales/:id` · `DELETE /api/sucursales/:id`  
`GET /api/categorias` · `POST /api/categorias/registrar` · `PUT /api/categorias/:id` · `DELETE /api/categorias/:id`
