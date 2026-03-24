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
  port: parseInt(process.env.DB_PORT) || 25076,
  ssl: { rejectUnauthorized: false }
});

async function query(sql, params) {
  const [results] = await pool.execute(sql, params);
  return results;
}

// INICIALIZACIÓN
const inicializarDB = async () => {
  try {
    await query(`CREATE TABLE IF NOT EXISTS productos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      precio DECIMAL(10,2) NOT NULL,
      stock INT DEFAULT 0,
      codigo_barras VARCHAR(100) UNIQUE,
      imagen_url TEXT,
      precio_costo DECIMAL(10,2) DEFAULT 0,
      ultimo_iva INT DEFAULT 0,
      ultimo_icui DECIMAL(10,2) DEFAULT 0,
      ultimo_ibua DECIMAL(10,2) DEFAULT 0
    )`);

    // Intentar agregar columnas si la tabla ya existía (ignora error si ya están)
    const columnas = [
      "ALTER TABLE productos ADD COLUMN imagen_url TEXT",
      "ALTER TABLE productos ADD COLUMN precio_costo DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE productos ADD COLUMN ultimo_iva INT DEFAULT 0"
    ];
    for (let sql of columnas) {
      try { await query(sql); } catch (e) { /* Ignorar duplicados */ }
    }

    await query(`CREATE TABLE IF NOT EXISTS ventas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      total DECIMAL(10,2) NOT NULL
    )`);

    await query(`CREATE TABLE IF NOT EXISTS detalle_ventas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      venta_id INT,
      producto_id INT,
      cantidad INT,
      precio_unitario DECIMAL(10,2),
      FOREIGN KEY (venta_id) REFERENCES ventas(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )`);

    console.log("🚀 Server Ready");
  } catch (err) { console.error("Error DB:", err.message); }
};
inicializarDB();

// RUTAS
app.get('/productos', async (req, res) => {
  const rows = await query('SELECT * FROM productos ORDER BY nombre ASC');
  res.json(rows);
});

app.post('/ventas', async (req, res) => {
  const { total, carrito } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [v] = await conn.execute('INSERT INTO ventas (total) VALUES (?)', [total]);
    for (let item of carrito) {
      await conn.execute('INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES (?,?,?,?)', 
      [v.insertId, item.id, item.cantidad, item.precio]);
      await conn.execute('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.id]);
    }
    await conn.commit();
    res.json({ mensaje: "Venta Exitosa" });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally { conn.release(); }
});

app.listen(process.env.PORT || 10000, '0.0.0.0');
