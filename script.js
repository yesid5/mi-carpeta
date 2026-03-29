const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [busqueda, setBusqueda] = React.useState("");
  const [seccion, setSeccion] = React.useState("tienda"); // tienda o admin
  const [verCarrito, setVerCarrito] = React.useState(false);

  // Carga inicial de productos (Asegura que siempre estén disponibles)
  const cargarTodo = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error al cargar datos", e); }
  };

  React.useEffect(() => { cargarTodo(); }, []);

  const agregarAlCarrito = (p) => {
    if (p.stock <= 0) return alert("Sin Stock");
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
  };

  const totalCarrito = carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
  const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return React.createElement("div", { className: "pos-container" },
    
    // NAVEGACIÓN SUPERIOR HORIZONTAL
    React.createElement("nav", { className: "top-nav" },
      React.createElement("div", { className: "logo" }, "JP ERP"),
      React.createElement("div", { className: "nav-links" },
        React.createElement("button", { onClick: () => setSeccion("tienda"), className: seccion === "tienda" ? "active" : "" }, "🛒 Vender"),
        React.createElement("button", { onClick: () => setSeccion("admin"), className: seccion === "admin" ? "active" : "" }, "⚙️ Administrar")
      )
    ),

    React.createElement("main", { className: "main-panel" },
      
      // SECCIÓN TIENDA (POS)
      seccion === "tienda" && [
        React.createElement("div", { className: "search-bar-container", key: "s" },
          React.createElement("input", { 
            className: "search-input", 
            placeholder: "🔍 Buscar producto...", 
            onChange: (e) => setBusqueda(e.target.value) 
          })
        ),
        React.createElement("div", { className: "product-grid", key: "g" },
          filtrados.map(p => 
            React.createElement("div", { key: p.id, className: "product-card", onClick: () => agregarAlCarrito(p) },
              React.createElement("img", { src: p.imagen_url || 'https://img.icons8.com/fluency/100/box.png', className: "prod-img" }),
              React.createElement("div", { className: "card-info" },
                React.createElement("h3", null, p.nombre),
                React.createElement("span", { className: "price" }, `$${Number(p.precio).toLocaleString()}`),
                React.createElement("p", { className: "stock" }, `Stock: ${p.stock}`)
              )
            )
          )
        )
      ],

      // SECCIÓN ADMIN (HORIZONTAL)
      seccion === "admin" && React.createElement("div", { className: "admin-horizontal" },
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "➕ Nuevo Ingreso"),
          React.createElement("div", { className: "admin-form-row" },
            React.createElement("input", { placeholder: "Nombre" }),
            React.createElement("input", { type: "number", placeholder: "Precio" }),
            React.createElement("input", { type: "number", placeholder: "Stock" }),
            React.createElement("button", { className: "btn-save" }, "Guardar")
          )
        ),
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "📊 Cierre y Caja"),
          React.createElement("div", { className: "admin-form-row" },
            React.createElement("button", { className: "btn-report" }, "Generar Reporte Diario"),
            React.createElement("button", { className: "btn-danger" }, "Cerrar Caja")
          )
        )
      )
    ),

    // BOTÓN FLOTANTE CARRITO
    carrito.length > 0 && React.createElement("button", { className: "fab-cart", onClick: () => setVerCarrito(true) },
      "🛒 ", React.createElement("span", null, carrito.length)
    ),

    // MODAL CARRITO
    verCarrito && React.createElement("div", { className: "modal-overlay" },
      React.createElement("div", { className: "modal-content" },
        React.createElement("h2", null, "Confirmar Venta"),
        React.createElement("div", { className: "cart-list" },
          carrito.map(item => React.createElement("div", { key: item.id, className: "cart-item" },
            React.createElement("span", null, item.nombre),
            React.createElement("strong", null, `$${(item.precio * item.cantidad).toLocaleString()}`)
          ))
        ),
        React.createElement("div", { className: "total" }, `Total: $${totalCarrito.toLocaleString()}`),
        React.createElement("button", { className: "btn-pay", onClick: () => alert("Venta procesada") }, "COBRAR"),
        React.createElement("button", { className: "btn-close", onClick: () => setVerCarrito(false) }, "Volver")
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
