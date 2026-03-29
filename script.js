const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [seccion, setSeccion] = React.useState("tienda");
  const [verCarrito, setVerCarrito] = React.useState(false);
  
  // Estados para Admin
  const [editando, setEditando] = React.useState(null);
  const [compra, setCompra] = React.useState({ nro: '', nit: '', subtotal: 0, impuesto: 19 });

  const cargarDatos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error al cargar datos"); }
  };

  React.useEffect(() => { cargarDatos(); }, []);

  // --- LÓGICA DE VENTAS ---
  const agregarAlCarrito = (p) => {
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
    setVerCarrito(true);
  };

  // --- LÓGICA DE ADMIN ---
  const calcularTotalCompra = () => {
    const sub = Number(compra.subtotal) || 0;
    const imp = (sub * (Number(compra.impuesto) || 0)) / 100;
    return (sub + imp).toLocaleString();
  };

  const guardarProducto = async (p) => {
    if(!p.nombre || !p.precio) return alert("Llena los campos básicos");
    const metodo = p.id ? 'PUT' : 'POST';
    const url = p.id ? `${API_URL}/productos/${p.id}` : `${API_URL}/productos`;
    
    try {
      await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
      alert("✅ Guardado correctamente");
      setEditando(null);
      cargarDatos();
    } catch (e) { alert("Error al guardar"); }
  };

  return React.createElement("div", { className: "pos-container" },
    
    // NAVEGACIÓN SUPERIOR
    React.createElement("nav", { className: "top-nav" },
      React.createElement("div", { className: "nav-logo" }, "JP ERP 3.0"),
      React.createElement("div", { className: "nav-links" },
        React.createElement("button", { onClick: () => setSeccion("tienda"), className: seccion === "tienda" ? "active" : "" }, "🛒 Ventas"),
        React.createElement("button", { onClick: () => setSeccion("admin"), className: seccion === "admin" ? "active" : "" }, "⚙️ Gestión Admin")
      )
    ),

    React.createElement("main", { className: "main-panel" },
      
      // VISTA DE VENTAS (GRID)
      seccion === "tienda" && React.createElement("div", { className: "product-grid" },
        productos.map(p => 
          React.createElement("div", { key: p.id, className: "product-card", onClick: () => agregarAlCarrito(p) },
            React.createElement("img", { src: p.imagen_url || 'https://img.icons8.com/fluency/100/box.png', className: "prod-img" }),
            React.createElement("div", { className: "card-info" },
              React.createElement("h3", null, p.nombre),
              React.createElement("span", { className: "price" }, `$${Number(p.precio).toLocaleString()}`)
            )
          )
        )
      ),

      // VISTA ADMIN (CONTENIDO REAL)
      seccion === "admin" && React.createElement("div", { className: "admin-horizontal" },
        
        // 1. FACTURA DE COMPRA
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "🧾 Registro Factura de Compra"),
          React.createElement("div", { className: "admin-form-row" },
            React.createElement("input", { placeholder: "Nro Factura", onChange: e => setCompra({...compra, nro: e.target.value}) }),
            React.createElement("input", { placeholder: "NIT Proveedor", onChange: e => setCompra({...compra, nit: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Subtotal $", onChange: e => setCompra({...compra, subtotal: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "IVA %", value: compra.impuesto, onChange: e => setCompra({...compra, impuesto: e.target.value}) }),
            React.createElement("div", { className: "total-badge" }, `TOTAL: $${calcularTotalCompra()}`),
            React.createElement("button", { className: "btn-save" }, "Registrar Compra")
          )
        ),

        // 2. GESTIÓN DE PRODUCTOS (EDITAR / NUEVO)
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, editando?.id ? "📝 Modificar Producto" : "➕ Nuevo Producto"),
          React.createElement("div", { className: "admin-form-row" },
            React.createElement("input", { placeholder: "Nombre", value: editando?.nombre || '', onChange: e => setEditando({...editando, nombre: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Precio", value: editando?.precio || '', onChange: e => setEditando({...editando, precio: e.target.value}) }),
            React.createElement("button", { className: "btn-save", onClick: () => guardarProducto(editando) }, "Guardar"),
            editando && React.createElement("button", { className: "btn-cancel", onClick: () => setEditando(null) }, "Limpiar")
          ),
          // TABLA PARA EDITAR
          React.createElement("table", { className: "report-table", style: {marginTop: '20px'} },
            React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Producto"), React.createElement("th", null, "Precio"), React.createElement("th", null, "Acción"))),
            React.createElement("tbody", null, productos.map(p => React.createElement("tr", {key: p.id},
              React.createElement("td", null, p.nombre),
              React.createElement("td", null, `$${Number(p.precio).toLocaleString()}`),
              React.createElement("td", null, React.createElement("button", { className: "btn-edit-small", onClick: () => setEditando(p) }, "✏️"))
            )))
          )
        ),

        // 3. CIERRE DE CAJA
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "📊 Cierre de Caja"),
          React.createElement("div", { className: "metrics-grid" },
            React.createElement("div", { className: "metric-box" }, React.createElement("h3", null, "Ventas de Hoy"), React.createElement("p", null, "$0.00")),
            React.createElement("div", { className: "metric-box" }, React.createElement("h3", null, "Otras Salidas"), React.createElement("p", null, "$0.00"))
          ),
          React.createElement("button", { className: "btn-report", style: {width: '100%'} }, "GENERAR REPORTE PDF")
        )
      )
    ),

    // MODAL CARRITO
    verCarrito && carrito.length > 0 && React.createElement("div", { className: "modal-overlay" },
      React.createElement("div", { className: "modal-content" },
        React.createElement("div", { className: "modal-header" }, React.createElement("h2", null, "Confirmar"), React.createElement("button", { onClick: () => setVerCarrito(false) }, "×")),
        React.createElement("div", { className: "confirm-list" },
          carrito.map(item => React.createElement("div", { key: item.id, className: "confirm-item" },
            React.createElement("span", null, `${item.cantidad}x ${item.nombre}`),
            React.createElement("strong", null, `$${(item.precio * item.cantidad).toLocaleString()}`)
          ))
        ),
        React.createElement("div", { className: "confirm-total" }, React.createElement("h2", null, `Total: $${carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0).toLocaleString()}`)),
        React.createElement("div", { className: "modal-actions" },
          React.createElement("button", { className: "btn-pay", onClick: () => { alert("Venta Exitosa"); setCarrito([]); setVerCarrito(false); } }, "COBRAR"),
          React.createElement("button", { className: "btn-cancel", onClick: () => setVerCarrito(false) }, "Cerrar")
        )
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
