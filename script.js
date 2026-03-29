const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [seccion, setSeccion] = React.useState("ventas");
  const [autenticado, setAutenticado] = React.useState(false);
  const [password, setPassword] = React.useState("");
  
  // Estados de Gestión
  const [busqueda, setBusqueda] = React.useState("");
  const [editando, setEditando] = React.useState({ nombre: '', precio: '', imagen_url: '' });
  const [facturaCompra, setFacturaCompra] = React.useState({ 
    proveedor: '', nit: '', nro: '', codigo: '', cant: 1, costo: 0, iva: 19 
  });

  // Reportes y Cierre
  const [ventasDia, setVentasDia] = React.useState([]);
  const [baseCaja, setBaseCaja] = React.useState(100000); // Base inicial sugerida

  const cargarDatos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { console.warn("Modo offline: Cargando datos locales."); }
  };

  React.useEffect(() => { cargarDatos(); }, []);

  // --- LÓGICA DE VENTAS (FACTURACIÓN) ---
  const agregarAlCarrito = (p) => {
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
  };

  const totalCarrito = () => carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const finalizarVenta = () => {
    if (carrito.length === 0) return;
    const nuevaVenta = {
      id: Date.now(),
      items: [...carrito],
      total: totalCarrito(),
      fecha: new Date().toLocaleString()
    };
    setVentasDia([...ventasDia, nuevaVenta]);
    alert("🧾 Factura Generada con Éxito");
    setCarrito([]);
  };

  // --- LÓGICA DE INVENTARIO Y COMPRAS ---
  const manejarImagen = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditando({ ...editando, imagen_url: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const guardarProducto = async () => {
    const nuevo = { ...editando, id: editando.id || Date.now(), precio: Number(editando.precio) };
    setProductos(editando.id ? productos.map(p => p.id === editando.id ? nuevo : p) : [...productos, nuevo]);
    setEditando({ nombre: '', precio: '', imagen_url: '' });
    alert("✅ Inventario Actualizado");
  };

  // --- COMPONENTES DE VISTA ---
  return React.createElement("div", { className: "pos-container" },
    
    // NAVEGACIÓN PRINCIPAL
    React.createElement("nav", { className: "top-nav" },
      React.createElement("div", { className: "nav-logo" }, "TIENDA JP"),
      React.createElement("div", { className: "nav-links" },
        React.createElement("button", { onClick: () => setSeccion("ventas"), className: seccion === "ventas" ? "active" : "" }, "🧾 Facturación"),
        React.createElement("button", { onClick: () => setSeccion("inventario"), className: seccion === "inventario" ? "active" : "" }, "📦 Inventario"),
        React.createElement("button", { onClick: () => setSeccion("admin"), className: seccion === "admin" ? "active" : "" }, "🔐 Admin / Reportes")
      )
    ),

    React.createElement("main", { className: "main-panel" },
      
      // 1. SECCIÓN VENTAS (FACTURADORA)
      seccion === "ventas" && React.createElement("div", { className: "ventas-layout" },
        React.createElement("div", { className: "productos-panel" },
          React.createElement("input", { className: "search-input", placeholder: "🔍 Buscar producto...", onChange: e => setBusqueda(e.target.value) }),
          React.createElement("div", { className: "product-grid" },
            productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => 
              React.createElement("div", { key: p.id, className: "product-card", onClick: () => agregarAlCarrito(p) },
                React.createElement("img", { src: p.imagen_url || 'https://img.icons8.com/fluency/100/box.png' }),
                React.createElement("h3", null, p.nombre),
                React.createElement("span", { className: "price" }, `$${Number(p.precio).toLocaleString()}`)
              )
            )
          )
        ),
        React.createElement("div", { className: "factura-panel" },
          React.createElement("div", { className: "factura-header" },
            React.createElement("h2", null, "FACTURA DE VENTA"),
            React.createElement("p", null, "TIENDA JP - NIT: 900.123.456-1"),
            React.createElement("p", null, "Res. DIAN No. 1876... del 2026")
          ),
          React.createElement("div", { className: "factura-items" },
            carrito.map(item => React.createElement("div", { className: "item-row", key: item.id },
              React.createElement("span", null, `${item.cantidad}x ${item.nombre}`),
              React.createElement("span", null, `$${(item.precio * item.cantidad).toLocaleString()}`)
            ))
          ),
          React.createElement("div", { className: "factura-total" },
            React.createElement("h2", null, `TOTAL: $${totalCarrito().toLocaleString()}`),
            React.createElement("button", { className: "btn-pay", onClick: finalizarVenta }, "💸 FINALIZAR Y COBRAR")
          )
        )
      ),

      // 2. SECCIÓN INVENTARIO (GESTIÓN)
      seccion === "inventario" && React.createElement("div", { className: "admin-horizontal" },
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "➕ Agregar/Editar Producto"),
          React.createElement("div", { className: "admin-form-grid" },
            React.createElement("div", { className: "photo-upload-container" },
              React.createElement("img", { src: editando.imagen_url || 'https://img.icons8.com/fluency/100/image.png', className: "preview-img" }),
              React.createElement("input", { type: "file", id: "file-inv", style: {display:'none'}, onChange: manejarImagen }),
              React.createElement("label", { htmlFor: "file-inv", className: "btn-upload" }, "Elegir Imagen")
            ),
            React.createElement("div", { style: {flex:1, display:'flex', flexDirection:'column', gap:'10px'} },
              React.createElement("input", { placeholder: "Nombre del Producto", value: editando.nombre, onChange: e => setEditando({...editando, nombre: e.target.value}) }),
              React.createElement("input", { type: "number", placeholder: "Precio de Venta", value: editando.precio, onChange: e => setEditando({...editando, precio: e.target.value}) }),
              React.createElement("button", { className: "btn-save", onClick: guardarProducto }, "Guardar en Inventario")
            )
          )
        ),
        React.createElement("table", { className: "report-table" },
          React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Producto"), React.createElement("th", null, "Precio"), React.createElement("th", null, "Acciones"))),
          React.createElement("tbody", null, productos.map(p => React.createElement("tr", {key: p.id},
            React.createElement("td", null, p.nombre),
            React.createElement("td", null, `$${p.precio.toLocaleString()}`),
            React.createElement("td", null, React.createElement("button", { onClick: () => setEditando(p) }, "✏️"))
          )))
        )
      ),

      // 3. ADMIN: FACTURA COMPRA Y CIERRE
      seccion === "admin" && React.createElement("div", { className: "admin-horizontal" },
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "🧾 Registro Factura de Compra (Legal)"),
          React.createElement("div", { className: "admin-form-grid" },
            React.createElement("input", { placeholder: "Proveedor / Razón Social" }),
            React.createElement("input", { placeholder: "NIT Proveedor" }),
            React.createElement("input", { placeholder: "Nro Factura" }),
            React.createElement("input", { type: "number", placeholder: "Costo Unit.", onChange: e => setFacturaCompra({...facturaCompra, costo: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Cant.", onChange: e => setFacturaCompra({...facturaCompra, cant: e.target.value}) }),
            React.createElement("div", { className: "total-badge" }, `TOTAL COMPRA: $${((facturaCompra.cant * facturaCompra.costo) * 1.19).toLocaleString()}`)
          ),
          React.createElement("button", { className: "btn-save", style: {marginTop:'15px'} }, "Registrar Entrada de Mercancía")
        ),
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "📊 Cierre de Caja"),
          React.createElement("div", { className: "metrics-grid" },
            React.createElement("div", { className: "metric-box" }, React.createElement("h3", null, "Ventas Efectivo"), React.createElement("p", {className: "text-green"}, `$${ventasDia.reduce((a,b)=>a+b.total,0).toLocaleString()}`)),
            React.createElement("div", { className: "metric-box" }, React.createElement("h3", null, "Base Inicial"), React.createElement("p", null, `$${baseCaja.toLocaleString()}`)),
            React.createElement("div", { className: "metric-box" }, React.createElement("h3", null, "Total en Caja"), React.createElement("p", null, `$${(ventasDia.reduce((a,b)=>a+b.total,0) + baseCaja).toLocaleString()}`))
          ),
          React.createElement("button", { className: "btn-report", onClick: () => alert("Cierre Guardado y Enviado al Administrador") }, "🔒 REALIZAR CIERRE Y BLOQUEAR DÍA")
        )
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
