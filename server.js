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
  port: process.env.DB_PORT,
  ssl: {
    // Esto obliga a usar TLS pero ignora la verificación de certificado local
    rejectUnauthorized: false
  },
  // Aumentamos el tiempo de espera por si la conexión a India (Bangalore) es lenta
  connectTimeout: 20000, 
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Esta opción ayuda a mantener la conexión viva
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
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
    res.status(500).json({ error: err.message });
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Tienda JP listo y escuchando en puerto ${PORT}`);
});



