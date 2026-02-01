const express = require('express');
const mysql = require('mysql2/promise'); // Librería para MySQL
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de la conexión (Obtén estos datos de tu proveedor de DB)
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: { rejectUnauthorized: false } // Requerido por la mayoría de servicios en la nube
};

// Función para conectar y consultar
async function query(sql, params) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [results] = await connection.execute(sql, params);
    return results;
  } finally {
    await connection.end();
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor MySQL listo en puerto ${PORT}`));
