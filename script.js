const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [busqueda, setBusqueda] = React.useState("");
  const [verAdmin, setVerAdmin] = React.useState(false);
  const [verCarrito, setVerCarrito] = React.useState(false);
  
  // Estados para Admin
  const [nuevoProd, setNuevoProd] = React.useState({ nombre: '', precio: '', stock: '', imagen_url: '' });

  const cargarProductos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error de carga", e); }
  };

  React.useEffect(() => { cargarProductos(); }, []);

  // --- LÓGICA DEL CARRITO ---
  const agregarAlCarrito = (p) => {
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
  };

  const quitarDelCarrito = (id) => {
    const existe = carrito.find(item => item.id === id);
    if (existe.cantidad === 1) {
      setCarrito(carrito.filter(item => item.id !== id));
    } else {
      setCarrito(carrito.map(item => item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item));
    }
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) return;
    const total = carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
    try {
      const res = await fetch(`${API_URL}/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total, carrito })
      });
      if (res.ok) {
        alert("💰 Venta procesada");
        setCarrito([]);
        setVerCarrito(false);
        cargarProductos();
      }
    } catch (e) { alert("Error en el pago"); }
  };

  // --- LÓGICA ADMIN (PRODUCTOS / INVENTARIO) ---
  const guardarProducto = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoProd)
      });
      if (res.ok) {
        alert("Producto Guardado");
        setNuevoProd({ nombre: '', precio: '', stock: '', imagen_url: '' });
        cargarProductos();
      }
    } catch (e) { alert("Error al guardar"); }
  };

  const cerrarCaja = () => {
    const totalDia = 0; // Aquí conectarías con un endpoint de reporte
    alert("Caja cerrada. Reporte enviado al administrador.");
  };

  const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const totalCarrito = carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
  const itemsTotales = carrito.reduce((acc, i) => acc + i.cantidad, 0);

  return React.createElement("div", { className: "pos-container" },
    
    // PANEL PRINCIPAL
    React.createElement("div", { className: "main-panel" },
      React.createElement("header", { className: "header" },
        React.createElement("h1", null, "🏪 Tienda JP"),
        React.createElement("button", { className: "btn-admin-toggle", onClick: () => setVerAdmin(!verAdmin) }, verAdmin ? "Ver Tienda" : "⚙️ Admin")
      ),

      !verAdmin ? [
        React.createElement("div", { className: "search-bar-container", key: "search" },
          React.createElement("input", {
            type: "text",
            className: "search-input",
            placeholder: "🔍 Buscar producto...",
            value: busqueda,
            onChange: (e) => setBusqueda(e.target.value)
          })
        ),
        React.createElement("div", { className: "product-grid", key: "grid" },
          filtrados.map(p => 
            React.createElement("div", { key: p.id, className: "product-card", onClick: () => agregarAlCarrito(p) },
              React.createElement("img", { src: p.imagen_url || 'https://img.icons8.com/fluency/100/box.png', className: "prod-img" }),
              React.createElement("div", { className: "card-info" },
                React.createElement("h3", null, p.nombre),
                React.createElement("span", { className: "price" }, `$${Number(p.precio).toLocaleString()}`),
                React.createElement("p", { className: "stock-label" }, `Stock: ${p.stock}`)
              )
            )
          )
        )
      ] : 
      // PANEL ADMIN
      React.createElement("div", { className: "admin-panel" },
        React.createElement("h2", null, "Gestión de Inventario"),
        React.createElement("div", { className: "admin-form" },
          React.createElement("input", { placeholder: "Nombre Producto", value: nuevoProd.nombre, onChange: e => setNuevoProd({...nuevoProd, nombre: e.target.value}) }),
          React.createElement("input", { type: "number", placeholder: "Precio", value: nuevoProd.precio, onChange: e => setNuevoProd({...nuevoProd, precio: e.target.value}) }),
          React.createElement("input", { type: "number", placeholder: "Stock Inicial", value: nuevoProd.stock, onChange: e => setNuevoProd({...nuevoProd, stock: e.target.value}) }),
          React.createElement("button", { onClick: guardarProducto, className: "btn-pay" }, "Añadir a Inventario")
        ),
        React.createElement("hr"),
        React.createElement("button", { onClick: cerrarCaja, className: "btn-danger" }, "Cerrar Caja del Día")
      )
    ),

    // BOTÓN FLOTANTE CARRITO
    !verAdmin && React.createElement("button", { className: "btn-flotante", onClick: () => setVerCarrito(true) },
      "🛒 ", React.createElement("span", null, itemsTotales)
    ),

    // MODAL CARRITO FLOTANTE
    verCarrito && React.createElement("div", { className: "modal-overlay" },
      React.createElement("div", { className: "modal-content cart-modal" },
        React.createElement("h2", null, "Tu Compra"),
        React.createElement("div", { className: "cart-list" },
          carrito.map(item => 
            React.createElement("div", { key: item.id, className: "cart-item" },
              React.createElement("div", null, item.nombre),
              React.createElement("div", { className: "qty-controls" },
                React.createElement("button", { onClick: () => quitarDelCarrito(item.id) }, "-"),
                React.createElement("span", null, item.cantidad),
                React.createElement("button", { onClick: () => agregarAlCarrito(item) }, "+")
              ),
              React.createElement("strong", null, `$${(item.precio * item.cantidad).toLocaleString()}`)
            )
          )
        ),
        React.createElement("div", { className: "total-display" }, `Total: $${totalCarrito.toLocaleString()}`),
        React.createElement("button", { className: "btn-pay", onClick: finalizarVenta }, "PAGAR"),
        React.createElement("button", { className: "btn-close", onClick: () => setVerCarrito(false) }, "Volver")
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
