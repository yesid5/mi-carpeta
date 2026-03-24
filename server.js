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
    // 1. Crear tabla productos (si no existe, ya incluye las columnas)
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

    // 2. Bloque de actualización manual para tablas viejas
    // Quitamos el "IF NOT EXISTS" del ALTER porque MySQL antiguo no lo entiende
    const actualizaciones = [
      "ALTER TABLE productos ADD COLUMN precio_costo DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE productos ADD COLUMN ultimo_iva INT DEFAULT 0",
      "ALTER TABLE productos ADD COLUMN ultimo_icui DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE productos ADD COLUMN ultimo_ibua DECIMAL(10,2) DEFAULT 0"
    ];

    for (let sql of actualizaciones) {
      try { 
        await query(sql); 
      } catch (e) {
        // Si el error es "Duplicate column name", lo ignoramos porque significa que ya existe
        if (!e.message.includes("Duplicate column name")) {
          console.error("Aviso (No crítico):", e.message);
        }
      }
    }

    // 3. Crear el resto de las tablas
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

    console.log("🚀 Base de datos verificada y lista para operar.");
  } catch (err) {
    console.error("❌ Error crítico en DB:", err.message);
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
  // Extraemos los datos del cuerpo
  const { nombre, precio, stock, codigo_barras } = req.body;
  
  // LIMPIEZA RIGUROSA: Convertimos cualquier 'undefined' en un valor válido para SQL
  const v_nombre = nombre || "Producto sin nombre";
  const v_precio = parseFloat(precio) || 0;
  const v_stock = parseInt(stock) || 0;
  const v_codigo = (codigo_barras === undefined || codigo_barras === "") ? null : codigo_barras;

  try {
    const sql = `INSERT INTO productos 
      (nombre, precio, stock, codigo_barras, precio_costo, ultimo_iva, ultimo_icui, ultimo_ibua) 
      VALUES (?, ?, ?, ?, 0, 0, 0, 0)`;
    
    // Al usar v_codigo, nos aseguramos de que sea un string o null, nunca undefined
    await query(sql, [v_nombre, v_precio, v_stock, v_codigo]);

    res.status(201).json({ mensaje: "✅ Producto creado con éxito" });
  } catch (err) {
    console.error("❌ Error en INSERT productos:", err.message);
    res.status(500).json({ error: err.message });
  }
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
