const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  // --- INTENTAR CARGAR DATOS RESPALDADOS DESDE LOCALSTORAGE AL INICIAR ---
  const [productos, setProductos] = React.useState(() => {
    const localProds = localStorage.getItem("merca_productos");
    return localProds ? JSON.parse(localProds) : [];
  });

  const [facturasCompraRegistradas, setFacturasCompraRegistradas] = React.useState(() => {
    const localCompras = localStorage.getItem("merca_compras");
    return localCompras ? JSON.parse(localCompras) : [];
  });

  const [ventasDia, setVentasDia] = React.useState(() => {
    const localVentas = localStorage.getItem("merca_ventas");
    return localVentas ? JSON.parse(localVentas) : [];
  });

  // Estados de control de flujo
  const [carrito, setCarrito] = React.useState([]);
  const [seccion, setSeccion] = React.useState("ventas");
  const [busqueda, setBusqueda] = React.useState("");
  
  const productoVacio = { nombre: '', precio: '', cantidad: 0, imagen_url: '' };
  const [editando, setEditando] = React.useState(productoVacio);
  
  const compraVacia = { proveedor: '', nit: '', nroFactura: '', codigoBarras: '', descripcion: '', costoUnit: 0, unidades: 1 };
  const [formularioCompra, setFormularioCompra] = React.useState(compraVacia);
  const [baseCaja, setBaseCaja] = React.useState(100000); 

  // --- GUARDIANES (useEffect): GUARDAN EN DISCO CADA VEZ QUE ALGO CAMBIA ---
  React.useEffect(() => {
    localStorage.setItem("merca_productos", JSON.stringify(productos));
  }, [productos]);

  React.useEffect(() => {
    localStorage.setItem("merca_compras", JSON.stringify(facturasCompraRegistradas));
  }, [facturasCompraRegistradas]);

  React.useEffect(() => {
    localStorage.setItem("merca_ventas", JSON.stringify(ventasDia));
  }, [ventasDia]);

  // Sincronización inicial opcional con API externa
  const cargarDatosDesdeServidor = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setProductos(data);
      }
    } catch (e) { 
      console.log("Trabajando con la base de datos local del navegador."); 
    }
  };

  React.useEffect(() => { 
    // Si tienes datos locales, los respeta; si está vacío, intenta buscar del servidor
    if (productos.length === 0) cargarDatosDesdeServidor(); 
  }, []);

  // --- LÓGICA DE VENTAS ---
  const agregarAlCarrito = (p) => {
    if (p.cantidad <= 0) return alert("⚠️ Producto sin inventario disponible.");
    
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      if (existe.cantidad >= p.cantidad) return alert("⚠️ Superas el stock disponible.");
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
  };

  const totalCarrito = () => carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const finalizarVenta = () => {
    if (carrito.length === 0) return;
    
    const nuevosProductos = productos.map(p => {
      const itemEnCarrito = carrito.find(c => c.id === p.id);
      return itemEnCarrito ? { ...p, cantidad: p.cantidad - itemEnCarrito.cantidad } : p;
    });
    setProductos(nuevosProductos);

    const nuevaVenta = {
      id: Date.now(),
      items: [...carrito],
      total: totalCarrito(),
      fecha: new Date().toLocaleString()
    };
    setVentasDia([...ventasDia, nuevaVenta]);
    alert("🧾 Factura de Venta Emitida y Guardada");
    setCarrito([]);
  };

  // --- LÓGICA DE INVENTARIO ---
  const manejarImagen = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditando({ ...editando, imagen_url: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const guardarProducto = () => {
    if (!editando.nombre || !editando.precio) return alert("Faltan datos obligatorios.");
    
    const nuevo = { 
      ...editando, 
      id: editando.id || Date.now(), 
      precio: Number(editando.precio),
      cantidad: Number(editando.cantidad) || 0 
    };
    
    setProductos(editando.id ? productos.map(p => p.id === editando.id ? nuevo : p) : [...productos, nuevo]);
    setEditando(productoVacio);
    alert("✅ Cambios retenidos en la base de datos local");
  };

  // --- ENTRADA DE MERCANCÍA ---
  const registrarFacturaCompra = () => {
    const { proveedor, nroFactura, descripcion, costoUnit, unidades } = formularioCompra;
    if (!proveedor || !nroFactura || !descripcion) return alert("Por favor llena los campos clave.");

    const costoTotalItem = Number(costoUnit) * Number(unidades);
    const totalConIva = costoTotalItem * 1.19;

    const nuevaFacturaCompra = {
      ...formularioCompra,
      id: Date.now(),
      totalItem: costoTotalItem,
      totalConIva: totalConIva,
      fecha: new Date().toLocaleString()
    };

    setFacturasCompraRegistradas([...facturasCompraRegistradas, nuevaFacturaCompra]);

    const existeEnInventario = productos.find(p => p.nombre.toLowerCase() === descripcion.toLowerCase());
    
    if (existeEnInventario) {
      setProductos(productos.map(p => 
        p.id === existeEnInventario.id ? { ...p, cantidad: p.cantidad + Number(unidades) } : p
      ));
    } else {
      const nuevoProductoComprado = {
        id: Date.now(),
        nombre: descripcion,
        precio: Number(costoUnit) * 1.30, 
        cantidad: Number(unidades),
        imagen_url: ''
      };
      setProductos([...productos, nuevoProductoComprado]);
    }

    setFormularioCompra(compraVacia);
    alert("✅ Compra grabada en el historial y stock actualizado.");
  };

  return React.createElement("div", { className: "pos-container" },
    
    // NAV
    React.createElement("nav", { className: "top-nav" },
      React.createElement("div", { className: "nav-logo" }, "MERCAEXPRESS 33"),
      React.createElement("div", { className: "nav-links" },
        React.createElement("button", { onClick: () => setSeccion("ventas"), className: seccion === "ventas" ? "active" : "" }, "🧾 Facturación"),
        React.createElement("button", { onClick: () => setSeccion("inventario"), className: seccion === "inventario" ? "active" : "" }, "📦 Inventario y Stock"),
        React.createElement("button", { onClick: () => setSeccion("admin"), className: seccion === "admin" ? "active" : "" }, "🔐 Compras y Reportes")
      )
    ),

    React.createElement("main", { className: "main-panel" },
      
      // MOSTRADOR (VENTAS)
      seccion === "ventas" && React.createElement("div", { className: "ventas-layout" },
        React.createElement("div", { className: "productos-panel" },
          React.createElement("input", { className: "search-input", placeholder: "🔍 Buscar producto en mostrador...", onChange: e => setBusqueda(e.target.value) }),
          React.createElement("div", { className: "product-grid" },
            productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => 
              React.createElement("div", { key: p.id, className: p.cantidad <= 0 ? "product-card sin-stock" : "product-card", onClick: () => agregarAlCarrito(p) },
                React.createElement("img", { src: p.imagen_url || 'https://img.icons8.com/fluency/100/box.png' }),
                React.createElement("h3", null, p.nombre),
                React.createElement("div", { style: {display:'flex', justifyContent:'space-between', marginTop:'5px'} },
                  React.createElement("span", { className: "price" }, `$${p.precio.toLocaleString()}`),
                  React.createElement("span", { className: "stock-tag" }, `Cant: ${p.cantidad}`)
                )
              )
            )
          )
        ),
        React.createElement("div", { className: "factura-panel" },
          React.createElement("div", { className: "factura-header" },
            React.createElement("h2", null, "FACTURA DE VENTA"),
            React.createElement("p", null, "MERCAEXPRESS 33 - NIT: 900.123.456-1"),
            React.createElement("p", null, "Bogotá, Colombia")
          ),
          React.createElement("div", { className: "factura-items" },
            carrito.map(item => React.createElement("div", { className: "item-row", key: item.id },
              React.createElement("span", null, `${item.cantidad}x ${item.nombre}`),
              React.createElement("span", null, `$${(item.precio * item.cantidad).toLocaleString()}`)
            ))
          ),
          React.createElement("div", { className: "factura-total" },
            React.createElement("h2", null, `TOTAL: $${totalCarrito().toLocaleString()}`),
            React.createElement("button", { className: "btn-pay", onClick: finalizarVenta }, "💸 REGISTRAR VENTA")
          )
        )
      ),

      // INVENTARIO Y STOCK
      seccion === "inventario" && React.createElement("div", { className: "admin-horizontal" },
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, editando.id ? "✏️ Modificar Producto" : "➕ Crear Producto Manual"),
          React.createElement("div", { className: "admin-form-grid" },
            React.createElement("div", { className: "photo-upload-container" },
              React.createElement("img", { src: editando.imagen_url || 'https://img.icons8.com/fluency/100/image.png', className: "preview-img" }),
              React.createElement("input", { type: "file", id: "file-inv", style: {display:'none'}, onChange: manejarImagen }),
              React.createElement("label", { htmlFor: "file-inv", className: "btn-upload" }, "Subir Foto")
            ),
            React.createElement("div", { style: {flex:1, display:'flex', flexDirection:'column', gap:'10px'} },
              React.createElement("input", { placeholder: "Nombre del Producto", value: editando.nombre, onChange: e => setEditando({...editando, nombre: e.target.value}) }),
              React.createElement("input", { type: "number", placeholder: "Precio de Venta", value: editando.precio, onChange: e => setEditando({...editando, precio: e.target.value}) }),
              React.createElement("input", { type: "number", placeholder: "Stock Inicial", value: editando.cantidad, onChange: e => setEditando({...editando, cantidad: e.target.value}) }),
              React.createElement("button", { className: "btn-save", onClick: guardarProducto }, "Confirmar Ítem")
            )
          )
        ),
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "📦 Control Real de Existencias e Inventario"),
          React.createElement("table", { className: "report-table" },
            React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Producto"), React.createElement("th", null, "Precio"), React.createElement("th", null, "Stock"), React.createElement("th", null, "Estado"), React.createElement("th", null, "Acción"))),
            React.createElement("tbody", null, productos.map(p => React.createElement("tr", {key: p.id},
              React.createElement("td", null, p.nombre),
              React.createElement("td", null, `$${p.precio.toLocaleString()}`),
              React.createElement("td", { style: {fontWeight: 'bold'} }, p.cantidad),
              React.createElement("td", null, p.cantidad <= 0 ? React.createElement("span", {className:"badge-danger"}, "Agotado") : React.createElement("span", {className:"badge-success"}, "Disponible")),
              React.createElement("td", null, React.createElement("button", { className: "btn-edit-small", onClick: () => setEditando(p) }, "✏️"))
            )))
          )
        )
      ),

      // COMPRAS Y REPORTES
      seccion === "admin" && React.createElement("div", { className: "admin-horizontal" },
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "🧾 Registro Factura de Compra Legal"),
          React.createElement("div", { className: "admin-form-grid" },
            React.createElement("input", { placeholder: "Proveedor", value: formularioCompra.proveedor, onChange: e => setFormularioCompra({...formularioCompra, proveedor: e.target.value}) }),
            React.createElement("input", { placeholder: "NIT Proveedor", value: formularioCompra.nit, onChange: e => setFormularioCompra({...formularioCompra, nit: e.target.value}) }),
            React.createElement("input", { placeholder: "Nro Factura", value: formularioCompra.nroFactura, onChange: e => setFormularioCompra({...formularioCompra, nroFactura: e.target.value}) }),
            React.createElement("input", { placeholder: "Código de Barras", value: formularioCompra.codigoBarras, onChange: e => setFormularioCompra({...formularioCompra, codigoBarras: e.target.value}) }),
            React.createElement("input", { placeholder: "Descripción Producto", value: formularioCompra.descripcion, onChange: e => setFormularioCompra({...formularioCompra, descripcion: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Costo Unitario ($)", value: formularioCompra.costoUnit, onChange: e => setFormularioCompra({...formularioCompra, costoUnit: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Unidades", value: formularioCompra.unidades, onChange: e => setFormularioCompra({...formularioCompra, unidades: e.target.value}) }),
            React.createElement("div", { className: "total-badge" }, 
              `SUBTOTAL: $${(Number(formularioCompra.costoUnit) * Number(formularioCompra.unidades)).toLocaleString()} | TOTAL (+ IVA 19%): $${((Number(formularioCompra.costoUnit) * Number(formularioCompra.unidades)) * 1.19).toLocaleString()}`
            )
          ),
          React.createElement("button", { className: "btn-pay", style: {marginTop:'15px', background: '#3498db'}, onClick: registrarFacturaCompra }, "📥 Procesar Factura de Entrada")
        ),

        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "📜 Historial de Facturas de Compra Recibidas"),
          React.createElement("table", { className: "report-table" },
            React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Fecha"), React.createElement("th", null, "Proveedor"), React.createElement("th", null, "Factura Nro"), React.createElement("th", null, "Producto"), React.createElement("th", null, "Cant"), React.createElement("th", null, "Total + IVA"))),
            React.createElement("tbody", null, facturasCompraRegistradas.map(f => React.createElement("tr", {key: f.id},
              React.createElement("td", null, f.fecha),
              React.createElement("td", null, f.proveedor),
              React.createElement("td", null, f.nroFactura),
              React.createElement("td", null, f.descripcion),
              React.createElement("td", null, f.unidades),
              React.createElement("td", {className:"text-red"}, `$${f.totalConIva.toLocaleString()}`)
            )))
          )
        ),

        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "📊 Cuadre y Cierre de Caja"),
          React.createElement("div", { className: "metrics-grid" },
            React.createElement("div", { className: "metric-box" }, React.createElement("h3", null, "Ingresos Ventas"), React.createElement("p", {className: "text-green"}, `$${ventasDia.reduce((a,b)=>a+b.total,0).toLocaleString()}`)),
            React.createElement("div", { className: "metric-box" }, React.createElement("h3", null, "Base Fija"), React.createElement("p", null, `$${baseCaja.toLocaleString()}`)),
            React.createElement("div", { className: "metric-box" }, React.createElement("h3", null, "Total Esperado en Caja"), React.createElement("p", {style:{color:'#1e293b'}}, `$${(ventasDia.reduce((a,b)=>a+b.total,0) + baseCaja).toLocaleString()}`))
          )
        )
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
