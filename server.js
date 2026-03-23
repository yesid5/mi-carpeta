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

const inicializarDB = async () => {
  try {
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
    console.log("🚀 Base de datos sincronizada.");
  } catch (err) {
    console.error("❌ Error al inicializar DB:", err.message);
  }
};
inicializarDB();

app.get('/', (req, res) => res.send('🏪 Servidor Tienda JP: ONLINE'));

app.get('/productos', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM productos ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/compras', async (req, res) => {
  const { productoId, cantidad, precioUnitario, iva, icui, ibua, numeroFactura, proveedor, fechaVencimiento } = req.body;
  try {
    await query(`UPDATE productos SET stock = stock + ?, precio_costo = ?, ultimo_iva = ?, ultimo_icui = ?, ultimo_ibua = ? WHERE id = ?`, 
      [cantidad, precioUnitario, iva || 0, icui || 0, ibua || 0, productoId]);
    await query(`INSERT INTO historial_compras (producto_id, numero_factura, proveedor, cantidad, precio_unitario_costo, iva_porcentaje, icui_valor, ibua_valor, fecha_vencimiento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productoId, numeroFactura, proveedor, cantidad, precioUnitario, iva, icui, ibua, fechaVencimiento || null]);
    res.json({ message: "Inventario actualizado" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/ventas', async (req, res) => {
  const { total, carrito, metodo_pago } = req.body;
  try {
    const pagoSeguro = metodo_pago || 'Efectivo';
    const resVenta = await query('INSERT INTO ventas (total, metodo_pago) VALUES (?, ?)', [total, pagoSeguro]);
    const ventaId = resVenta.insertId;

    for (const item of carrito) {
      await query('INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [ventaId, item.id, item.cantidad, item.precio]);
      await query('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.id]);
    }
    res.json({ message: "Venta exitosa" });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: "Error en base de datos", detalle: err.message }); 
  }
});

app.post('/productos', async (req, res) => {
  const { nombre, precio, stock, codigo_barras } = req.body;
  try {
    await query('INSERT INTO productos (nombre, precio, stock, codigo_barras) VALUES (?, ?, ?, ?)', 
    [nombre, precio, stock || 0, codigo_barras]);
    res.status(201).json({ message: "Producto creado" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// RUTA: POST /compras
app.post('/compras', async (req, res) => {
    const { 
        productoId, cantidad, precioUnitario, 
        iva, icui, ibua, numeroFactura, proveedor 
    } = req.body;

    try {
        // 1. Calcular el subtotal y los impuestos
        const subtotal = cantidad * precioUnitario;
        const valorIVA = subtotal * (iva / 100);
        // ICUI e IBUA suelen ser valores fijos por unidad en la factura
        const totalImpuestos = valorIVA + (icui * cantidad) + (ibua * cantidad);
        const costoTotalFactura = subtotal + totalImpuestos;

        // 2. Insertar el registro de la compra
        const nuevaCompra = await pool.query(
            `INSERT INTO compras 
            (producto_id, cantidad, precio_unitario, iva, icui, ibua, numero_factura, proveedor, total_costo) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [productoId, cantidad, precioUnitario, iva, icui, ibua, numeroFactura, proveedor, costoTotalFactura]
        );

        // 3. ACTUALIZACIÓN AUTOMÁTICA DE STOCK
        // Sumamos la cantidad ingresada al stock actual del producto
        await pool.query(
            'UPDATE productos SET stock = stock + $1 WHERE id = $2',
            [cantidad, productoId]
        );

        res.status(201).json({
            mensaje: "Inventario actualizado exitosamente",
            compra: nuevaCompra.rows[0]
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Error en el servidor al registrar la compra");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
});
