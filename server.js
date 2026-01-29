const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de conexión MySQL
const dbConfig = {
    host: 'tu-host-mysql.com',
    user: 'tu_usuario',
    password: 'tu_password',
    database: 'tu_base_de_datos',
    port: 3306
};

// Ruta para obtener productos
app.get('/productos', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM productos');
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ruta para registrar productos (MySQL usa ?)
app.post('/productos', async (req, res) => {
    const { nombre, precio, stock, codigo_barras } = req.body;
    try {
        const connection = await mysql.createConnection(dbConfig);
        const sql = 'INSERT INTO productos (nombre, precio, stock, codigo_barras) VALUES (?, ?, ?, ?)';
        const [result] = await connection.execute(sql, [nombre, precio, stock, codigo_barras]);
        await connection.end();
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Servidor MySQL corriendo en puerto 3000'));
