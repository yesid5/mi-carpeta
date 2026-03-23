const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

// Configuración de CORS para que tu CodePen/GitHub Pages pueda conectarse
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// 1. Configuración del Pool de Conexiones (Variables de Entorno)
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

// Función auxiliar para ejecutar consultas SQL
async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (err) {
    console.error("❌ Error SQL:", err.message);
    throw err;
  }
}

// 2. Inicialización Automática de Tablas
const inicializarDB = async () => {
  try {
    // Tabla de Productos
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

    // Tabla de Ventas (Encabezado)
    await query(`CREATE TABLE IF NOT EXISTS ventas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      total DECIMAL(10,2) NOT NULL,
      metodo_pago VARCHAR(50) DEFAULT 'Efectivo'
    )`);

    // Tabla de Historial de Compras (Facturas Proveedores)
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

    // Detalle de Ventas
    await query(`CREATE TABLE IF NOT EXISTS detalle_ventas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      venta_id INT,
      producto_id INT,
      cantidad INT NOT NULL,
      precio_unitario DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (venta_id) REFERENCES ventas(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )`);
    
    console.log("🚀 Base de datos sincronizada y lista.");
  } catch (err) {
    console.error("❌ Error al inicializar DB:", err.message);
  }
};
inicializarDB();

// --- 3. RUTAS DE LA API ---

app.get('/', (req, res) => res.send('🏪 Servidor Tienda JP: ONLINE'));

// Obtener todos los productos
app.get('/productos', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM productos ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Registrar una Factura (Ingreso de Mercancía)
app.post('/compras', async (req, res) => {
  const { 
    productoId, cantidad, precioUnitario, iva, icui, ibua, 
    numeroFactura, proveedor, fechaVencimiento 
  } = req.body;

  try {
    // Actualizar Stock e Impuestos en el Producto
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

    // Guardar en Historial de Compras
    await query(`
      INSERT INTO historial_compras 
      (producto_id, numero_factura, proveedor, cantidad, precio_unitario_costo, iva_porcentaje, icui_valor, ibua_valor, fecha_vencimiento) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productoId, numeroFactura, proveedor, cantidad, precioUnitario, iva, icui, ibua, fechaVencimiento || null]
    );

    res.json({ message: "Inventario actualizado correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al procesar factura", detalle: err.message });
  }
});

// Obtener Historial de Compras para el Reporte
app.get('/historial-compras', async (req, res) => {
  try {
    const sql = `
      SELECT h.*, p.nombre as producto 
      FROM historial_compras h 
      JOIN productos p ON h.producto_id = p.id 
      ORDER BY h.fecha_registro DESC LIMIT 50`;
    const rows = await query(sql);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Crear nuevo producto manual
app.post('/productos', async (req, res) => {
  const { nombre, precio, stock, codigo_barras } = req.body;
  try {
    await query('INSERT INTO productos (nombre, precio, stock, codigo_barras) VALUES (?, ?, ?, ?)', 
    [nombre, precio, stock || 0, codigo_barras]);
    res.status(201).json({ message: "Producto creado" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Procesar una Venta
app.post('/ventas', async (req, res) => {
  // 1. Extraemos los datos del cuerpo de la petición
  const { total, carrito, metodo_pago } = req.body;

  try {
    // CORRECCIÓN: Si metodo_pago es undefined, usamos 'Efectivo' por defecto
    const pagoSeguro = metodo_pago || 'Efectivo';

    // Insertar la venta principal
    const resVenta = await query(
      'INSERT INTO ventas (total, metodo_pago) VALUES (?, ?)', 
      [total, pagoSeguro]
    );
    
    const ventaId = resVenta.insertId;

    // Insertar cada producto del carrito
    for (const item of carrito) {
      // SEGURIDAD: Validamos que el producto tenga ID y precio antes de insertar
      if (!item.id || item.precio === undefined) {
        console.error("Producto incompleto en el carrito:", item);
        continue; // Salta este producto si está mal formado
      }

      await query(
        'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [ventaId, item.id, item.cantidad, item.precio]
      );
      
      // Restar del stock
      await query('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.id]);
    }

    res.json({ message: "Venta registrada con éxito", ventaId });
 } catch (err) {
    console.error("❌ ERROR DETALLADO EN VENTAS:", err);
    // Esto nos dirá si es un problema de stock, de conexión o de parámetros
    res.status(500).json({ 
      error: "Error interno en el servidor", 
      detalle: err.message,
      codigo: err.code 
    });
  }

// 4. Encendido del Servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
