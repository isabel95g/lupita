const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const app = express();
 app.use('/img', express.static(path.join(__dirname, 'img')));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Thebeatles1995*",
  database: "dulceria_lupitabd"
});

db.connect(err => {
  if (err) {
    console.log("Error de conexión");
  } else {
    console.log("Conectado a MySQL");
  }
});

app.get("/", (req, res) => {
  res.send("Servidor funcionando correctamente");
});

app.get("/usuarios", (req, res) => {
  db.query("SELECT ID_usuario, Nombre FROM usuarios", (err, result) => {
    if (err) return res.send("Error usuarios");
    res.json(result);
  });
});

app.get("/proveedores", (req, res) => {
  db.query("SELECT ID_proveedor, Nombre FROM proveedores", (err, result) => {
    if (err) return res.send("Error proveedores");
    res.json(result);
  });
});

app.get("/productos", (req, res) => {
  db.query("SELECT ID_producto, Nombre, Stock_anual FROM productos", (err, result) => {
    if (err) return res.send("Error productos");
    res.json(result);
  });
});

app.get("/sucursal", (req, res) => {
  db.query("SELECT ID_sucursal, Nombre FROM sucursal", (err, result) => {
    if (err) return res.send("Error sucursal");
    res.json(result);
  });
});



app.post("/devoluciones", (req, res) => {
  const { proveedor_id, producto_id, cantidad, motivo, sucursal, usuario_id } = req.body;

  if (!proveedor_id || !producto_id || !cantidad || !motivo || !sucursal || !usuario_id) {
    return res.status(400).send("Faltan datos");
  }

  const verificarStock = "SELECT Stock_anual FROM productos WHERE ID_producto = ?";

  db.query(verificarStock, [producto_id], (err, result) => {
    if (err) {
      console.log("ERROR STOCK:", err);
      return res.status(500).send("Error al verificar stock");
    }

    if (result.length === 0) {
      return res.send("Producto no encontrado");
    }

    const stock = result[0].Stock_anual;

    if (cantidad > stock) {
      return res.status(400).send("La cantidad supera el stock disponible");
    }

    const sql = `
      INSERT INTO devoluciones
      (folio, proveedor_id, producto_id, cantidad, motivo, sucursal, usuario_id, estado, fecha)
      VALUES (UUID(), ?, ?, ?, ?, ?, ?, 'Registrada', NOW())
    `;

    db.query(sql, [proveedor_id, producto_id, cantidad, motivo, sucursal, usuario_id], (err, resultInsert) => {
      if (err) {
        console.log("ERROR INSERT:", err);
        return res.status(500).send(err.sqlMessage);
      }

      console.log("INSERT OK:", resultInsert);

      const actualizarStock = `
        UPDATE productos 
        SET Stock_anual = Stock_anual - ?
        WHERE ID_producto = ?
      `;

      db.query(actualizarStock, [cantidad, producto_id], (err) => {
        if (err) {
          console.log("ERROR STOCK UPDATE:", err);
          return res.status(500).send("Error al actualizar stock");
        }

        res.send("Devolución registrada correctamente");
      });
    });
  });
});




app.get("/devoluciones", (req, res) => {

  const sql = `
    SELECT 
      d.id,
      d.folio,
      pr.Nombre AS proveedor,
      p.Nombre AS producto,
      d.cantidad,
      d.motivo,
      d.estado,
      d.fecha AS fecha,
      u.Nombre AS usuario
    FROM devoluciones d
    JOIN proveedores pr ON d.proveedor_id = pr.ID_proveedor
    JOIN productos p ON d.producto_id = p.ID_producto
    LEFT JOIN usuarios u ON d.usuario_id = u.ID_usuario
    ORDER BY d.fecha DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log("ERROR SQL:", err);
      return res.status(500).send("Error al consultar devoluciones");
    }

    res.json(result);
  });

});





app.get("/inventario", (req, res) => {
  const sql = `
    SELECT 
      ID_producto AS id,
      Nombre AS producto,
      Stock_anual AS cantidad
    FROM productos
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.send("Error inventario");
    }

    console.log("RESULTADO INVENTARIO", result);
    res.json(result);
  });
});

app.get("/inventario/bajo-stock", (req, res) => {
  const sql = `
    SELECT Nombre, Stock_anual 
    FROM productos 
    WHERE Stock_anual <= 10
  `;

  db.query(sql, (err, result) => {
    if (err) return res.send("Error");
    res.json(result);
  });
});

app.get("/inventario/caducar", (req, res) => {
  const sql = `
    SELECT Nombre, fecha_caducidad
    FROM productos
    WHERE fecha_caducidad <= DATE_ADD(NOW(), INTERVAL 7 DAY)
  `;

  db.query(sql, (err, result) => {
    if (err) return res.send("Error");
    res.json(result);
  });
});


app.post("/register", (req, res) => {
  const { user, email, password } = req.body;

  if (!user || !email || !password) {
    return res.status(400).send("Faltan datos");
  }

  const sql = "INSERT INTO usuarios (Nombre, correo, contraseña_hash) VALUES (?, ?, ?)";

  db.query(sql, [user, email, password], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error al registrar");
    }

    res.json({ success: true, message: "Registro exitoso" });
  });
});


app.put("/devoluciones/:id", (req, res) => {
  const { estado } = req.body;
  const { id } = req.params;

  db.query("UPDATE devoluciones SET estado=? WHERE id=?", [estado, id], (err) => {
    if (err) {
      res.send("Error al actualizar");
    } else {
      res.send("Estado actualizado");
    }
  });
});

app.delete("/devoluciones/:id", (req, res) => {
  const id = req.params.id;

  const obtener = "SELECT producto_id, cantidad FROM devoluciones WHERE id=?";

  db.query(obtener, [id], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error");
    }

    if (result.length === 0) {
      return res.send("No existe");
    }

    const { producto_id, cantidad } = result[0];

    const devolverStock = `
      UPDATE productos 
      SET Stock_anual = Stock_anual + ?
      WHERE ID_producto = ?
    `;

    db.query(devolverStock, [cantidad, producto_id], (err) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Error stock");
      }

      db.query("DELETE FROM devoluciones WHERE id=?", [id], (err) => {
        if (err) {
          res.status(500).send("Error eliminar");
        } else {
          res.send("Eliminado correctamente");
        }
      });
    });
  });
});

app.post("/login", (req, res) => {
  const { user, password } = req.body;

  if (!user || !password) {
    return res.status(400).send("Faltan datos");
  }

  const sql = "SELECT * FROM usuarios WHERE Nombre = ? AND contraseña_hash = ?";

  db.query(sql, [user, password], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error en servidor");
    }

    if (result.length > 0) {
      res.json({ success: true, usuario: result[0] });
    } else {
      res.json({ success: false });
    }
  });
});



const PDFDocument = require("pdfkit");

app.get("/reporte-devoluciones", (req, res) => {

  const { inicio, fin } = req.query;

  let sql = `
    SELECT 
      d.folio,
      d.cantidad,
      d.motivo,
      d.estado,
      DATE(d.fecha) AS fecha,
      u.Nombre AS usuario
    FROM devoluciones d
    LEFT JOIN usuarios u ON d.usuario_id = u.ID_usuario
  `;

  let params = [];

 
  if (inicio && fin) {
    sql += ` WHERE DATE(d.fecha) BETWEEN ? AND ? `;
    params = [inicio, fin];
  }

  sql += ` ORDER BY d.fecha DESC`;

  db.query(sql, params, (err, rows) => {

    console.log("INICIO:", inicio);
    console.log("FIN:", fin);
    console.log("ROWS PDF:", rows);

    if (err) {
      console.log(err);
      return res.send("Error al generar PDF");
    }

    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);


    doc.image(__dirname + "/public/logo.png", 40, 30, { width: 80 });

 
    doc.fontSize(16).text("REPORTE DE DEVOLUCIONES", { align: "center" });
    doc.moveDown(1);

    
    if (rows.length === 0) {
      doc.text("No hay registros en este rango de fechas");
      doc.end();
      return;
    }

    
    const startX = 40;
    let y = doc.y + 10;

    doc.font("Helvetica-Bold").fontSize(9);


    doc.rect(startX, y - 9, 560, 35).fillAndStroke("#eeeeee", "black");
    doc.fillColor("black");

    const colWidths = [120, 60, 120, 80, 80, 100];

   doc.text("Folio", startX, y, { width: colWidths[0], align:"center" });
   doc.text("Cantidad", startX + colWidths[0], y, { width: colWidths[1], align:"center" });
   doc.text("Motivo", startX + colWidths[0] + colWidths[1], y, { width: colWidths[2], align:"center" });
   doc.text("Estado", startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3], align:"center" });
   doc.text("Fecha", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4], align:"center" });
   doc.text("Usuario", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y, { width: colWidths[5], align:"center" });


    y += 25;

    doc.moveTo(startX, y).lineTo(520, y).stroke();
    y += 10;

    
    doc.font("Helvetica").fontSize(9);

  
    

    rows.forEach(r => {

  const folioFormateado = r.folio.match(/.{1,18}/g).join("\n");
  const fecha = new Date(r.fecha).toISOString().split("T")[0];

  const startX = 40;
  const colWidths = [120, 60, 120, 80, 80, 100];
  const padding = 5;

  const folioHeight = doc.heightOfString(folioFormateado, { width: colWidths[0] - padding * 2 });
  const motivoHeight = doc.heightOfString(r.motivo, { width: colWidths[2] - padding * 2 });

  const rowHeight = Math.max(folioHeight, motivoHeight, 20) + padding * 2;

  const folioY = y + (rowHeight - folioHeight) / 2;
  const motivoY = y + (rowHeight - motivoHeight) / 2;
  const centerY = y + rowHeight / 2 - 5;

  // TEXTO
  doc.text(folioFormateado, startX + padding, folioY, { width: colWidths[0] - padding * 2 });

  doc.text(String(r.cantidad), startX + colWidths[0], centerY, {
    width: colWidths[1],
    align: "center"
  });

  doc.text(r.motivo, startX + colWidths[0] + colWidths[1], motivoY, {
    width: colWidths[2],
    align: "center"
  });

  doc.text(r.estado, startX + colWidths[0] + colWidths[1] + colWidths[2], centerY, {
    width: colWidths[3],
    align: "center"
  });

  doc.text(fecha, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], centerY, {
    width: colWidths[4],
    align: "center"
  });

  // 👉 NUEVO USUARIO
  doc.text(r.usuario, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], centerY, {
    width: colWidths[5],
    align: "center"
  });

  // BORDES
  let x = startX;
  colWidths.forEach(w => {
    doc.rect(x, y, w, rowHeight).stroke();
    x += w;
  });

  y += rowHeight;

});





  

    doc.end();
  });
});





app.get("/debug-devoluciones", (req, res) => {
  db.query("SELECT * FROM devoluciones", (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error en consulta");
    }

    res.json(result);
  });
});




app.listen(3001, () => {
  console.log("Servidor corriendo en puerto 3001");
});