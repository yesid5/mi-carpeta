const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
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

async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (err) {
    console.error("❌ Error SQL:", err.message);
    throw err;
  }
}

// --- 1. INICIALIZACIÓN DE TABLAS ---
const inicializarDB = async () => {
  try {
    // Crear tabla productos si no existe
    await query(`CREATE TABLE IF NOT EXISTS productos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      precio DECIMAL(10,2) NOT NULL,
      precio_costo DECIMAL(10,2) DEFAULT 0,
      stock INT DEFAULT 0,
      codigo_barras VARCHAR(100) UNIQUE,
      ultimo_iva INT DEFAULT 0,
      ultimo_icui DECIMAL(10,2) DEFAULT 0,
      ultimo_ibua DECIMAL(10,2) DEFAULT 0,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // --- BLOQUE DE ACTUALIZACIÓN ---
    // Intentamos agregar las columnas individualmente por si la tabla ya existía
    const columnasNuevas = [
      "ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_costo DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE productos ADD COLUMN IF NOT EXISTS ultimo_iva INT DEFAULT 0",
      "ALTER TABLE productos ADD COLUMN IF NOT EXISTS ultimo_icui DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE productos ADD COLUMN IF NOT EXISTS ultimo_ibua DECIMAL(10,2) DEFAULT 0"
    ];

    for (let sql of columnasNuevas) {
      try { await query(sql); } catch (e) { /* Ignorar si la columna ya existe */ }
    }

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
      iva_porcentaje INT DEFAULT 0,
      icui_valor DECIMAL(10,2) DEFAULT 0,
      ibua_valor DECIMAL(10,2) DEFAULT 0,
      fecha_vencimiento DATE,
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

    console.log("🚀 Base de datos sincronizada y columnas verificadas.");
  } catch (err) {
    console.error("❌ Error al inicializar DB:", err.message);
  }
};

inicializarDB();

// --- 2. RUTAS ---

app.get('/', (req, res) => res.send('🏪 Servidor Tienda JP: ONLINE'));

app.get('/productos', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM productos ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/productos', async (req, res) => {
  const { nombre, precio, stock, codigo_barras } = req.body;
  try {
    await query('INSERT INTO productos (nombre, precio, stock, codigo_barras) VALUES (?, ?, ?, ?)', 
    [nombre, precio, stock || 0, codigo_barras]);
    res.status(201).json({ message: "Producto creado" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/compras', async (req, res) => {
    const { 
        productoId, numeroFactura, proveedor, cantidad, 
        precioUnitario, iva, icui, ibua, fechaVencimiento 
    } = req.body;

    const p_id = parseInt(productoId);
    const cant = parseInt(cantidad) || 0;
    const precio = parseFloat(precioUnitario) || 0;
    const v_iva = parseInt(iva) || 0;
    const v_icui = parseFloat(icui) || 0;
    const v_ibua = parseFloat(ibua) || 0;

    try {
        const sqlHistorial = `INSERT INTO historial_compras 
            (producto_id, numero_factura, proveedor, cantidad, precio_unitario_costo, iva_porcentaje, icui_valor, ibua_valor, fecha_vencimiento) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await query(sqlHistorial, [p_id, numeroFactura || 'S/N', proveedor || 'GENERICO', cant, precio, v_iva, v_icui, v_ibua, fechaVencimiento || null]);

        const sqlUpdate = `UPDATE productos SET 
                stock = stock + ?, 
                precio_costo = ?,
                ultimo_iva = ?,
                ultimo_icui = ?,
                ultimo_ibua = ?
             WHERE id = ?`;
        await query(sqlUpdate, [cant, precio, v_iva, v_icui, v_ibua, p_id]);

        res.status(201).json({ mensaje: "✅ Compra y Stock actualizados" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/ventas', async (req, res) => {
    const { total, carrito } = req.body;
    try {
        const resVenta = await query('INSERT INTO ventas (total) VALUES (?)', [parseFloat(total)]);
        const ventaId = resVenta.insertId;

        for (const item of carrito) {
            await query(
                'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                [ventaId, item.id, item.cantidad, item.precio]
            );
            await query('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.id]);
        }
        res.json({ mensaje: "💰 Venta exitosa" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
});
