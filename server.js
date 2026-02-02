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
  const sql = `
    CREATE TABLE IF NOT EXISTS productos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      precio DECIMAL(10,2) NOT NULL,
      stock INT NOT NULL,
      codigo_barras VARCHAR(100) UNIQUE,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await query(sql);
    console.log("✅ Tabla 'productos' lista para usar.");
  } catch (err) {
    console.error("❌ Error al crear la tabla:", err.message);
  }
};

// Llamamos a la función
inicializarDB();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Tienda JP listo y escuchando en puerto ${PORT}`);
});



