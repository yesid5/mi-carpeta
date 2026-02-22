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

// 1. Configuración del Pool
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

// Función de consulta
async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (err) {
    console.error("Error SQL:", err.message);
    throw err;
  }
}

// 2. Inicialización de Tablas (Actualizada)
const inicializarDB = async () => {
  try {
    // Tabla de productos con campos de costos e impuestos
    await query(`CREATE TABLE IF NOT EXISTS productos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      precio DECIMAL(10,2) NOT NULL,
      precio_costo DECIMAL(10,2) DEFAULT 0,
      stock INT NOT NULL,
      codigo_barras VARCHAR(100) UNIQUE,
      ultimo_iva INT DEFAULT 0,
      ultimo_icui DECIMAL(10,2) DEFAULT 0,
      ultimo_ibua DECIMAL(10,2) DEFAULT 0,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await query(`CREATE TABLE IF NOT EXISTS ventas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      total DECIMAL(10,2) NOT NULL,
      metodo_pago VARCHAR(50) DEFAULT 'Efectivo'
    )`);

    // Nueva tabla para historial de facturas de proveedores
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
    console.log("📋 Estructura de base de datos completa y verificada.");
  } catch (err) {
    console.error("❌ Error al inicializar tablas:", err.message);
  }
};
inicializarDB();

// --- 3. RUTAS ---

app.get('/', (req, res) => res.send('🏪 Servidor Tienda JP: ONLINE'));

// Obtener productos
app.get('/productos', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM productos ORDER BY id DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// NUEVA RUTA: REGISTRAR FACTURA DE PROVEEDOR
app.post('/compras', async (req, res) => {
  const { 
    productoId, cantidad, precioUnitario, iva, icui, ibua, 
    numeroFactura, proveedor, fechaVencimiento 
  } = req.body;

  try {
    // 1. Actualizar el stock y los costos del producto
    await query(`
      UPDATE productos 
      SET stock = stock + ?, 
          precio_costo = ?, 
          ultimo_iva = ?, 
          ultimo_icui = ?, 
          ultimo_ibua = ? 
      WHERE id = ?`, 
      [cantidad, precioUnitario, iva || 0, icui || 0, ibua || 0, productoId]
    );

    // 2. Insertar en el historial de compras
    await query(`
      INSERT INTO historial_compras 
      (producto_id, numero_factura, proveedor, cantidad, precio_unitario_costo, iva_porcentaje, icui_valor, ibua_valor, fecha_vencimiento) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productoId, numeroFactura, proveedor, cantidad, precioUnitario, iva, icui, ibua, fechaVencimiento || null]
    );

    res.json({ message: "Inventario actualizado y factura registrada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al procesar la factura", detalle: err.message });
  }
});

// Procesar Venta (Ajustada para restar stock)
app.post('/ventas', async (req, res) => {
  const { total, carrito, metodo_pago } = req.body;
  try {
    const resVenta = await query('INSERT INTO ventas (total, metodo_pago) VALUES (?, ?)', [total, metodo_pago]);
    const ventaId = resVenta.insertId;

    for (const item of carrito) {
      await query('INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [ventaId, item.id, item.cantidad, item.precio]);
      
      await query('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.id]);
    }
    res.json({ message: "Venta exitosa" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Otros (POST productos, PUT, DELETE...) permanecen igual que tu base original
app.post('/productos', async (req, res) => {
  const { nombre, precio, stock, codigo_barras } = req.body;
  try {
    await query('INSERT INTO productos (nombre, precio, stock, codigo_barras) VALUES (?, ?, ?, ?)', 
    [nombre, precio, stock, codigo_barras]);
    res.status(201).json({ message: "Producto creado" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/historial-compras', async (req, res) => {
  try {
    const sql = `
      SELECT 
        h.id, 
        p.nombre as producto, 
        h.proveedor, 
        h.numero_factura, 
        h.cantidad, 
        h.precio_unitario_costo as costo,
        h.iva_porcentaje as iva,
        h.fecha_registro as fecha
      FROM historial_compras h
      JOIN productos p ON h.producto_id = p.id
      ORDER BY h.fecha_registro DESC
      LIMIT 100
    `;
    const rows = await query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener historial", detalle: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor en puerto ${PORT}`));
