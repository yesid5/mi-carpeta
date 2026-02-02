const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 25076, // Usamos el puerto que encontramos
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 30000,
  enableKeepAlive: true
});

// Prueba de fuego mejorada
pool.getConnection()
  .then(conn => {
    console.log("🚀 ¡CONEXIÓN EXITOSA! Tienda JP está conectada a Aiven en India.");
    conn.release();
  })
  .catch(err => {
    console.error("❌ Fallo final:", err.code, err.message);
  });
// 2. Prueba de conexión al arrancar
pool.getConnection()
  .then(conn => {
    console.log("✅ Conectado exitosamente a Aiven MySQL");
    conn.release();
  })
  .catch(err => {
    console.error("❌ Error de conexión a la base de datos:", err.message);
  });

// 3. Función unificada para consultar
async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (err) {
    console.error("Error SQL:", err.message);
    throw err;
  }
}

// 4. Rutas
app.get('/productos', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM productos ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    // Esto nos dirá exactamente qué está pasando en los logs
    console.error("DETALLE DEL ERROR:", err);
    res.status(500).json({ 
      error: "Error de DB", 
      codigo: err.code, 
      mensaje: err.sqlMessage || "Error desconocido" 
    });
  }
});

app.post('/productos', async (req, res) => {
  const { nombre, precio, stock, codigo_barras } = req.body;
  try {
    const sql = 'INSERT INTO productos (nombre, precio, stock, codigo_barras) VALUES (?, ?, ?, ?)';
    await query(sql, [nombre, precio, stock, codigo_barras]);
    res.status(201).json({ message: "Producto creado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Puerto configurado para Render
// Agregamos '0.0.0.0' para que Render pueda hacer el "Port Binding" correctamente
const PORT = process.env.PORT || 10000;
// Función para inicializar la base de datos
const inicializarDB = async () => {
  try {
    // 1. Tabla de Productos
    await query(`
      CREATE TABLE IF NOT EXISTS productos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        precio DECIMAL(10,2) NOT NULL,
        stock INT NOT NULL,
        codigo_barras VARCHAR(100) UNIQUE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Tabla de Ventas (El encabezado: quién, cuándo y cuánto)
    await query(`
      CREATE TABLE IF NOT EXISTS ventas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total DECIMAL(10,2) NOT NULL,
        metodo_pago VARCHAR(50) DEFAULT 'Efectivo'
      )
    `);

    // 3. Tabla de Detalle de Ventas (Qué productos hubo en cada venta)
    await query(`
      CREATE TABLE IF NOT EXISTS detalle_ventas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        venta_id INT,
        producto_id INT,
        cantidad INT NOT NULL,
        precio_unitario DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (venta_id) REFERENCES ventas(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `);

    console.log("🚀 Estructura de Tienda JP (Productos y Ventas) lista.");
  } catch (err) {
    console.error("❌ Error al inicializar tablas:", err.message);
  }
};

inicializarDB();
// RUTA PARA PROCESAR UNA VENTA
app.post('/ventas', async (req, res) => {
  const { total, carrito } = req.body;

  try {
    // 1. Crear el registro de la venta
    const resultadoVenta = await query(
      'INSERT INTO ventas (total, metodo_pago) VALUES (?, ?)',
      [total, 'Efectivo']
    );
    const ventaId = resultadoVenta.insertId;

    // 2. Registrar cada producto y descontar stock
    for (const producto of carrito) {
      // Guardar el detalle
      await query(
        'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [ventaId, producto.id, producto.cantidad, producto.precio]
      );

      // DESCONTAR STOCK: La magia del inventario automático
      await query(
        'UPDATE productos SET stock = stock - ? WHERE id = ?',
        [producto.cantidad, producto.id]
      );
    }

    res.status(201).json({ message: "Venta realizada con éxito", ventaId });
  } catch (err) {
    console.error("Error en venta:", err);
    res.status(500).json({ error: "No se pudo completar la venta" });
  }
});
// RUTA PARA REPORTE DE VENTAS DIARIAS
app.get('/reporte-hoy', async (req, res) => {
  try {
    const sql = `
      SELECT 
        COUNT(*) as total_ventas, 
        IFNULL(SUM(total), 0) as dinero_total 
      FROM ventas 
      WHERE DATE(fecha) = CURDATE()
    `;
    const [resultado] = await query(sql);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Tienda JP listo y escuchando en puerto ${PORT}`);
});



