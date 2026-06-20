const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
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

  const [carrito, setCarrito] = React.useState([]);
  const [seccion, setSeccion] = React.useState("ventas");
  const [busqueda, setBusqueda] = React.useState("");
  const [mostrarSugerencias, setMostrarSugerencias] = React.useState(false);
  
  const productoVacio = { nombre: '', precio: '', cantidad: 0, imagen_url: '', codigoBarras: '' };
  const [editando, setEditando] = React.useState(productoVacio);
  
  // Formulario extendido con impuestos colombianos (Loggro Style)
  const compraVacia = { 
    proveedor: '', nit: '', nroFactura: '', codigoBarras: '', descripcion: '', 
    costoUnit: '', unidades: 1, 
    ivaPorcentaje: 0, // 0%, 5%, 19%
    impuestoSaludablePorcentaje: 0 // 0% o 15% (Tarifa vigente 2026)
  };
  const [formularioCompra, setFormularioCompra] = React.useState(compraVacia);
  const [baseCaja, setBaseCaja] = React.useState(100000); 

  React.useEffect(() => { localStorage.setItem("merca_productos", JSON.stringify(productos)); }, [productos]);
  React.useEffect(() => { localStorage.setItem("merca_compras", JSON.stringify(facturasCompraRegistradas)); }, [facturasCompraRegistradas]);
  React.useEffect(() => { localStorage.setItem("merca_ventas", JSON.stringify(ventasDia)); }, [ventasDia]);

  // --- VENTAS ---
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
    alert("🧾 Factura de Venta Emitida");
    setCarrito([]);
  };

  // --- INVENTARIO ---
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
    alert("✅ Inventario actualizado");
  };

  // --- COMPRAS AVANZADAS (LOGGRO STYLE) ---
  const seleccionarProductoRelacionado = (prod) => {
    setFormularioCompra({
      ...formularioCompra,
      descripcion: prod.nombre,
      codigoBarras: prod.codigoBarras || ''
    });
    setMostrarSugerencias(false); 
  };

  // Cálculos matemáticos de impuestos en tiempo real
  const calcularTotalesCompra = () => {
    const subtotalItem = Number(formularioCompra.costoUnit) * Number(formularioCompra.unidades) || 0;
    const valorIva = subtotalItem * (Number(formularioCompra.ivaPorcentaje) / 100);
    const valorSaludable = subtotalItem * (Number(formularioCompra.impuestoSaludablePorcentaje) / 100);
    const totalFactura = subtotalItem + valorIva + valorSaludable;
    
    // Costo real por unidad incluyendo todos los impuestos acumulados
    const costoRealUnitario = Number(formularioCompra.unidades) > 0 ? (totalFactura / Number(formularioCompra.unidades)) : 0;

    return { subtotalItem, valorIva, valorSaludable, totalFactura, costoRealUnitario };
  };

  const { subtotalItem, valorIva, valorSaludable, totalFactura, costoRealUnitario } = calcularTotalesCompra();

  const registrarFacturaCompra = () => {
    const { proveedor, nroFactura, descripcion, costoUnit, unidades } = formularioCompra;
    if (!proveedor || !nroFactura || !descripcion || !costoUnit) return alert("⚠️ Llena los campos obligatorios.");

    const nuevaFacturaCompra = {
      ...formularioCompra,
      id: Date.now(),
      subtotal: subtotalItem,
      ivaTotal: valorIva,
      saludableTotal: valorSaludable,
      totalConImpuestos: totalFactura,
      fecha: new Date().toLocaleString()
    };

    setFacturasCompraRegistradas([...facturasCompraRegistradas, nuevaFacturaCompra]);

    const existeEnInventario = productos.find(p => p.nombre.toLowerCase().trim() === descripcion.toLowerCase().trim());
    
    if (existeEnInventario) {
      setProductos(productos.map(p => 
        p.id === existeEnInventario.id ? { 
          ...p, 
          cantidad: p.cantidad + Number(unidades),
          codigoBarras: formularioCompra.codigoBarras || p.codigoBarras
        } : p
      ));
    } else {
      // Precio sugerido al 30% de margen sobre el costo real con impuestos
      const precioVentaSugerido = costoRealUnitario * 1.30;
      
      const nuevoProductoComprado = {
        id: Date.now(),
        nombre: descripcion,
        precio: Math.ceil(precioVentaSugerido / 50) * 50, // Redondeo al 50 más cercano (Moneda colombiana)
        cantidad: Number(unidades),
        imagen_url: '',
        codigoBarras: formularioCompra.codigoBarras
      };
      setProductos([...productos, nuevoProductoComprado]);
    }

    setFormularioCompra(compraVacia);
    alert("✅ Compra procesada en el historial y stock cargado.");
  };

  const productosSugeridos = formularioCompra.descripcion 
    ? productos.filter(p => p.nombre.toLowerCase().includes(formularioCompra.descripcion.toLowerCase()))
    : [];

  return React.createElement("div", { className: "pos-container" },
    
    // NAV
    React.createElement("nav", { className: "top-nav" },
      React.createElement("div", { className: "nav-logo" }, "TIENDA JP"),
      React.createElement("div", { className: "nav-links" },
        React.createElement("button", { onClick: () => setSeccion("ventas"), className: seccion === "ventas" ? "active" : "" }, "🧾 Facturación"),
        React.createElement("button", { onClick: () => setSeccion("inventario"), className: seccion === "inventario" ? "active" : "" }, "📦 Inventario y Stock"),
        React.createElement("button", { onClick: () => setSeccion("admin"), className: seccion === "admin" ? "active" : "" }, "🔐 Compras y Reportes")
      )
    ),

    React.createElement("main", { className: "main-panel" },
      
      // VENTAS MOSTRADOR
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
            React.createElement("p", null, "TIENDA JP - NIT: 900.123.456-1"),
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

      // INVENTARIO
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

      // COMPRAS AVANZADAS E IMPUESTOS COLOMBIA
      seccion === "admin" && React.createElement("div", { className: "admin-horizontal" },
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "🧾 Registro Factura de Entrada (Módulo Loggro)"),
          React.createElement("div", { className: "admin-form-grid" },
            React.createElement("input", { placeholder: "Proveedor / Razón Social", value: formularioCompra.proveedor, onChange: e => setFormularioCompra({...formularioCompra, proveedor: e.target.value}) }),
            React.createElement("input", { placeholder: "NIT Proveedor", value: formularioCompra.nit, onChange: e => setFormularioCompra({...formularioCompra, nit: e.target.value}) }),
            React.createElement("input", { placeholder: "Nro Factura", value: formularioCompra.nroFactura, onChange: e => setFormularioCompra({...formularioCompra, nroFactura: e.target.value}) }),
            React.createElement("input", { placeholder: "Código de Barras", value: formularioCompra.codigoBarras, onChange: e => setFormularioCompra({...formularioCompra, codigoBarras: e.target.value}) }),
            
            // CONTENEDOR AUTOCOMPLETE CON CAPA SUPERIOR (Z-INDEX FIJO)
            React.createElement("div", { className: "autocomplete-container" },
              React.createElement("input", { 
                placeholder: "Descripción del Producto...", 
                value: formularioCompra.descripcion, 
                onFocus: () => setMostrarSugerencias(true),
                onBlur: () => setTimeout(() => setMostrarSugerencias(false), 200), // Cierre retrasado seguro
                onChange: e => setFormularioCompra({...formularioCompra, descripcion: e.target.value}) 
              }),
              mostrarSugerencias && productosSugeridos.length > 0 && React.createElement("div", { className: "suggestions-list" },
                productosSugeridos.map(p => 
                  React.createElement("div", { 
                    key: p.id, 
                    className: "suggestion-item",
                    onMouseDown: () => seleccionarProductoRelacionado(p) // Evita conflicto de desenfoque
                  }, `${p.nombre} (Dispo: ${p.cantidad})`)
                )
              )
            ),

            React.createElement("input", { type: "number", placeholder: "Costo Unitario Antes de IVA ($)", value: formularioCompra.costoUnit, onChange: e => setFormularioCompra({...formularioCompra, costoUnit: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Cantidad Unidades", value: formularioCompra.unidades, onChange: e => setFormularioCompra({...formularioCompra, unidades: e.target.value}) }),
            
            // SELECTOR DE IVA DIAN COLOMBIA
            React.createElement("div", { className: "tax-select-container" },
              React.createElement("label", null, "IVA Aplicable:"),
              React.createElement("select", { 
                value: formularioCompra.ivaPorcentaje, 
                onChange: e => setFormularioCompra({...formularioCompra, ivaPorcentaje: Number(e.target.value)}) 
              },
                React.createElement("option", { value: 0 }, "Exento / Excluido (0%)"),
                React.createElement("option", { value: 5 }, "Tarifa Diferencial (5%)"),
                React.createElement("option", { value: 19 }, "Tarifa General (19%)")
              )
            ),

            // IMPUESTO SALUDABLE COLOMBIA
            React.createElement("div", { className: "tax-select-container" },
              React.createElement("label", null, "Impuesto Saludable:"),
              React.createElement("select", { 
                value: formularioCompra.impuestoSaludablePorcentaje, 
                onChange: e => setFormularioCompra({...formularioCompra, impuestoSaludablePorcentaje: Number(e.target.value)}) 
              },
                React.createElement("option", { value: 0 }, "No aplica (0%)"),
                React.createElement("option", { value: 15 }, "Ultraprocesados / Azucarados (15%)")
              )
            ),
            
            // DESGLOSE DINÁMICO TIPO AUDITORÍA LOGGRO
            React.createElement("div", { className: "loggro-summary-box" }, 
              React.createElement("p", null, `Subtotal Neto: $${subtotalItem.toLocaleString()}`),
              React.createElement("p", null, `IVA discriminado: $${valorIva.toLocaleString()}`),
              React.createElement("p", null, `Imp. Saludable: $${valorSaludable.toLocaleString()}`),
              React.createElement("h4", null, `TOTAL FACTURA ENTRADA: $${totalFactura.toLocaleString()}`),
              React.createElement("h4", { style: {color: '#2563eb', marginTop: '5px'} }, `Costo Real con Impuesto por Unidad: $${Math.round(costoRealUnitario).toLocaleString()}`)
            )
          ),
          React.createElement("button", { className: "btn-pay", style: {marginTop:'15px', background: '#2563eb'}, onClick: registrarFacturaCompra }, "📥 Radicar e Inyectar a Inventario")
        ),

        // HISTORIAL
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "📜 Historial Completo de Compras y Costos"),
          React.createElement("table", { className: "report-table" },
            React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Fecha"), React.createElement("th", null, "Proveedor"), React.createElement("th", null, "Producto"), React.createElement("th", null, "Cant"), React.createElement("th", null, "IVA"), React.createElement("th", null, "Saludable"), React.createElement("th", null, "Total Costo"))),
            React.createElement("tbody", null, facturasCompraRegistradas.map(f => React.createElement("tr", {key: f.id},
              React.createElement("td", null, f.fecha),
              React.createElement("td", null, f.proveedor),
              React.createElement("td", null, f.descripcion),
              React.createElement("td", null, f.unidades),
              React.createElement("td", null, `${f.ivaPorcentaje}%`),
              React.createElement("td", null, `${f.impuestoSaludablePorcentaje}%`),
              React.createElement("td", {className:"text-red"}, `$${f.totalConImpuestos.toLocaleString()}`)
            )))
          )
        ),

        // CAJA
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
