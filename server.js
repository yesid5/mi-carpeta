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

// Ruta de Bienvenida
app.get('/', (req, res) => res.send('🏪 API Tienda JP Online y Lista'));

// Obtener Productos
app.get('/productos', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM productos ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Procesar Venta con Transacción
app.post('/ventas', async (req, res) => {
  const { total, carrito } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [resVenta] = await connection.execute('INSERT INTO ventas (total) VALUES (?)', [total]);
    const ventaId = resVenta.insertId;

    for (const item of carrito) {
      await connection.execute(
        'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [ventaId, item.id, item.cantidad, item.precio]
      );
      await connection.execute('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.id]);
    }
    await connection.commit();
    res.json({ mensaje: "✅ Venta exitosa", ventaId });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally { connection.release(); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Puerto: ${PORT}`));
