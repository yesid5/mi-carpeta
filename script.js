const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [seccion, setSeccion] = React.useState("tienda");
  const [verCarrito, setVerCarrito] = React.useState(false);
  const [autenticado, setAutenticado] = React.useState(false);
  const [password, setPassword] = React.useState("");
  
  // ESTADOS AMPLIADOS PARA ADMIN
  const [editando, setEditando] = React.useState(null);
  const [compra, setCompra] = React.useState({ 
    nro: '', nit: '', proveedor: '', codigo: '', 
    descripcion: '', cant: 1, precioUnit: 0, impuesto: 19 
  });

  // ESTADO PARA REPORTES
  const [reporte, setReporte] = React.useState({ ventas: 1550000, gastos: 450000, balance: 1100000 });

  const cargarDatos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error de red"); }
  };

  React.useEffect(() => { cargarDatos(); }, []);

  // Función para calcular total de factura de compra
  const totalFacturaCompra = () => {
    const sub = (Number(compra.precioUnit) * Number(compra.cant)) || 0;
    const iva = sub * (Number(compra.impuesto) / 100);
    return (sub + iva).toLocaleString();
  };

  const ejecutarCierreCaja = () => {
    const confirmar = confirm("¿Desea cerrar la caja? Se generará un resumen de ventas y gastos.");
    if(confirmar) {
      alert(`Caja Cerrada.\nTotal Ventas: $${reporte.ventas.toLocaleString()}\nTotal Gastos: $${reporte.gastos.toLocaleString()}\nNeto: $${reporte.balance.toLocaleString()}`);
    }
  };

  return React.createElement("div", { className: "pos-container" },
    
    React.createElement("nav", { className: "top-nav" },
      React.createElement("div", { className: "nav-logo" }, "TIENDA JP"),
      React.createElement("div", { className: "nav-links" },
        React.createElement("button", { onClick: () => {setSeccion("tienda"); setAutenticado(false);}, className: seccion === "tienda" ? "active" : "" }, "🛒 Ventas"),
        React.createElement("button", { onClick: () => setSeccion("login"), className: (seccion === "admin" || seccion === "login") ? "active" : "" }, "📊 Gestión e Inventario")
      )
    ),

    React.createElement("main", { className: "main-panel" },
      
      // LOGIN ADMIN
      seccion === "login" && !autenticado && React.createElement("div", { className: "login-box" },
        React.createElement("h2", null, "Panel Administrativo"),
        React.createElement("input", { type: "password", placeholder: "Contraseña", onChange: e => setPassword(e.target.value) }),
        React.createElement("button", { className: "btn-save", onClick: () => password === "1234" ? setAutenticado(true) || setSeccion("admin") : alert("Error") }, "Acceder")
      ),

      // TIENDA (GRID)
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

      // SECCION ADMIN COMPLETA
      seccion === "admin" && autenticado && React.createElement("div", { className: "admin-horizontal" },
        
        // FORMULARIO DE COMPRA AVANZADO
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "🧾 Registro de Compra a Proveedor"),
          React.createElement("div", { className: "admin-form-grid" },
            React.createElement("input", { placeholder: "Nombre Proveedor", onChange: e => setCompra({...compra, proveedor: e.target.value}) }),
            React.createElement("input", { placeholder: "NIT / RUT", onChange: e => setCompra({...compra, nit: e.target.value}) }),
            React.createElement("input", { placeholder: "Nro Factura", onChange: e => setCompra({...compra, nro: e.target.value}) }),
            React.createElement("input", { placeholder: "Código Producto", onChange: e => setCompra({...compra, codigo: e.target.value}) }),
            React.createElement("input", { className: "full-width", placeholder: "Descripción del Producto", onChange: e => setCompra({...compra, descripcion: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Cant.", onChange: e => setCompra({...compra, cant: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Precio Unitario $", onChange: e => setCompra({...compra, precioUnit: e.target.value}) }),
            React.createElement("div", { className: "total-badge" }, `TOTAL FACTURA: $${totalFacturaCompra()}`)
          ),
          React.createElement("button", { className: "btn-pay", style: {marginTop: '15px'} }, "Registrar e Ingresar a Inventario")
        ),

        // CIERRE DE CAJA Y REPORTES
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "📊 Cierre de Caja y Reportes"),
          React.createElement("div", { className: "metrics-grid" },
            React.createElement("div", { className: "metric-box" }, 
              React.createElement("h3", null, "Total Ventas"), 
              React.createElement("p", {className: "text-green"}, `$${reporte.ventas.toLocaleString()}`)
            ),
            React.createElement("div", { className: "metric-box" }, 
              React.createElement("h3", null, "Gastos / Compras"), 
              React.createElement("p", {className: "text-red"}, `$${reporte.gastos.toLocaleString()}`)
            ),
            React.createElement("div", { className: "metric-box" }, 
              React.createElement("h3", null, "Balance Neto"), 
              React.createElement("p", null, `$${reporte.balance.toLocaleString()}`)
            )
          ),
          React.createElement("div", { className: "admin-actions" },
            React.createElement("button", { className: "btn-report", onClick: ejecutarCierreCaja }, "REALIZAR CIERRE DE CAJA"),
            React.createElement("button", { className: "btn-cancel" }, "Exportar PDF")
          )
        )
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
