const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [ventas, setVentas] = React.useState([]);
  const [busqueda, setBusqueda] = React.useState("");
  const [vista, setVista] = React.useState("tienda"); // tienda, admin, reportes
  const [verCarrito, setVerCarrito] = React.useState(false);
  const [metodoPago, setMetodoPago] = React.useState("Efectivo");

  // Estado para nuevo producto
  const [nuevoProd, setNuevoProd] = React.useState({ nombre: '', precio: '', costo: '', stock: '', imagen_url: '', categoria: 'General' });

  const cargarDatos = async () => {
    try {
      const [resP, resV] = await Promise.all([
        fetch(`${API_URL}/productos`),
        fetch(`${API_URL}/ventas`)
      ]);
      const dataP = await resP.json();
      const dataV = await resV.json();
      setProductos(Array.isArray(dataP) ? dataP : []);
      setVentas(Array.isArray(dataV) ? dataV : []);
    } catch (e) { console.error("Error de sincronización"); }
  };

  React.useEffect(() => { cargarDatos(); }, []);

  // --- SISTEMA DE VENTAS ---
  const agregarAlCarrito = (p) => {
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      if (existe.cantidad >= p.stock) return alert("Stock insuficiente");
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
  };

  const procesarVenta = async () => {
    if (carrito.length === 0) return;
    const total = carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
    const nroFactura = `FAC-${Date.now().toString().slice(-6)}`;
    
    const ventaData = {
      nroFactura,
      total,
      items: carrito,
      metodoPago,
      fecha: new Date().toISOString()
    };

    try {
      const res = await fetch(`${API_URL}/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ventaData)
      });
      if (res.ok) {
        alert(`Factura ${nroFactura} generada con éxito.`);
        setCarrito([]);
        setVerCarrito(false);
        cargarDatos();
      }
    } catch (e) { alert("Error al facturar"); }
  };

  // --- LÓGICA DE NEGOCIO (ESTADÍSTICAS) ---
  const totalVendido = ventas.reduce((acc, v) => acc + v.total, 0);
  const utilidadEstimada = ventas.reduce((acc, v) => {
    const costoItems = v.items.reduce((sum, i) => sum + (Number(i.costo || 0) * i.cantidad), 0);
    return acc + (v.total - costoItems);
  }, 0);

  return React.createElement("div", { className: "erp-container" },
    
    // BARRA LATERAL DE NAVEGACIÓN (TIPO LOGGRO)
    React.createElement("nav", { className: "sidebar-nav" },
      React.createElement("div", { className: "nav-logo" }, "JP ERP"),
      React.createElement("button", { onClick: () => setVista("tienda"), className: vista === "tienda" ? "active" : "" }, "🛒 Ventas (POS)"),
      React.createElement("button", { onClick: () => setVista("admin"), className: vista === "admin" ? "active" : "" }, "📦 Inventario"),
      React.createElement("button", { onClick: () => setVista("reportes"), className: vista === "reportes" ? "active" : "" }, "📊 Reportes")
    ),

    React.createElement("main", { className: "content-area" },
      
      // VISTA POS (TIENDA)
      vista === "tienda" && React.createElement("div", null,
        React.createElement("input", { 
          className: "global-search", 
          placeholder: "Buscar producto por nombre o código...", 
          onChange: (e) => setBusqueda(e.target.value) 
        }),
        React.createElement("div", { className: "grid-pos" },
          productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => 
            React.createElement("div", { key: p.id, className: "item-card", onClick: () => agregarAlCarrito(p) },
              React.createElement("img", { src: p.imagen_url || 'https://img.icons8.com/fluency/100/box.png' }),
              React.createElement("h4", null, p.nombre),
              React.createElement("span", { className: "item-price" }, `$${Number(p.precio).toLocaleString()}`),
              React.createElement("p", null, `Stock: ${p.stock}`)
            )
          )
        )
      ),

      // VISTA INVENTARIO (ADMIN)
      vista === "admin" && React.createElement("div", { className: "admin-section" },
        React.createElement("h2", null, "Gestión de Productos"),
        React.createElement("div", { className: "form-inline" },
          React.createElement("input", { placeholder: "Nombre", value: nuevoProd.nombre, onChange: e => setNuevoProd({...nuevoProd, nombre: e.target.value}) }),
          React.createElement("input", { type: "number", placeholder: "Precio Venta", value: nuevoProd.precio, onChange: e => setNuevoProd({...nuevoProd, precio: e.target.value}) }),
          React.createElement("input", { type: "number", placeholder: "Costo Compra", value: nuevoProd.costo, onChange: e => setNuevoProd({...nuevoProd, costo: e.target.value}) }),
          React.createElement("input", { type: "number", placeholder: "Stock", value: nuevoProd.stock, onChange: e => setNuevoProd({...nuevoProd, stock: e.target.value}) }),
          React.createElement("button", { onClick: () => {
            fetch(`${API_URL}/productos`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(nuevoProd)
            }).then(() => { alert("Producto Creado"); cargarDatos(); });
          }, className: "btn-save" }, "Guardar")
        )
      ),

      // VISTA REPORTES (DASHBOARD)
      vista === "reportes" && React.createElement("div", { className: "dashboard" },
        React.createElement("div", { className: "metrics-grid" },
          React.createElement("div", { className: "metric-box" }, 
            React.createElement("h3", null, "Ventas Totales"), 
            React.createElement("p", null, `$${totalVendido.toLocaleString()}`)
          ),
          React.createElement("div", { className: "metric-box" }, 
            React.createElement("h3", null, "Utilidad Neta"), 
            React.createElement("p", { style: {color: 'green'} }, `$${utilidadEstimada.toLocaleString()}`)
          )
        ),
        React.createElement("table", { className: "report-table" },
          React.createElement("thead", null, 
            React.createElement("tr", null, 
              React.createElement("th", null, "Factura"), 
              React.createElement("th", null, "Fecha"), 
              React.createElement("th", null, "Método"), 
              React.createElement("th", null, "Total")
            )
          ),
          React.createElement("tbody", null,
            ventas.map(v => React.createElement("tr", { key: v.id },
              React.createElement("td", null, v.nroFactura),
              React.createElement("td", null, new Date(v.fecha).toLocaleDateString()),
              React.createElement("td", null, v.metodoPago),
              React.createElement("td", null, `$${v.total.toLocaleString()}`)
            ))
          )
        )
      )
    ),

    // CARRITO FLOTANTE Y MODAL DE COBRO
    carrito.length > 0 && React.createElement("button", { className: "fab-cart", onClick: () => setVerCarrito(true) }, 
      `🛒 (${carrito.length})`
    ),

    verCarrito && React.createElement("div", { className: "modal-overlay" },
      React.createElement("div", { className: "modal-cart" },
        React.createElement("h2", null, "Caja de Cobro"),
        React.createElement("div", { className: "cart-items-list" },
          carrito.map(item => React.createElement("div", { key: item.id, className: "cart-item-row" },
            React.createElement("span", null, item.nombre),
            React.createElement("span", null, `${item.cantidad} x $${item.precio}`)
          ))
        ),
        React.createElement("div", { className: "payment-methods" },
          React.createElement("label", null, "Método de Pago:"),
          React.createElement("select", { value: metodoPago, onChange: (e) => setMetodoPago(e.target.value) },
            React.createElement("option", null, "Efectivo"),
            React.createElement("option", null, "Tarjeta"),
            React.createElement("option", null, "Transferencia")
          )
        ),
        React.createElement("button", { className: "btn-confirm-final", onClick: procesarVenta }, "FINALIZAR Y FACTURAR"),
        React.createElement("button", { className: "btn-cancel", onClick: () => setVerCarrito(false) }, "Cerrar")
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
