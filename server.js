const express = require('express');
const mysql = require('mysql2/promise'); // Declarado una sola vez ✅
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración del pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 10000 // Añadimos esto para que no espere para siempre
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Prueba de conexión al arrancar
pool.getConnection()
  .then(conn => {
    console.log("✅ Conectado exitosamente a Aiven MySQL");
    conn.release();
  })
  .catch(err => {
    console.error("❌ Error de conexión a la base de datos:", err.message);
  });

// Función unificada para consultar usando el POOL
async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (err) {
    throw err;
  }
}

// Ruta para obtener productos
app.get('/productos', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM productos ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta para guardar productos (para cuando uses el formulario de agregar)
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

const PORT = process.env.PORT || 10000; // Render usa el puerto 10000 por defecto
app.listen(PORT, () => console.log(`Servidor Tienda JP listo en puerto ${PORT}`));
