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

  // ESTADO PARA EDITAR (MODAL NUEVO)
  const [productoEditando, setProductoEditando] = useState(null);

  const [nuevoP, setNuevoP] = useState({ nombre: '', precio: '', stock: 0, codigo_barras: '', imagen_url: '' });
  
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

  // --- 3. FUNCIONES DE PRODUCTOS (EDITAR Y ELIMINAR) ---
  const handleActualizar = async () => {
    try {
      const res = await fetch(`${API_URL}/productos/${productoEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productoEditando)
      });
      if (res.ok) {
        alert("✅ Actualizado con éxito");
        setProductoEditando(null);
        cargarProductos();
      }
    } catch (err) { alert("Error al actualizar"); }
  };

  const eliminarProducto = async (id) => {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;
    try {
      const res = await fetch(`${API_URL}/productos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("🗑️ Producto eliminado");
        cargarProductos();
      } else {
        alert("No se puede eliminar (tiene historial)");
      }
    } catch (err) { alert("Error al eliminar"); }
  };

  // --- 4. GESTIÓN DE CARRITO Y VENTA ---
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
    if (!confirm("¿Confirmar venta?")) return;
    setCargando(true);
    const totalVenta = carrito.reduce((acc, item) => acc + ((item.precio_venta || item.precio) * item.cantidad), 0);
    const datosVenta = {
        total: totalVenta,
        carrito: carrito.map(item => ({ id: item.id, cantidad: item.cantidad, precio: parseFloat(item.precio_venta || item.precio) }))
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
    } catch (e) { alert("Error en el servidor"); }
    finally { setCargando(false); }
  };

  // --- 5. RENDERIZADO (UI) ---
  const total = carrito.reduce((acc, item) => acc + ((item.precio_venta || item.precio) * item.cantidad), 0);
  const productosFiltrados = productosDB.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (p.codigo_barras && p.codigo_barras.includes(busqueda))
  );

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
        React.createElement("button", { className: "btn-manage btn-orange", onClick: () => setMostrarFactura(true) }, "📑 Factura Prov.")
      ),
      
      React.createElement("div", { className: "product-grid" },
        productosFiltrados.map(p => 
          React.createElement("div", { key: p.id, className: "product-card" },
            // MUESTRA IMAGEN
            React.createElement("img", { src: p.imagen_url || 'https://via.placeholder.com/80', className: "prod-img", onClick: () => agregarAlCarrito(p) }),
            React.createElement("h3", null, p.nombre),
            React.createElement("p", { className: "price" }, `$${parseFloat(p.precio_venta || p.precio).toLocaleString()}`),
            React.createElement("p", { className: "stock" }, `Stock: ${p.stock}`),
            // BOTONES ADMIN
            isAdmin && React.createElement("div", { className: "admin-actions" },
                React.createElement("button", { onClick: () => setProductoEditando(p) }, "📝"),
                React.createElement("button", { onClick: () => eliminarProducto(p.id), style: {color:'red'} }, "🗑️")
            )
          )
        )
      )
    ),

    // --- MODAL EDITAR ---
    productoEditando && React.createElement("div", { className: "modal-overlay" },
      React.createElement("div", { className: "modal-content" },
        React.createElement("h2", null, "Editar Producto"),
        React.createElement("input", { className: "input-form", value: productoEditando.nombre, onChange: e => setProductoEditando({...productoEditando, nombre: e.target.value}) }),
        React.createElement("input", { className: "input-form", type: "number", value: productoEditando.precio, onChange: e => setProductoEditando({...productoEditando, precio: e.target.value}) }),
        React.createElement("input", { className: "input-form", placeholder: "URL Imagen", value: productoEditando.imagen_url || '', onChange: e => setProductoEditando({...productoEditando, imagen_url: e.target.value}) }),
        React.createElement("button", { className: "btn-pay", onClick: handleActualizar }, "GUARDAR CAMBIOS"),
        React.createElement("button", { className: "btn-close", onClick: () => setProductoEditando(null) }, "Cancelar")
      )
    ),

    // --- (Aquí irían el resto de tus modales de Login e Inventario que ya tenías) ---
// Busca donde dice mostrarLogin && ... y envuelve el contenido en un FORM
mostrarLogin && React.createElement("div", { className: "modal-overlay" },
  React.createElement("form", { 
    className: "modal-content login-box",
    onSubmit: (e) => { e.preventDefault(); manejarLogin(); } // Previene que la página se recargue
  },
    React.createElement("h2", null, "🔒 Acceso Admin"),
    React.createElement("input", { 
      type: "password", 
      className: "input-form", 
      placeholder: "PIN", 
      value: pin, 
      onChange: e => setPin(e.target.value),
      autoComplete: "current-password" // Ayuda a quitar el aviso del navegador
    }),
    React.createElement("button", { type: "submit", className: "btn-pay" }, "INGRESAR"),
    React.createElement("button", { type: "button", className: "btn-close", onClick: () => setMostrarLogin(false) }, ment(POSApp, null), document.getElementById('root'));
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(POSApp));
