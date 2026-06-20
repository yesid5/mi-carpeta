const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  // --- ALMACENAMIENTO LOCAL PERMANENTE ---
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

  const [clientes, setClientes] = React.useState(() => {
    const localCli = localStorage.getItem("merca_clientes");
    return localCli ? JSON.parse(localCli) : [{ id: 1, doc: "2222222", nombre: "Cliente General", tel: "000" }];
  });

  const [proveedores, setProveedores] = React.useState(() => {
    const localProv = localStorage.getItem("merca_proveedores");
    return localProv ? JSON.parse(localProv) : [{ id: 1, nit: "1111111", nombre: "Proveedor Genérico", tel: "000" }];
  });

  const [egresosAjustesInventario, setEgresosAjustesInventario] = React.useState(() => {
    const localAjustes = localStorage.getItem("merca_ajustes_costo");
    return localAjustes ? Number(localAjustes) : 0;
  });

  // --- ESTADOS DE CONTROL ---
  const [carrito, setCarrito] = React.useState([]);
  const [seccion, setSeccion] = React.useState("ventas");
  const [busqueda, setBusqueda] = React.useState("");
  const [mostrarSugerencias, setMostrarSugerencias] = React.useState(false);
  const [baseCaja, setBaseCaja] = React.useState(100000);
  const [historialCierres, setHistorialCierres] = React.useState(() => {
    const localCierres = localStorage.getItem("merca_cierres");
    return localCierres ? JSON.parse(localCierres) : [];
  });

  // --- FORMULARIOS ---
  const productoVacio = { nombre: '', precio: '', costoAjuste: '', cantidad: 0, imagen_url: '', codigoBarras: '', asociadoA: 'PROVEEDOR', terceroId: '1' };
  const [editando, setEditando] = React.useState(productoVacio);

  const compraVacia = { 
    proveedorId: '', nroFactura: '', codigoBarras: '', descripcion: '', 
    costoUnit: '', unidades: 1, llevaIva: "NO", ivaPorcentaje: 19,
    llevaIco: "NO", icoPorcentaje: 8, llevaIbua: "NO", ibuaPorcentaje: 15
  };
  const [formularioCompra, setFormularioCompra] = React.useState(compraVacia);

  // Estados de carga limpios para Terceros (permiten creación o edición)
  const clienteVacio = { id: null, doc: '', nombre: '', tel: '' };
  const [nuevoCliente, setNuevoCliente] = React.useState(clienteVacio);

  const proveedorVacio = { id: null, nit: '', nombre: '', tel: '' };
  const [nuevoProveedor, setNuevoProveedor] = React.useState(proveedorVacio);
  
  const [clienteSeleccionado, setClienteSeleccionado] = React.useState("1");

  // --- EFECTOS GUARDIANES ---
  React.useEffect(() => { localStorage.setItem("merca_productos", JSON.stringify(productos)); }, [productos]);
  React.useEffect(() => { localStorage.setItem("merca_compras", JSON.stringify(facturasCompraRegistradas)); }, [facturasCompraRegistradas]);
  React.useEffect(() => { localStorage.setItem("merca_ventas", JSON.stringify(ventasDia)); }, [ventasDia]);
  React.useEffect(() => { localStorage.setItem("merca_clientes", JSON.stringify(clientes)); }, [clientes]);
  React.useEffect(() => { localStorage.setItem("merca_proveedores", JSON.stringify(proveedores)); }, [proveedores]);
  React.useEffect(() => { localStorage.setItem("merca_cierres", JSON.stringify(historialCierres)); }, [historialCierres]);
  React.useEffect(() => { localStorage.setItem("merca_ajustes_costo", egresosAjustesInventario.toString()); }, [egresosAjustesInventario]);

  // --- PROCESO DE VENTAS ---
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

    const clienteActual = clientes.find(c => c.id.toString() === clienteSeleccionado.toString());

    const nuevaVenta = {
      id: Date.now(),
      cliente: clienteActual ? clienteActual.nombre : "General",
      items: [...carrito],
      total: totalCarrito(),
      fecha: new Date().toLocaleString()
    };
    setVentasDia([...ventasDia, nuevaVenta]);
    alert("🧾 Venta registrada exitosamente.");
    setCarrito([]);
  };

  // --- INVENTARIO AVANZADO ---
  const guardarProducto = () => {
    if (!editando.nombre || !editando.precio) return alert("⚠️ Faltan datos obligatorios (Nombre y Precio).");
    
    const cantidadUnidades = Number(editando.cantidad) || 0;
    const costoUnitarioAjuste = Number(editando.costoAjuste) || 0;

    const nuevo = { 
      ...editando, 
      id: editando.id || Date.now(), 
      precio: Number(editando.precio),
      cantidad: cantidadUnidades 
    };

    const productoViejo = productos.find(p => p.id === editando.id);
    let diferenciaUnidades = cantidadUnidades;
    
    if (productoViejo) {
      diferenciaUnidades = cantidadUnidades - productoViejo.cantidad;
    }

    if (editando.id) {
      setProductos(productos.map(p => p.id === editando.id ? nuevo : p));
    } else {
      setProductos([...productos, nuevo]);
    }

    if (diferenciaUnidades > 0 && costoUnitarioAjuste > 0) {
      const gastoCalculado = diferenciaUnidades * costoUnitarioAjuste;
      setEgresosAjustesInventario(prev => prev + gastoCalculado);
      
      const nombreTercero = editando.asociadoA === "PROVEEDOR" 
        ? (proveedores.find(p => p.id.toString() === editando.terceroId.toString())?.nombre || "Proveedor")
        : (clientes.find(c => c.id.toString() === editando.terceroId.toString())?.nombre || "Cliente");

      alert(`📦 Ajuste contable aplicado:\nSe indexaron ${diferenciaUnidades} unidades asociadas a [${nombreTercero}].\nValor cargado a egresos de caja: $${gastoCalculado.toLocaleString()}`);
    } else {
      alert("✅ Inventario modificado de forma local.");
    }
    
    setEditando(productoVacio);
  };

  // --- CONTROLLER: GESTIÓN DE CLIENTES (CREACIÓN Y EDICIÓN) ---
  const guardarCliente = () => {
    if (!nuevoCliente.doc || !nuevoCliente.nombre) return alert("Documento y Nombre requeridos.");
    
    if (nuevoCliente.id) {
      // Modificar existente
      setClientes(clientes.map(c => c.id === nuevoCliente.id ? nuevoCliente : c));
      alert("👤 Registro de cliente actualizado.");
    } else {
      // Crear nuevo
      setClientes([...clientes, { ...nuevoCliente, id: Date.now() }]);
      alert("👤 Nuevo cliente indexado con éxito.");
    }
    setNuevoCliente(clienteVacio);
  };

  // --- CONTROLLER: GESTIÓN DE PROVEEDORES (CREACIÓN Y EDICIÓN) ---
  const guardarProveedor = () => {
    if (!nuevoProveedor.nit || !nuevoProveedor.nombre) return alert("NIT y Razón social requeridos.");
    
    if (nuevoProveedor.id) {
      // Modificar existente
      setProveedores(proveedores.map(p => p.id === nuevoProveedor.id ? nuevoProveedor : p));
      alert("🏢 Ficha de proveedor actualizada.");
    } else {
      // Crear nuevo
      setProveedores([...proveedores, { ...nuevoProveedor, id: Date.now() }]);
      alert("🏢 Nuevo proveedor indexado con éxito.");
    }
    setNuevoProveedor(proveedorVacio);
  };

  // --- LIQUIDACIÓN DE COMPRAS ---
  const calcularTotalesCompra = () => {
    const subtotalNeto = (Number(formularioCompra.costoUnit) * Number(formularioCompra.unidades)) || 0;
    const valorIva = formularioCompra.llevaIva === "SI" ? subtotalNeto * (Number(formularioCompra.ivaPorcentaje) / 100) : 0;
    const valorIco = formularioCompra.llevaIco === "SI" ? subtotalNeto * (Number(formularioCompra.icoPorcentaje) / 100) : 0;
    const valorIbua = formularioCompra.llevaIbua === "SI" ? subtotalNeto * (Number(formularioCompra.ibuaPorcentaje) / 100) : 0;
    
    const totalConImpuestos = subtotalNeto + valorIva + valorIco + valorIbua;
    const costoRealUnitario = Number(formularioCompra.unidades) > 0 ? (totalConImpuestos / Number(formularioCompra.unidades)) : 0;

    return { subtotalNeto, valorIva, valorIco, valorIbua, totalConImpuestos, costoRealUnitario };
  };

  const { subtotalNeto, valorIva, valorIco, valorIbua, totalConImpuestos, costoRealUnitario } = calcularTotalesCompra();

  const seleccionarProductoRelacionado = (prod) => {
    setFormularioCompra({ ...formularioCompra, descripcion: prod.nombre, codigoBarras: prod.codigoBarras || '' });
    setMostrarSugerencias(false); 
  };

  const registrarFacturaCompra = () => {
    const { proveedorId, nroFactura, descripcion, costoUnit, unidades } = formularioCompra;
    if (!proveedorId || !nroFactura || !descripcion || !costoUnit) return alert("⚠️ Llena los campos clave de la factura.");

    const provAsociado = proveedores.find(p => p.id.toString() === proveedorId.toString());

    const nuevaFacturaCompra = {
      ...formularioCompra,
      id: Date.now(),
      nombreProveedor: provAsociado ? provAsociado.nombre : "Desconocido",
      subtotal: subtotalNeto,
      totalFactura: totalConImpuestos,
      fecha: new Date().toLocaleString()
    };

    setFacturasCompraRegistradas([...facturasCompraRegistradas, nuevaFacturaCompra]);

    const existeEnInventario = productos.find(p => p.nombre.toLowerCase().trim() === descripcion.toLowerCase().trim());
    if (existeEnInventario) {
      setProductos(productos.map(p => p.id === existeEnInventario.id ? { ...p, cantidad: p.cantidad + Number(unidades) } : p));
    } else {
      setProductos([...productos, {
        id: Date.now(),
        nombre: descripcion,
        precio: Math.ceil((costoRealUnitario * 1.30) / 50) * 50, 
        cantidad: Number(unidades),
        imagen_url: '',
        codigoBarras: formularioCompra.codigoBarras
      }]);
    }

    setFormularioCompra(compraVacia);
    alert("📥 Compra radicada y existencias sumadas.");
  };

  // --- ARQUEO Y CIERRE DE CAJA OPERATIVO ---
  const ejecutarCierreCaja = () => {
    const ventasTotales = ventasDia.reduce((a, b) => a + b.total, 0);
    const comprasTotales = facturasCompraRegistradas.reduce((a, b) => a + b.totalFactura, 0); 
    
    const egresosTotales = comprasTotales + egresosAjustesInventario;
    const netoEnCaja = baseCaja + ventasTotales - egresosTotales;

    if (confirm(`¿Proceder con el Cierre de Caja definitivo?\n\n(+) Ingreso Ventas: $${ventasTotales.toLocaleString()}\n(-) Egreso Facturas Compra: $${comprasTotales.toLocaleString()}\n(-) Egreso Ajustes Inventario: $${egresosAjustesInventario.toLocaleString()}\n(=) Efectivo Líquido Esperado: $${netoEnCaja.toLocaleString()}`)) {
      const nuevoCierre = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        vendido: ventasTotales,
        pagado: egresosTotales,
        totalCaja: netoEnCaja
      };
      setHistorialCierres([...historialCierres, nuevoCierre]);
      
      setVentasDia([]); 
      setEgresosAjustesInventario(0);
      alert("🔒 Turno cerrado exitosamente. Valores base reajustados.");
    }
  };

  const productosSugeridos = formularioCompra.descripcion ? productos.filter(p => p.nombre.toLowerCase().includes(formularioCompra.descripcion.toLowerCase())) : [];

  return React.createElement("div", { className: "pos-container" },
    
    // NAVEGACIÓN PRINCIPAL
    React.createElement("nav", { className: "top-nav" },
      React.createElement("div", { className: "nav-logo" }, "TIENDA JP"),
      React.createElement("div", { className: "nav-links" },
        React.createElement("button", { onClick: () => setSeccion("ventas"), className: seccion === "ventas" ? "active" : "" }, "🧾 Facturación"),
        React.createElement("button", { onClick: () => setSeccion("inventario"), className: seccion === "inventario" ? "active" : "" }, "📦 Inventario"),
        React.createElement("button", { onClick: () => setSeccion("terceros"), className: seccion === "terceros" ? "active" : "" }, "👥 Clientes/Proveedores"),
        React.createElement("button", { onClick: () => setSeccion("admin"), className: seccion === "admin" ? "active" : "" }, "🔐 Compras y Cierre")
      )
    ),

    React.createElement("main", { className: "main-panel" },
      
      // VISTA FACTURACIÓN
      seccion === "ventas" && React.createElement("div", { className: "ventas-layout" },
        React.createElement("div", { className: "productos-panel" },
          React.createElement("input", { className: "search-input", placeholder: "🔍 Buscar producto en mostrador...", onChange: e => setBusqueda(e.target.value) }),
          React.createElement("div", { className: "product-grid" },
            productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => 
              React.createElement("div", { key: p.id, className: p.cantidad <= 0 ? "product-card sin-stock" : "product-card", onClick: () => agregarAlCarrito(p) },
                React.createElement("img", { src: p.imagen_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=120' }),
                React.createElement("h3", null, p.nombre),
                React.createElement("div", { style: {display:'flex', justifyContent:'space-between', marginTop:'5px'} },
                  React.createElement("span", { className: "price" }, `$${p.precio.toLocaleString()}`),
                  React.createElement("span", { className: "stock-tag" }, `Cant: ${p.cantidad}`)
                )
              )
            )
          )
        ),
        
        React.createElement("div", { className: "factura-panel-sticky" },
          React.createElement("div", { className: "factura-header" },
            React.createElement("h2", null, "FACTURA DE VENTA"),
            React.createElement("div", { style: {margin: '10px 0'} },
              React.createElement("label", { style: {fontSize:'0.85rem', fontWeight:'bold'} }, "Asignar Cliente: "),
              React.createElement("select", { value: clienteSeleccionado, onChange: e => setClienteSeleccionado(e.target.value), style: {padding:'5px', width:'100%', marginTop:'4px'} },
                clientes.map(c => React.createElement("option", { key: c.id, value: c.id }, `${c.nombre} (${c.doc})`))
              )
            )
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

      // VISTA INVENTARIOS
      seccion === "inventario" && React.createElement("div", { className: "admin-horizontal" },
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, editando.id ? "✏️ Modificar / Auditar Producto" : "➕ Carga Inicial / Ajuste Manual"),
          React.createElement("div", { className: "admin-form-grid" },
            React.createElement("div", { style: {display:'flex', flexDirection:'column', gap:'10px', width:'100%'} },
              React.createElement("input", { placeholder: "Nombre del Producto", value: editando.nombre, onChange: e => setEditando({...editando, nombre: e.target.value}) }),
              React.createElement("input", { type: "number", placeholder: "Precio de Venta al Público ($)", value: editando.precio, onChange: e => setEditando({...editando, precio: e.target.value}) }),
              React.createElement("input", { type: "number", placeholder: "Cantidad Unidades Físicas", value: editando.cantidad, onChange: e => setEditando({...editando, cantidad: e.target.value}) }),
              React.createElement("hr", {style:{border:'0', borderTop:'1px dashed #cbd5e1', margin:'5px 0'}}),
              React.createElement("h4", {style:{fontSize:'0.85rem', color:'#475569', textAlign:'left', marginBottom:'2px'}}, "🔗 Justificación Contable:"),
              React.createElement("input", { type: "number", placeholder: "Costo Unitario de Adquisición ($)", value: editando.costoAjuste, onChange: e => setEditando({...editando, costoAjuste: e.target.value}) }),
              React.createElement("select", { value: editando.asociadoA, onChange: e => setEditando({...editando, asociadoA: e.target.value, terceroId: '1'}) },
                React.createElement("option", { value: "PROVEEDOR" }, "Vincular a un Proveedor"),
                React.createElement("option", { value: "CLIENTE" }, "Vincular a un Cliente (Devolución)")
              ),
              editando.asociadoA === "PROVEEDOR" ? 
                React.createElement("select", { value: editando.terceroId, onChange: e => setEditando({...editando, terceroId: e.target.value}) },
                  proveedores.map(prov => React.createElement("option", { key: prov.id, value: prov.id }, prov.nombre))
                ) :
                React.createElement("select", { value: editando.terceroId, onChange: e => setEditando({...editando, terceroId: e.target.value}) },
                  clientes.map(cli => React.createElement("option", { key: cli.id, value: cli.id }, cli.nombre))
                ),
              React.createElement("button", { className: "btn-save", style:{marginTop:'10px'}, onClick: guardarProducto }, "Confirmar Ajuste Físico")
            )
          )
        ),
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "📦 Inventario de Stock Activo"),
          React.createElement("table", { className: "report-table" },
            React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Producto"), React.createElement("th", null, "Precio Venta"), React.createElement("th", null, "Stock"), React.createElement("th", null, "Acción"))),
            React.createElement("tbody", null, productos.map(p => React.createElement("tr", {key: p.id},
              React.createElement("td", null, p.nombre), 
              React.createElement("td", null, `$${p.precio.toLocaleString()}`), 
              React.createElement("td", {style:{fontWeight:'bold'}}, p.cantidad),
              React.createElement("td", null, React.createElement("button", { className: "btn-edit-small", onClick: () => setEditando({...p, costoAjuste: '', asociadoA: 'PROVEEDOR', terceroId: '1'}) }, "✏️"))
            )))
          )
        )
      ),

      // SECCIÓN TERCEROS COMPLETAMENTE REDISEÑADA Y SEPARADA EN SECCIONES
      seccion === "terceros" && React.createElement("div", { className: "admin-horizontal" },
        
        // COLUMNA IZQUIERDA: CLIENTES
        React.createElement("div", { className: "admin-card", style: {flex: 1} },
          React.createElement("h2", null, nuevoCliente.id ? "✏️ Editar Ficha Cliente" : "👤 Registro de Clientes"),
          React.createElement("div", { className: "admin-form-grid", style: {marginBottom: '20px'} },
            React.createElement("input", { placeholder: "Cédula o NIT", value: nuevoCliente.doc, onChange: e => setNuevoCliente({...nuevoCliente, doc: e.target.value}) }),
            React.createElement("input", { placeholder: "Nombre Completo", value: nuevoCliente.nombre, onChange: e => setNuevoCliente({...nuevoCliente, nombre: e.target.value}) }),
            React.createElement("input", { placeholder: "Teléfono", value: nuevoCliente.tel, onChange: e => setNuevoCliente({...nuevoCliente, tel: e.target.value}) }),
            React.createElement("button", { 
              className: "btn-save", 
              style: {background: nuevoCliente.id ? "#eab308" : "#2563eb"}, 
              onClick: guardarCliente 
            }, nuevoCliente.id ? "Actualizar Cliente" : "Guardar Nuevo Cliente")
          ),
          React.createElement("h3", { style: {textAlign: 'left', fontSize: '1rem', color: '#475569'} }, "📋 Base de Datos de Clientes"),
          React.createElement("table", { className: "report-table" },
            React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Doc/Cc"), React.createElement("th", null, "Nombre"), React.createElement("th", null, "Acción"))),
            React.createElement("tbody", null, clientes.map(c => React.createElement("tr", {key: c.id},
              React.createElement("td", null, c.doc),
              React.createElement("td", null, c.nombre),
              React.createElement("td", null, React.createElement("button", { className: "btn-edit-small", onClick: () => setNuevoCliente(c) }, "✏️"))
            )))
          )
        ),

        // COLUMNA DERECHA: PROVEEDORES
        React.createElement("div", { className: "admin-card", style: {flex: 1} },
          React.createElement("h2", null, nuevoProveedor.id ? "✏️ Editar Ficha Proveedor" : "🏢 Registro de Proveedores"),
          React.createElement("div", { className: "admin-form-grid", style: {marginBottom: '20px'} },
            React.createElement("input", { placeholder: "NIT Proveedor", value: nuevoProveedor.nit, onChange: e => setNuevoProveedor({...nuevoProveedor, nit: e.target.value}) }),
            React.createElement("input", { placeholder: "Razón Social / Empresa", value: nuevoProveedor.nombre, onChange: e => setNuevoProveedor({...nuevoProveedor, nombre: e.target.value}) }),
            React.createElement("input", { placeholder: "Teléfono de Contacto", value: nuevoProveedor.tel, onChange: e => setNuevoProveedor({...nuevoProveedor, tel: e.target.value}) }),
            React.createElement("button", { 
              className: "btn-save", 
              style: {background: nuevoProveedor.id ? "#eab308" : "#10b981"}, 
              onClick: guardarProveedor 
            }, nuevoProveedor.id ? "Actualizar Proveedor" : "Guardar Nuevo Proveedor")
          ),
          React.createElement("h3", { style: {textAlign: 'left', fontSize: '1rem', color: '#475569'} }, "📋 Directorio de Proveedores"),
          React.createElement("table", { className: "report-table" },
            React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "NIT"), React.createElement("th", null, "Razón Social"), React.createElement("th", null, "Acción"))),
            React.createElement("tbody", null, proveedores.map(p => React.createElement("tr", {key: p.id},
              React.createElement("td", null, p.nit),
              React.createElement("td", null, p.nombre),
              React.createElement("td", null, React.createElement("button", { className: "btn-edit-small", onClick: () => setNuevoProveedor(p) }, "✏️"))
            )))
          )
        )
      ),

      // MÓDULO COMPRAS AVANZADAS E IMPUESTOS
      seccion === "admin" && React.createElement("div", { className: "admin-horizontal" },
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "🧾 Factura de Compra (DIAN Colombia)"),
          React.createElement("div", { className: "admin-form-grid" },
            React.createElement("select", { value: formularioCompra.proveedorId, onChange: e => setFormularioCompra({...formularioCompra, proveedorId: e.target.value}) },
              React.createElement("option", { value: "" }, "Seleccione Proveedor..."),
              proveedores.map(prov => React.createElement("option", { key: prov.id, value: prov.id }, prov.nombre))
            ),
            React.createElement("input", { placeholder: "Nro Factura de Compra", value: formularioCompra.nroFactura, onChange: e => setFormularioCompra({...formularioCompra, nroFactura: e.target.value}) }),
            React.createElement("input", { placeholder: "Código de Barras", value: formularioCompra.codigoBarras, onChange: e => setFormularioCompra({...formularioCompra, codigoBarras: e.target.value}) }),
            React.createElement("div", { className: "autocomplete-container" },
              React.createElement("input", { 
                placeholder: "Descripción del Producto...", value: formularioCompra.descripcion, 
                onFocus: () => setMostrarSugerencias(true),
                onBlur: () => setTimeout(() => setMostrarSugerencias(false), 200),
                onChange: e => setFormularioCompra({...formularioCompra, descripcion: e.target.value}) 
              }),
              mostrarSugerencias && productosSugeridos.length > 0 && React.createElement("div", { className: "suggestions-list" },
                productosSugeridos.map(p => React.createElement("div", { key: p.id, className: "suggestion-item", onMouseDown: () => seleccionarProductoRelacionado(p) }, p.nombre))
              )
            ),
            React.createElement("input", { type: "number", placeholder: "Costo Unitario Base ($)", value: formularioCompra.costoUnit, onChange: e => setFormularioCompra({...formularioCompra, costoUnit: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Unidades", value: formularioCompra.unidades, onChange: e => setFormularioCompra({...formularioCompra, unidades: e.target.value}) }),
            React.createElement("div", { className: "tax-row" },
              React.createElement("label", null, "¿Lleva IVA? "),
              React.createElement("select", { value: formularioCompra.llevaIva, onChange: e => setFormularioCompra({...formularioCompra, llevaIva: e.target.value}) },
                React.createElement("option", { value: "NO" }, "No (0%)"), React.createElement("option", { value: "SI" }, "Sí")
              ),
              formularioCompra.llevaIva === "SI" && React.createElement("select", { value: formularioCompra.ivaPorcentaje, onChange: e => setFormularioCompra({...formularioCompra, ivaPorcentaje: e.target.value}) },
                React.createElement("option", { value: 19 }, "19% (General)"), React.createElement("option", { value: 5 }, "5% (Diferencial)")
              )
            ),
            React.createElement("div", { className: "tax-row" },
              React.createElement("label", null, "¿Lleva ICO? "),
              React.createElement("select", { value: formularioCompra.llevaIco, onChange: e => setFormularioCompra({...formularioCompra, llevaIco: e.target.value}) },
                React.createElement("option", { value: "NO" }, "No (0%)"), React.createElement("option", { value: "SI" }, "Sí (8%)")
              )
            ),
            React.createElement("div", { className: "tax-row" },
              React.createElement("label", null, "¿Imp. Saludable (IBUA)? "),
              React.createElement("select", { value: formularioCompra.llevaIbua, onChange: e => setFormularioCompra({...formularioCompra, llevaIbua: e.target.value}) },
                React.createElement("option", { value: "NO" }, "No (0%)"), React.createElement("option", { value: "SI" }, "Sí (15%)")
              )
            ),
            React.createElement("div", { className: "loggro-summary-box" }, 
              React.createElement("p", null, `Subtotal Base: $${subtotalNeto.toLocaleString()}`),
              React.createElement("p", null, `Monto IVA: $${valorIva.toLocaleString()} | Monto ICO: $${valorIco.toLocaleString()} | Monto IBUA: $${valorIbua.toLocaleString()}`),
              React.createElement("h4", null, `TOTAL LIQUIDADO: $${totalConImpuestos.toLocaleString()}`),
              React.createElement("h4", { style:{color:'#2563eb'} }, `Costo Unitario Real: $${Math.round(costoRealUnitario).toLocaleString()}`)
            )
          ),
          React.createElement("button", { className: "btn-pay", style: {marginTop:'15px', background:'#2563eb'}, onClick: registrarFacturaCompra }, "📥 Grabar Entrada de Almacén")
        ),

        // CUADRE Y CIERRE DE CAJA
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "📊 Cuadre de Caja Activo"),
          React.createElement("div", { className: "metrics-grid" },
            React.createElement("div", { className: "metric-box" }, React.createElement("h3", null, "Base Fija"), React.createElement("p", null, `$${baseCaja.toLocaleString()}`)),
            React.createElement("div", { className: "metric-box" }, React.createElement("h3", null, "Vendido (Ingreso)"), React.createElement("p", {className: "text-green"}, `$${ventasDia.reduce((a,b)=>a+b.total,0).toLocaleString()}`)),
            React.createElement("div", { className: "metric-box" }, React.createElement("h3", null, "Egresos Facturas"), React.createElement("p", {className: "text-red"}, `$${facturasCompraRegistradas.reduce((a,b)=>a+b.totalFactura,0).toLocaleString()}`)),
            React.createElement("div", { className: "metric-box" }, React.createElement("h3", null, "Egresos Ajuste Inv."), React.createElement("p", {className: "text-red"}, `$${egresosAjustesInventario.toLocaleString()}`))
          ),
          React.createElement("button", { className: "btn-pay", style: {background:'#dc2626', marginTop:'20px', width:'100%'}, onClick: ejecutarCierreCaja }, "🔒 REALIZAR CIERRE DE TURNO / ARQUEO"),
          React.createElement("h3", { style: {marginTop: '25px', textAlign:'left'} }, "📜 Historial de Cierres Consolidados"),
          React.createElement("table", { className: "report-table" },
            React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Fecha Cierre"), React.createElement("th", null, "Vendido"), React.createElement("th", null, "Pagado"), React.createElement("th", null, "Caja Total"))),
            React.createElement("tbody", null, historialCierres.map(c => React.createElement("tr", {key: c.id},
              React.createElement("td", null, c.fecha), React.createElement("td", {className:"text-green"}, `$${c.vendido.toLocaleString()}`), React.createElement("td", {className:"text-red"}, `$${c.pagado.toLocaleString()}`), React.createElement("td", null, `<strong>$${c.totalCaja.toLocaleString()}</strong>`)
            )))
          )
        )
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
