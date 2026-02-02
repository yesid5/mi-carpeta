const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Configuración del Pool de Conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 25076,
  ssl: { rejectUnauthorized: false },
  connectTimeout: 30000,
  enableKeepAlive: true
});

// Verificación inicial de conexión
pool.getConnection()
  .then(conn => {
    console.log("🚀 ¡CONEXIÓN EXITOSA! Tienda JP conectada a Aiven.");
    conn.release();
  })
  .catch(err => console.error("❌ Error inicial de DB:", err.message));

// 2. Función Unificada para Consultas
async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (err) {
    console.error("Error SQL:", err.message);
    throw err;
  }
}

// 3. Inicialización de Tablas
const inicializarDB = async () => {
  try {
    await query(`CREATE TABLE IF NOT EXISTS productos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      precio DECIMAL(10,2) NOT NULL,
      stock INT NOT NULL,
      codigo_barras VARCHAR(100) UNIQUE,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await query(`CREATE TABLE IF NOT EXISTS ventas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      total DECIMAL(10,2) NOT NULL,
      metodo_pago VARCHAR(50) DEFAULT 'Efectivo'
    )`);

    await query(`CREATE TABLE IF NOT EXISTS detalle_ventas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      venta_id INT,
      producto_id INT,
      cantidad INT NOT NULL,
      precio_unitario DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (venta_id) REFERENCES ventas(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )`);
    console.log("📋 Estructura de base de datos verificada.");
  } catch (err) {
    console.error("❌ Error al inicializar tablas:", err.message);
  }
};
inicializarDB();

// 4. RUTAS DE LA API

// Obtener todos los productos
app.get('/productos', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM productos ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error de DB", mensaje: err.message });
  }
});

// Crear nuevo producto
app.post('/productos', async (req, res) => {
  const { nombre, precio, stock, codigo_barras } = req.body;
  try {
    await query('INSERT INTO productos (nombre, precio, stock, codigo_barras) VALUES (?, ?, ?, ?)', 
    [nombre, precio, stock, codigo_barras]);
    res.status(201).json({ message: "Producto creado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Procesar una Venta
app.post('/ventas', async (req, res) => {
  const { total, carrito, metodo_pago } = req.body;
  try {
    const resultadoVenta = await query(
      'INSERT INTO ventas (total, metodo_pago) VALUES (?, ?)',
      [total, metodo_pago || 'Efectivo']
    );
    const ventaId = resultadoVenta.insertId;

    for (const producto of carrito) {
      await query(
        'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [ventaId, producto.id, producto.cantidad, producto.precio]
      );
      await query('UPDATE productos SET stock = stock - ? WHERE id = ?', [producto.cantidad, producto.id]);
    }
    res.status(201).json({ message: "Venta realizada", ventaId });
  } catch (err) {
    res.status(500).json({ error: "Error al procesar venta" });
  }
});

// Reporte de ventas de hoy
app.get('/reporte-hoy', async (req, res) => {
  try {
    const sql = `
      SELECT 
        COUNT(*) as total_ventas, 
        IFNULL(SUM(total), 0) as dinero_total 
      FROM ventas 
      WHERE DATE(fecha) = CURDATE()
    `;
    const resultado = await query(sql); // Cambiado: ya no desestructuramos aquí
    res.json(resultado[0]); // Devolvemos el primer (y único) objeto
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// EDITAR PRODUCTO (Actualiza nombre, precio, stock o código)
app.put('/productos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, stock, codigo_barras } = req.body;
  try {
    await query(
      'UPDATE productos SET nombre = ?, precio = ?, stock = ?, codigo_barras = ? WHERE id = ?',
      [nombre, precio, stock, codigo_barras, id]
    );
    res.json({ message: "Producto actualizado correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ELIMINAR PRODUCTO
app.delete('/productos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Nota: Si el producto ya tiene ventas, MySQL dará error por la "Llave Foránea".
    // Esto es bueno porque evita borrar historial de ventas real.
    await query('DELETE FROM productos WHERE id = ?', [id]);
    res.json({ message: "Producto eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ 
      error: "No se puede eliminar", 
      detalle: "Este producto tiene ventas registradas y no puede borrarse para no alterar el historial." 
    });
  }
});
// 5. Encendido del Servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Tienda JP listo en puerto ${PORT}`);
});
