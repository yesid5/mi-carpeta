const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [seccion, setSeccion] = React.useState("tienda");
  const [verCarrito, setVerCarrito] = React.useState(false);
  const [autenticado, setAutenticado] = React.useState(false);
  const [password, setPassword] = React.useState("");

  const cargarDatos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error al sincronizar"); }
  };

  React.useEffect(() => { cargarDatos(); }, []);

  // --- SEGURIDAD ---
  const verificarAcceso = () => {
    if (password === "1234") { // Cambia aquí tu clave
      setAutenticado(true);
      setSeccion("admin");
    } else {
      alert("❌ Clave incorrecta");
    }
  };

  // --- LÓGICA DE FACTURACIÓN Y CARRITO ---
  const agregarAlCarrito = (p) => {
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
  };

  const procesarVenta = async () => {
    const total = carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
    const factura = {
      tipo: "VENTA",
      nro: `V-${Date.now().toString().slice(-5)}`,
      items: carrito,
      total,
      fecha: new Date().toLocaleString()
    };
    
    // Aquí enviarías 'factura' a tu API
    alert(`📄 Factura de Venta Generada: ${factura.nro}\nTotal: $${total.toLocaleString()}`);
    setCarrito([]);
    setVerCarrito(false);
    cargarDatos();
  };

  const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(""));

  return React.createElement("div", { className: "pos-container" },
    
    // NAVEGACIÓN SUPERIOR
    React.createElement("nav", { className: "top-nav" },
      React.createElement("div", { className: "logo" }, "JP ERP"),
      React.createElement("div", { className: "nav-links" },
        React.createElement("button", { onClick: () => { setSeccion("tienda"); setAutenticado(false); }, className: seccion === "tienda" ? "active" : "" }, "🛒 Ventas"),
        React.createElement("button", { onClick: () => setSeccion("login"), className: seccion === "admin" ? "active" : "" }, "⚙️ Admin")
      )
    ),

    React.createElement("main", { className: "main-panel" },
      
      // VISTA DE LOGIN PARA ADMIN
      seccion === "login" && !autenticado && React.createElement("div", { className: "login-box" },
        React.createElement("h2", null, "Acceso Restringido"),
        React.createElement("input", { type: "password", placeholder: "Ingresa la clave", value: password, onChange: (e) => setPassword(e.target.value) }),
        React.createElement("button", { onClick: verificarAcceso, className: "btn-save" }, "Entrar")
      ),

      // VISTA TIENDA
      seccion === "tienda" && React.createElement("div", { className: "product-grid" },
        filtrados.map(p => 
          React.createElement("div", { key: p.id, className: "product-card", onClick: () => agregarAlCarrito(p) },
            React.createElement("img", { src: p.imagen_url || 'https://img.icons8.com/fluency/100/box.png', className: "prod-img" }),
            React.createElement("div", { className: "card-info" },
              React.createElement("h3", null, p.nombre),
              React.createElement("span", { className: "price" }, `$${Number(p.precio).toLocaleString()}`)
            )
          )
        )
      ),

      // VISTA ADMIN (HORIZONTAL)
      seccion === "admin" && autenticado && React.createElement("div", { className: "admin-horizontal" },
        // Fila 1: Facturación de Compra
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "🧾 Factura de Compra (Ingreso de Mercancía)"),
          React.createElement("div", { className: "admin-form-row" },
            React.createElement("input", { placeholder: "Proveedor" }),
            React.createElement("input", { placeholder: "Producto" }),
            React.createElement("input", { type: "number", placeholder: "Costo Unitario" }),
            React.createElement("input", { type: "number", placeholder: "Cantidad Recibida" }),
            React.createElement("button", { className: "btn-save" }, "Registrar Compra")
          )
        ),
        // Fila 2: Ajustes de Inventario
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "🔄 Otras Entradas / Salidas"),
          React.createElement("div", { className: "admin-form-row" },
            React.createElement("select", null, 
              React.createElement("option", null, "Otras Entradas (Donación/Ajuste)"),
              React.createElement("option", null, "Otras Salidas (Daño/Vencimiento)")
            ),
            React.createElement("input", { placeholder: "Motivo/Concepto" }),
            React.createElement("input", { type: "number", placeholder: "Cantidad" }),
            React.createElement("button", { className: "btn-report" }, "Ejecutar Ajuste")
          )
        )
      )
    ),

    // CARRITO FLOTANTE MEJORADO
    carrito.length > 0 && React.createElement("button", { className: "fab-cart", onClick: () => setVerCarrito(true) },
      "🛒 ", React.createElement("span", { className: "fab-badge" }, carrito.length)
    ),

    // MODAL CONFIRMAR VENTA (REDISEÑADO)
    verCarrito && React.createElement("div", { className: "modal-overlay" },
      React.createElement("div", { className: "modal-content" },
        React.createElement("div", { className: "modal-header" },
          React.createElement("h2", null, "Finalizar Venta"),
          React.createElement("button", { onClick: () => setVerCarrito(false), className: "close-btn" }, "×")
        ),
        React.createElement("div", { className: "confirm-list" },
          carrito.map(item => React.createElement("div", { key: item.id, className: "confirm-item" },
            React.createElement("span", null, `${item.cantidad}x ${item.nombre}`),
            React.createElement("strong", null, `$${(item.precio * item.cantidad).toLocaleString()}`)
          ))
        ),
        React.createElement("div", { className: "confirm-total" }, 
          React.createElement("span", null, "TOTAL A COBRAR:"),
          React.createElement("h2", null, `$${carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0).toLocaleString()}`)
        ),
        React.createElement("div", { className: "modal-actions" },
          React.createElement("button", { className: "btn-pay", onClick: procesarVenta }, "💸 CONFIRMAR PAGO"),
          React.createElement("button", { className: "btn-cancel", onClick: () => setCarrito([]) }, "Vaciar Carrito")
        )
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
