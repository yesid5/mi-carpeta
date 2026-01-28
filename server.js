const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Permite que CodePen se conecte y que el servidor lea JSON
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// RUTA PARA GUARDAR PRODUCTOS (POST)
app.post('/productos', async (req, res) => {
  const { nombre, precio, stock, codigo_barras } = req.body;
  try {
    const nuevoProd = await pool.query(
      'INSERT INTO productos (nombre, precio, stock, codigo_barras) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, precio, stock, codigo_barras]
    );
    res.status(201).json(nuevoProd.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar producto" });
  }
});

// RUTA PARA VER PRODUCTOS (GET)
app.get('/productos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
