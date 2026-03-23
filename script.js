const { useState, useEffect } = React;

const POSApp = () => {
  // --- 1. ESTADOS ---
  const [productosDB, setProductosDB] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [statusDB, setStatusDB] = useState('conectando');
  const [cargando, setCargando] = useState(false);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [pin, setPin] = useState('');
  
  const [mostrarInventario, setMostrarInventario] = useState(false);
  const [mostrarFactura, setMostrarFactura] = useState(false);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const [nuevoP, setNuevoP] = useState({ nombre: '', precio: '', stock: '', codigo_barras: '' });
  const [factura, setFactura] = useState({ 
    productoId: '', cantidad: '', precioUnitario: '', iva: 0, icui: 0, ibua: 0,
    numeroFactura: '', fechaVencimiento: '', proveedor: ''
  });

  const API_URL = "https://mi-carpeta.onrender.com"; 
  const CLAVE_ADMIN = "1234"; 

  // --- 2. FUNCIONES DE CARGA ---
  const cargarProductos = async () => {
    try {
      setStatusDB('conectando');
      const res = await fetch(`${API_URL}/productos`);
      if (res.ok) {
        const datos = await res.json();
        setProductosDB(datos);
        setStatusDB('online');
      } else { setStatusDB('offline'); }
    } catch (err) { setStatusDB('offline'); }
  };

  useEffect(() => { cargarProductos(); }, []);

  // --- 3. GESTIÓN DE CARRITO ---
  const agregarAlCarrito = (p) => {
    if (p.stock <= 0) return alert("⚠️ Producto sin existencias");
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) return;
    setCargando(true);
    const datosVenta = {
        total: parseFloat(total),
        metodo_pago: 'Efectivo',
        carrito: carrito.map(item => ({ id: item.id, cantidad: item.cantidad, precio: parseFloat(item.precio) }))
    };
    try {
      const res = await fetch(`${API_URL}/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosVenta)
      });
      if (res.ok) {
        alert("💰 Venta exitosa");
        setCarrito([]);
        setCarritoAbierto(false);
        cargarProductos();
      }
    } catch (e) { alert("Error de conexión con el servidor"); }
    finally { setCargando(false); }
  };

  // --- 4. ADMINISTRACIÓN ---
  const manejarLogin = () => {
    if (pin === CLAVE_ADMIN) {
      setIsAdmin(true);
      setMostrarLogin(false);
      setPin('');
    } else {
      alert("❌ Clave incorrecta");
      setPin('');
    }
  };

  const guardarProducto = async () => {
    if (!nuevoP.nombre || !nuevoP.precio) return alert("Completa los datos");
    try {
      const res = await fetch(`${API_URL}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoP)
      });
      if (res.ok) {
        alert("✅ Producto Creado");
        setMostrarInventario(false);
        setNuevoP({ nombre: '', precio: '', stock: '', codigo_barras: '' });
        cargarProductos();
      }
    } catch (e) { alert("Error al guardar"); }
  };

  const registrarFactura = async () => {
    if (!factura.productoId || !factura.cantidad || !factura.precioUnitario) return alert("Faltan datos");
    const datos = {
      ...factura,
      productoId: parseInt(factura.productoId),
      cantidad: parseInt(factura.cantidad),
      precioUnitario: parseFloat(factura.precioUnitario)
    };
    try {
      const res = await fetch(`${API_URL}/compras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      if (res.ok) {
        alert("✅ Inventario actualizado");
        setMostrarFactura(false);
        cargarProductos();
      }
    } catch (e) { alert("Error al registrar factura"); }
  };

  const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  const productosFiltrados = productosDB.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (p.codigo_barras && p.codigo_barras.includes(busqueda))
  );

  // --- 5. RENDERIZADO ---
  return React.createElement("div", { className: "pos-container" },
    React.createElement("div", { className: "main-panel" },
      React.createElement("header", { className: "pos-header" },
        React.createElement("h1", null, "🏪 Tienda JP"),
        React.createElement("div", { className: "header-actions" },
          React.createElement("div", { className: `status-badge ${statusDB}` }, statusDB.toUpperCase()),
          isAdmin 
            ? React.createElement("button", { className: "btn-admin-access active", onClick: () => setIsAdmin(false) }, "🔓 Salir Admin")
            : React.createElement("button", { className: "btn-admin-access", onClick: () => setMostrarLogin(true) }, "🔒 Admin")
        )
      ),
      
      React.createElement("div", { className: "search-bar-container" },
        React.createElement("input", {
          className: "search-input",
          placeholder: "🔍 Buscar producto...",
          value: busqueda,
          onChange: e => setBusqueda(e.target.value)
        })
      ),

      isAdmin && React.createElement("div", { className: "management-buttons" },
        React.createElement("button", { className: "btn-manage btn-green", onClick: () => setMostrarInventario(true) }, "➕ Producto"),
        React.createElement("button", { className: "btn-manage btn-orange", onClick: () => setMostrarFactura(true) }, "📑 Factura"),
        React.createElement("button", { className: "btn-manage btn-blue", onClick: () => setMostrarReporte(true) }, "📊 Reporte")
      ),
      
      React.createElement("div", { className: "product-grid" },
        productosFiltrados.map(p => 
          React.createElement("div", { key: p.id, className: "product-card", onClick: () => agregarAlCarrito(p) },
            React.createElement("h3", null, p.nombre),
            React.createElement("p", { className: "price" }, `$${parseFloat(p.precio).toLocaleString()}`),
            React.createElement("p", { className: `stock ${p.stock < 5 ? 'low' : ''}` }, `Stock: ${p.stock}`)
          )
        )
      )
    ),

    React.createElement("button", { 
      className: "btn-carrito-flotante", 
      onClick: () => setCarritoAbierto(true) 
    }, `🛒 ${carrito.length}`),

    React.createElement("div", { className: `sidebar ${carritoAbierto ? 'open' : ''}` },
      React.createElement("div", { className: "sidebar-header" },
        React.createElement("h2", null, "🛒 Mi Carrito"),
        React.createElement("button", { className: "btn-close-cart", onClick: () => setCarritoAbierto(false) }, "✕")
      ),
      React.createElement("div", { className: "cart-list" },
        carrito.map(item =>
          React.createElement("div", { key: item.id, className: "cart-item" },
            React.createElement("div", { className: "item-details" }, 
                React.createElement("span", { className: "qty" }, `${item.cantidad}x`),
                React.createElement("span", null, item.nombre)
            ),
            React.createElement("span", null, `$${(item.precio * item.cantidad).toLocaleString()}`)
          )
        )
      ),
      React.createElement("div", { className: "total-section" },
        React.createElement("div", { className: "total-display" },
            React.createElement("h3", null, "Total:"),
            React.createElement("h3", null, `$${total.toLocaleString()}`)
        ),
        React.createElement("button", { className: "btn-pay", onClick: finalizarVenta, disabled: cargando || carrito.length === 0 }, "FINALIZAR VENTA")
      )
    ),

    // --- MODALES ---

    // MODAL LOGIN
    mostrarLogin && React.createElement("div", { className: "modal-overlay" },
      React.createElement("div", { className: "modal-content login-box" },
        React.createElement("h2", null, "Acceso Admin"),
        React.createElement("input", { 
            type: "password", 
            className: "input-form", 
            placeholder: "Clave", 
            value: pin, 
            onChange: e => setPin(e.target.value),
            onKeyPress: e => e.key === 'Enter' && manejarLogin() 
        }),
        React.createElement("button", { className: "btn-pay", onClick: manejarLogin }, "INGRESAR"),
        React.createElement("button", { className: "btn-close", onClick: () => setMostrarLogin(false) }, "Cancelar")
      )
    ),

    // MODAL NUEVO PRODUCTO
    mostrarInventario && React.createElement("div", { className: "modal-overlay" },
      React.createElement("div", { className: "modal-content" },
        React.createElement("h2", null, "📦 Nuevo Producto"),
        React.createElement("input", { className: "input-form", placeholder: "Nombre", value: nuevoP.nombre, onChange: e => setNuevoP({...nuevoP, nombre: e.target.value}) }),
        React.createElement("input", { className: "input-form", placeholder: "Precio Venta", type: "number", value: nuevoP.precio, onChange: e => setNuevoP({...nuevoP, precio: e.target.value}) }),
        React.createElement("input", { className: "input-form", placeholder: "Stock Inicial", type: "number", value: nuevoP.stock, onChange: e => setNuevoP({...nuevoP, stock: e.target.value}) }),
        React.createElement("button", { className: "btn-pay", onClick: guardarProducto }, "GUARDAR"),
        React.createElement("button", { className: "btn-close", onClick: () => setMostrarInventario(false) }, "Cancelar")
      )
    ),

    // MODAL FACTURA (INVENTARIO)
    mostrarFactura && React.createElement("div", { className: "modal-overlay" },
      React.createElement("div", { className: "modal-content" },
        React.createElement("h2", null, "📑 Cargar Inventario"),
        React.createElement("select", { className: "input-form", value: factura.productoId, onChange: e => setFactura({...factura, productoId: e.target.value}) },
          React.createElement("option", { value: "" }, "Seleccione producto..."),
          productosDB.map(p => React.createElement("option", { key: p.id, value: p.id }, p.nombre))
        ),
        React.createElement("input", { className: "input-form", type: "number", placeholder: "Cantidad", onChange: e => setFactura({...factura, cantidad: e.target.value}) }),
        React.createElement("input", { className: "input-form", type: "number", placeholder: "Costo Unitario", onChange: e => setFactura({...factura, precioUnitario: e.target.value}) }),
        React.createElement("button", { className: "btn-pay", style: {background: 'var(--orange)'}, onClick: registrarFactura }, "ACTUALIZAR STOCK"),
        React.createElement("button", { className: "btn-close", onClick: () => setMostrarFactura(false) }, "Cerrar")
      )
    ),

    // MODAL REPORTE
    mostrarReporte && React.createElement("div", { className: "modal-overlay" },
      React.createElement("div", { className: "modal-content" },
        React.createElement("h2", null, "📊 Reporte de Ventas"),
        React.createElement("p", null, "Funcionalidad de reporte próximamente..."),
        React.createElement("button", { className: "btn-close", onClick: () => setMostrarReporte(false) }, "Cerrar")
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp, null), document.getElementById('root'));
