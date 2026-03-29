const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [seccion, setSeccion] = React.useState("tienda");
  const [autenticado, setAutenticado] = React.useState(false);
  
  // Estados para formularios
  const [editando, setEditando] = React.useState(null);
  const [compra, setCompra] = React.useState({ nro: '', nit: '', subtotal: 0, impuesto: 19 });

  const cargarDatos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error al cargar"); }
  };

  React.useEffect(() => { cargarDatos(); }, []);

  // --- LÓGICA DE IMPUESTOS ---
  const calcularTotalCompra = () => {
    const imp = (Number(compra.subtotal) * Number(compra.impuesto)) / 100;
    return (Number(compra.subtotal) + imp).toLocaleString();
  };

  // --- ACCIONES DE PRODUCTOS ---
  const guardarProducto = async (p) => {
    const metodo = p.id ? 'PUT' : 'POST';
    const url = p.id ? `${API_URL}/productos/${p.id}` : `${API_URL}/productos`;
    
    await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });
    alert("✅ Operación exitosa");
    setEditando(null);
    cargarDatos();
  };

  return React.createElement("div", { className: "pos-container" },
    
    React.createElement("nav", { className: "top-nav" },
      React.createElement("div", { className: "logo" }, "JP ERP 3.0"),
      React.createElement("div", { className: "nav-links" },
        React.createElement("button", { onClick: () => setSeccion("tienda"), className: seccion === "tienda" ? "active" : "" }, "🛒 Ventas"),
        React.createElement("button", { onClick: () => setSeccion("admin"), className: seccion === "admin" ? "active" : "" }, "📊 Gestión Admin")
      )
    ),

    React.createElement("main", { className: "main-panel" },
      
      seccion === "tienda" && React.createElement("div", { className: "product-grid" },
        productos.map(p => React.createElement("div", { key: p.id, className: "product-card", onClick: () => setCarrito([...carrito, p]) },
          React.createElement("img", { src: p.imagen_url || 'https://img.icons8.com/fluency/100/box.png', className: "prod-img" }),
          React.createElement("h3", null, p.nombre),
          React.createElement("span", { className: "price" }, `$${Number(p.precio).toLocaleString()}`)
        ))
      ),

      seccion === "admin" && React.createElement("div", { className: "admin-horizontal" },
        
        // 1. FACTURA DE COMPRA LEGAL
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "🧾 Registro Factura de Compra"),
          React.createElement("div", { className: "admin-form-row" },
            React.createElement("input", { placeholder: "Nro Factura", onChange: e => setCompra({...compra, nro: e.target.value}) }),
            React.createElement("input", { placeholder: "NIT Proveedor", onChange: e => setCompra({...compra, nit: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Subtotal $", onChange: e => setCompra({...compra, subtotal: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "IVA %", value: compra.impuesto, onChange: e => setCompra({...compra, impuesto: e.target.value}) }),
            React.createElement("div", { className: "total-badge" }, `TOTAL: $${calcularTotalCompra()}`),
            React.createElement("button", { className: "btn-save" }, "Cargar a Inventario")
          )
        ),

        // 2. MODIFICAR / NUEVO PRODUCTO
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, editando ? "📝 Modificando Producto" : "➕ Nuevo Producto"),
          React.createElement("div", { className: "admin-form-row" },
            React.createElement("input", { placeholder: "Nombre", value: editando?.nombre || '', onChange: e => setEditando({...editando, nombre: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Precio Venta", value: editando?.precio || '', onChange: e => setEditando({...editando, precio: e.target.value}) }),
            React.createElement("button", { className: "btn-save", onClick: () => guardarProducto(editando) }, "Guardar Cambios"),
            editando && React.createElement("button", { onClick: () => setEditando(null) }, "Cancelar")
          ),
          // TABLA DE PRODUCTOS PARA EDITAR
          React.createElement("table", { className: "report-table", style: {marginTop: '20px'} },
            React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Producto"), React.createElement("th", null, "Precio"), React.createElement("th", null, "Acción"))),
            React.createElement("tbody", null, productos.map(p => React.createElement("tr", {key: p.id},
              React.createElement("td", null, p.nombre),
              React.createElement("td", null, `$${p.precio}`),
              React.createElement("td", null, React.createElement("button", { onClick: () => setEditando(p) }, "✏️ Editar"))
            )))
          )
        ),

        // 3. CIERRE DE CAJA Y REPORTES
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "📊 Cierre de Caja y Reportes"),
          React.createElement("div", { className: "metrics-grid" },
            React.createElement("div", { className: "metric-box" }, React.createElement("h3", null, "Ventas Hoy"), React.createElement("p", null, "$1,250,000")),
            React.createElement("div", { className: "metric-box" }, React.createElement("h3", null, "Efectivo en Caja"), React.createElement("p", null, "$850,000"))
          ),
          React.createElement("button", { className: "btn-report", style: {width: '100%'} }, "IMPRIMIR CIERRE DEL DÍA")
        )
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
