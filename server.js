
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

// --- CONFIGURACIÓN ---
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());

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

// Función de consulta base (sin console.error interno para evitar ruido en logs)
async function query(sql, params) {
  const [results] = await pool.execute(sql, params);
  return results;
}

// --- 1. INICIALIZACIÓN DE TABLAS (IDEMPOTENTE) ---
const inicializarDB = async () => {
  try {
    // Crear tabla principal con TODAS las columnas necesarias
    await query(`CREATE TABLE IF NOT EXISTS productos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      precio DECIMAL(10,2) NOT NULL,
      precio_costo DECIMAL(10,2) DEFAULT 0,
      stock INT DEFAULT 0,
      codigo_barras VARCHAR(100) UNIQUE,
      imagen_url TEXT,
      ultimo_iva INT DEFAULT 0,
      ultimo_icui DECIMAL(10,2) DEFAULT 0,
      ultimo_ibua DECIMAL(10,2) DEFAULT 0,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Actualizaciones para bases de datos que ya existían sin estas columnas
    const actualizaciones = [
      { col: "precio_costo", sql: "ALTER TABLE productos ADD COLUMN precio_costo DECIMAL(10,2) DEFAULT 0" },
      { col: "ultimo_iva",   sql: "ALTER TABLE productos ADD COLUMN ultimo_iva INT DEFAULT 0" },
      { col: "ultimo_icui",  sql: "ALTER TABLE productos ADD COLUMN ultimo_icui DECIMAL(10,2) DEFAULT 0" },
      { col: "ultimo_ibua",  sql: "ALTER TABLE productos ADD COLUMN ultimo_ibua DECIMAL(10,2) DEFAULT 0" },
      { col: "imagen_url",   sql: "ALTER TABLE productos ADD COLUMN imagen_url TEXT" }
    ];

    for (let item of actualizaciones) {
      try { 
        await query(item.sql); 
      } catch (e) {
        // Error 1060 = Column already exists. Solo logueamos si es un error distinto.
        if (e.errno !== 1060) console.error(`Aviso en ${item.col}:`, e.message);
      }
    }

    // Tablas de soporte
    await query(`CREATE TABLE IF NOT EXISTS ventas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      total DECIMAL(10,2) NOT NULL,
      metodo_pago VARCHAR(50) DEFAULT 'Efectivo'
    )`);

    await query(`CREATE TABLE IF NOT EXISTS historial_compras (
      id INT AUTO_INCREMENT PRIMARY KEY,
      producto_id INT,
      numero_factura VARCHAR(50),
      proveedor VARCHAR(150),
      cantidad INT NOT NULL,
      precio_unitario_costo DECIMAL(10,2) NOT NULL,
      fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
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

    console.log("🚀 Base de datos verificada y lista para operar.");
  } catch (err) {
    console.error("❌ Error crítico en inicialización:", err.message);
  }
};

inicializarDB();

// --- 2. RUTAS DE PRODUCTOS ---

app.get('/productos', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM productos ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/productos', async (req, res) => {
  const { nombre, precio, stock, codigo_barras, imagen_url } = req.body;
  try {
    const sql = `INSERT INTO productos (nombre, precio, stock, codigo_barras, imagen_url) VALUES (?, ?, ?, ?, ?)`;
    await query(sql, [nombre, parseFloat(precio) || 0, parseInt(stock) || 0, codigo_barras || null, imagen_url || null]);
    res.status(201).json({ mensaje: "✅ Producto creado" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/productos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, stock, codigo_barras, imagen_url } = req.body;
  try {
    const sql = `UPDATE productos SET nombre=?, precio=?, stock=?, codigo_barras=?, imagen_url=? WHERE id=?`;
    await query(sql, [nombre, precio, stock, codigo_barras, imagen_url, id]);
    res.json({ mensaje: "✅ Actualizado" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/productos/:id', async (req, res) => {
  try {
    await query('DELETE FROM productos WHERE id = ?', [req.params.id]);
    res.json({ mensaje: "🗑️ Eliminado" });
  } catch (err) { res.status(500).json({ error: "No se puede eliminar (tiene historial relacionado)" }); }
});

// --- 3. RUTA DE VENTAS REVISADA (CON TRANSACCIÓN) ---

app.post('/ventas', async (req, res) => {
  const { total, carrito } = req.body;
  const connection = await pool.getConnection(); // Obtenemos conexión manual para la transacción

  try {
    await connection.beginTransaction(); // Iniciamos transacción

    // 1. Insertar la venta principal
    const [resVenta] = await connection.execute('INSERT INTO ventas (total) VALUES (?)', [parseFloat(total)]);
    const ventaId = resVenta.insertId;

    // 2. Procesar cada item del carrito
    for (const item of carrito) {
      // Verificar stock actual antes de vender
      const [rows] = await connection.execute('SELECT stock FROM productos WHERE id = ?', [item.id]);
      if (rows.length === 0 || rows[0].stock < item.cantidad) {
        throw new Error(`Stock insuficiente para el producto ID: ${item.id}`);
      }

      // Insertar detalle
      await connection.execute(
        'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [ventaId, item.id, item.cantidad, item.precio]
      );

      // Descontar stock
      await connection.execute('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.id]);
    }

    await connection.commit(); // Si todo salió bien, guardamos cambios permanentemente
    res.json({ mensaje: "💰 Venta procesada con éxito", ventaId });

  } catch (err) {
    await connection.rollback(); // Si algo falló, deshacemos todo lo anterior
    console.error("❌ Error en venta (Rollback ejecutado):", err.message);
    res.status(500).json({ error: "Error al procesar la venta: " + err.message });
  } finally {
    connection.release(); // Liberamos la conexión al pool
  }
});

// --- LANZAMIENTO ---
app.get('/', (req, res) => res.send('🏪 API Tienda JP Online'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor en puerto ${PORT}`));
