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

    // BOTÓN FLOTANTE MÓVIL
    React.createElement("button", { 
      className: "btn-carrito-flotante", 
      onClick: () => setCarritoAbierto(true) 
    }, `🛒 ${carrito.length}`),

    // SIDEBAR (CARRITO)
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

    // MODAL LOGIN
    mostrarLogin && React.createElement("div", { className: "modal-overlay" },
      React.createElement("div", { className: "modal-content login-box" },
        React.createElement("h2", null, "Acceso Admin"),
        React.createElement("input", { type: "password", className: "input-form", placeholder: "Clave", value: pin, onChange: e => setPin(e.target.value) }),
        React.createElement("button", { className: "btn-pay", onClick: manejarLogin }, "INGRESAR"),
        React.createElement("button", { className: "btn-close", onClick: () => setMostrarLogin(false) }, "Cancelar")
      )
    )
    // ... (puedes añadir aquí los otros modales de inventario y factura siguiendo el mismo patrón si los necesitas)
  );
};

ReactDOM.render(React.createElement(POSApp, null), document.getElementById('root'));
