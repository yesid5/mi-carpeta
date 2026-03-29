const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [seccion, setSeccion] = React.useState("tienda");
  const [verCarrito, setVerCarrito] = React.useState(false);

  const cargarDatos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error al cargar"); }
  };

  React.useEffect(() => { cargarDatos(); }, []);

  // --- FUNCIÓN CORREGIDA (AHORA SÍ REACCIONA AL CLIC) ---
  const agregarAlCarrito = (p) => {
    console.log("Producto seleccionado:", p.nombre); // Para probar en consola
    const existe = carrito.find(item => item.id === p.id);
    
    if (existe) {
      setCarrito(carrito.map(item => 
        item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
    // Opcional: abrir el carrito automáticamente al tocar un producto
    setVerCarrito(true); 
  };

  const totalVenta = carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);

  return React.createElement("div", { className: "pos-container" },
    
    // NAVEGACIÓN
    React.createElement("nav", { className: "top-nav" },
      React.createElement("div", { className: "logo" }, "JP ERP 3.0"),
      React.createElement("div", { className: "nav-links" },
        React.createElement("button", { onClick: () => setSeccion("tienda"), className: seccion === "tienda" ? "active" : "" }, "🛒 Ventas"),
        React.createElement("button", { onClick: () => setSeccion("admin"), className: seccion === "admin" ? "active" : "" }, "📊 Gestión Admin")
      )
    ),

    React.createElement("main", { className: "main-panel" },
      
      // VISTA TIENDA (FORZANDO GRID)
      seccion === "tienda" && React.createElement("div", { className: "product-grid" },
        productos.map(p => 
          React.createElement("div", { 
            key: p.id, 
            className: "product-card", 
            onClick: () => agregarAlCarrito(p) // ACTIVADO
          },
            React.createElement("div", { className: "img-container" },
              React.createElement("img", { src: p.imagen_url || 'https://img.icons8.com/fluency/100/box.png', className: "prod-img" })
            ),
            React.createElement("div", { className: "card-info" },
              React.createElement("h3", null, p.nombre),
              React.createElement("span", { className: "price" }, `$${Number(p.precio).toLocaleString()}`),
              React.createElement("button", { className: "btn-add-quick" }, "Añadir +")
            )
          )
        )
      ),

      // VISTA ADMIN (SE MANTIENE IGUAL)
      seccion === "admin" && React.createElement("div", { className: "admin-horizontal" },
         React.createElement("h2", null, "Panel de Control"),
         React.createElement("p", null, "Aquí van tus funciones de Factura de Compra, NIT y Reportes...")
      )
    ),

    // MODAL DE CONFIRMACIÓN (PARA VER QUE EL CLIC FUNCIONÓ)
    verCarrito && carrito.length > 0 && React.createElement("div", { className: "modal-overlay" },
      React.createElement("div", { className: "modal-content" },
        React.createElement("h2", null, "Pedido Actual"),
        React.createElement("div", { className: "confirm-list" },
          carrito.map(item => React.createElement("div", { key: item.id, className: "confirm-item" },
            React.createElement("span", null, `${item.cantidad}x ${item.nombre}`),
            React.createElement("strong", null, `$${(item.precio * item.cantidad).toLocaleString()}`)
          ))
        ),
        React.createElement("h3", { style: {textAlign: 'center'} }, `Total: $${totalVenta.toLocaleString()}`),
        React.createElement("div", { className: "modal-actions" },
          React.createElement("button", { className: "btn-pay", onClick: () => alert("Cobrado!") }, "COBRAR"),
          React.createElement("button", { className: "btn-cancel", onClick: () => setVerCarrito(false) }, "Seguir Vendiendo")
        )
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
