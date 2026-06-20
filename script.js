const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  // Estados Principales
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [seccion, setSeccion] = React.useState("ventas");
  const [busqueda, setBusqueda] = React.useState("");
  
  // Estado para Limpieza Correcta de Formulario (Punto 1)
  const productoVacio = { nombre: '', precio: '', cantidad: 0, imagen_url: '' };
  const [editando, setEditando] = React.useState(productoVacio);
  
  // Formulario de Compra Legal Ampliado (Punto 2 y 3)
  const compraVacia = { 
    proveedor: '', nit: '', nroFactura: '', codigoBarras: '', descripcion: '', costoUnit: 0, unidades: 1 
  };
  const [formularioCompra, setFormularioCompra] = React.useState(compraVacia);

  // Historiales de Auditoría (Punto 2)
  const [ventasDia, setVentasDia] = React.useState([]);
  const [facturasCompraRegistradas, setFacturasCompraRegistradas] = React.useState([]);
  const [baseCaja, setBaseCaja] = React.useState(100000); 

  const cargarDatos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { 
      console.warn("Modo offline: Usando datos en memoria local."); 
    }
  };

  React.useEffect(() => { cargarDatos(); }, []);

  // --- LÓGICA DE VENTAS ---
  const agregarAlCarrito = (p) => {
    // Verificar si hay stock disponible antes de vender
    if (p.cantidad <= 0) return alert("⚠️ Producto sin inventario disponible.");
    
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      if (existe.cantidad >= p.cantidad) return alert("⚠️ No puedes vender más de las unidades disponibles en stock.");
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
  };

  const totalCarrito = () => carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const finalizarVenta = () => {
    if (carrito.length === 0) return;
    
    // Descontar del inventario localmente al vender
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
    alert("🧾 Factura de Venta Emitida");
    setCarrito([]);
  };

  // --- LÓGICA DE IMAGEN Y EDICIÓN DE PRODUCTOS (Punto 1) ---
  const manejarImagen = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditando({ ...editando, imagen_url: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const guardarProducto = async () => {
    if (!editando.nombre || !editando.precio) return alert("Faltan datos obligatorios.");
    
    const nuevo = { 
      ...editando, 
      id: editando.id || Date.now(), 
      precio: Number(editando.precio),
      cantidad: Number(editando.cantidad) || 0 
    };
    
    setProductos(editando.id ? productos.map(p => p.id === editando.id ? nuevo : p) : [...productos, nuevo]);
    setEditando(productoVacio); // Restablece todo, incluyendo la imagen limpiamente
    alert("✅ Producto Guardado Correctamente");
  };

  // --- REGISTRO DE ENTRADA DE MERCANCÍA / COMPRAS (Punto 2 y 3) ---
  const registrarFacturaCompra = () => {
    const { proveedor, nroFactura, descripcion, costoUnit, unidades } = formularioCompra;
    if (!proveedor || !nroFactura || !descripcion) return alert("Por favor llena los campos clave de la compra.");

    const costoTotalItem = Number(costoUnit) * Number(unidades);
    const totalConIva = costoTotalItem * 1.19; // IVA del 19% legal en Colombia

    const nuevaFacturaCompra = {
      ...formularioCompra,
      id: Date.now(),
      totalItem: costoTotalItem,
      totalConIva: totalConIva,
      fecha: new Date().toLocaleString()
    };

    // 1. Agregar al historial de compras
    setFacturasCompraRegistradas([...facturasCompraRegistradas, nuevaFacturaCompra]);

    // 2. Afectar el inventario (Buscar si existe por nombre/descripción o agregarlo)
    const existeEnInventario = productos.find(p => p.nombre.toLowerCase() === descripcion.toLowerCase());
    
    if (existeEnInventario) {
      setProductos(productos.map(p => 
        p.id === existeEnInventario.id 
          ? { ...p, cantidad: p.cantidad + Number(unidades) } 
          : p
      ));
    } else {
      // Si el producto comprado no existía, lo crea en el inventario automáticamente con margen sugerido de ganancia
      const nuevoProductoComprado = {
        id: Date.now(),
        nombre: descripcion,
        precio: Number(costoUnit) * 1.30, // 30% de margen sugerido por defecto
        cantidad: Number(unidades),
        imagen_url: ''
      };
      setProductos([...productos, nuevoProductoComprado]);
    }

    setFormularioCompra(compraVacia);
    alert("✅ Entrada de mercancía registrada e inventario actualizado.");
  };

  return React.createElement("div", { className: "pos-container" },
    
    // NAVEGACIÓN
    React.createElement("nav", { className: "top-nav" },
      React.createElement("div", { className: "nav-logo" }, "MERCAEXPRESS 33"),
      React.createElement("div", { className: "nav-links" },
        React.createElement("button", { onClick: () => setSeccion("ventas"), className: seccion === "ventas" ? "active" : "" }, "🧾 Facturación"),
        React.createElement("button", { onClick: () => setSeccion("inventario"), className: seccion === "inventario" ? "active" : "" }, "📦 Inventario y Stock"),
        React.createElement("button", { onClick: () => setSeccion("admin"), className: seccion === "admin" ? "active" : "" }, "🔐 Compras y Reportes")
      )
    ),

    React.createElement("main", { className: "main-panel" },
      
      // VISTA DE FACTURACIÓN (VENTAS)
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

      // VISTA DE INVENTARIO Y CANTIDADES (Punto 3)
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
              React.createElement("input", { type: "number", placeholder: "Cantidad Inicial (Stock)", value: editando.cantidad, onChange: e => setEditando({...editando, cantidad: e.target.value}) }),
              React.createElement("button", { className: "btn-save", onClick: guardarProducto }, "Confirmar Ítem")
            )
          )
        ),
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "📦 Control Real de Existencias e Inventario"),
          React.createElement("table", { className: "report-table" },
            React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Producto"), React.createElement("th", null, "Precio de Venta"), React.createElement("th", null, "Cant. Disponible (Stock)"), React.createElement("th", null, "Estado"), React.createElement("th", null, "Acción"))),
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

      // VISTA DE COMPRAS, REPORTES E HISTORIALES (Punto 2)
      seccion === "admin" && React.createElement("div", { className: "admin-horizontal" },
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "🧾 Registro Factura de Compra Legal (Ingreso Mercancía)"),
          React.createElement("div", { className: "admin-form-grid" },
            React.createElement("input", { placeholder: "Proveedor / Razón Social", value: formularioCompra.proveedor, onChange: e => setFormularioCompra({...formularioCompra, proveedor: e.target.value}) }),
            React.createElement("input", { placeholder: "NIT Proveedor", value: formularioCompra.nit, onChange: e => setFormularioCompra({...formularioCompra, nit: e.target.value}) }),
            React.createElement("input", { placeholder: "Nro Factura", value: formularioCompra.nroFactura, onChange: e => setFormularioCompra({...formularioCompra, nroFactura: e.target.value}) }),
            React.createElement("input", { placeholder: " can Código de Barras", value: formularioCompra.codigoBarras, onChange: e => setFormularioCompra({...formularioCompra, codigoBarras: e.target.value}) }),
            React.createElement("input", { placeholder: "Descripción / Nombre Producto", value: formularioCompra.descripcion, onChange: e => setFormularioCompra({...formularioCompra, descripcion: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Costo Unitario ($)", value: formularioCompra.costoUnit, onChange: e => setFormularioCompra({...formularioCompra, costoUnit: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Unidades Entrantes", value: formularioCompra.unidades, onChange: e => setFormularioCompra({...formularioCompra, unidades: e.target.value}) }),
            
            React.createElement("div", { className: "total-badge" }, 
              `SUBTOTAL: $${(Number(formularioCompra.costoUnit) * Number(formularioCompra.unidades)).toLocaleString()} | TOTAL (+ IVA 19%): $${((Number(formularioCompra.costoUnit) * Number(formularioCompra.unidades)) * 1.19).toLocaleString()}`
            )
          ),
          React.createElement("button", { className: "btn-pay", style: {marginTop:'15px', background: '#3498db'}, onClick: registrarFacturaCompra }, "📥 Procesar e Inyectar al Stock")
        ),

        // HISTORIAL DE FACTURAS DE COMPRA
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

        // CIERRE DE CAJA DEL DÍA
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
