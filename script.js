const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [seccion, setSeccion] = React.useState("tienda");
  const [verCarrito, setVerCarrito] = React.useState(false);
  const [autenticado, setAutenticado] = React.useState(false);
  const [password, setPassword] = React.useState("");
  
  // Estados de Admin
  const [editando, setEditando] = React.useState(null);
  const [compra, setCompra] = React.useState({ nro: '', nit: '', subtotal: 0, impuesto: 19 });

  const cargarDatos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error de conexión"); }
  };

  React.useEffect(() => { cargarDatos(); }, []);

  const verificarAcceso = () => {
    if (password === "1234") { // Cambia tu clave aquí
      setAutenticado(true);
      setSeccion("admin");
    } else { alert("Clave Incorrecta"); }
  };

  const agregarAlCarrito = (p) => {
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
    setVerCarrito(true);
  };

  const calcularTotalCompra = () => {
    const sub = Number(compra.subtotal) || 0;
    const imp = (sub * (Number(compra.impuesto) || 0)) / 100;
    return (sub + imp).toLocaleString();
  };

  const guardarProducto = async (p) => {
    const metodo = p.id ? 'PUT' : 'POST';
    const url = p.id ? `${API_URL}/productos/${p.id}` : `${API_URL}/productos`;
    await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });
    alert("Producto Guardado");
    setEditando(null);
    cargarDatos();
  };

  return React.createElement("div", { className: "pos-container" },
    
    // BARRA SUPERIOR
    React.createElement("nav", { className: "top-nav" },
      React.createElement("div", { className: "nav-logo" }, "TIENDA JP"),
      React.createElement("div", { className: "nav-links" },
        React.createElement("button", { onClick: () => {setSeccion("tienda"); setAutenticado(false);}, className: seccion === "tienda" ? "active" : "" }, "🛒 Ventas"),
        React.createElement("button", { onClick: () => setSeccion("login"), className: seccion === "admin" || seccion === "login" ? "active" : "" }, "⚙️ Admin")
      )
    ),

    React.createElement("main", { className: "main-panel" },
      
      // LOGIN
      seccion === "login" && !autenticado && React.createElement("div", { className: "login-box" },
        React.createElement("h2", null, "Acceso Admin"),
        React.createElement("input", { type: "password", placeholder: "Clave de acceso", onChange: e => setPassword(e.target.value) }),
        React.createElement("button", { className: "btn-pay", onClick: verificarAcceso }, "Entrar")
      ),

      // TIENDA (CUADRICULA)
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

      // ADMIN COMPLETO
      seccion === "admin" && autenticado && React.createElement("div", { className: "admin-horizontal" },
        // Factura Compra
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "🧾 Registro Factura de Compra"),
          React.createElement("div", { className: "admin-form-row" },
            React.createElement("input", { placeholder: "NIT Proveedor" }),
            React.createElement("input", { placeholder: "Nro Factura" }),
            React.createElement("input", { type: "number", placeholder: "Subtotal", onChange: e => setCompra({...compra, subtotal: e.target.value}) }),
            React.createElement("div", { className: "total-badge" }, `TOTAL + IVA: $${calcularTotalCompra()}`),
            React.createElement("button", { className: "btn-pay" }, "Cargar Compra")
          )
        ),
        // Edición Productos
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, editando?.id ? "✏️ Editar" : "➕ Nuevo Producto"),
          React.createElement("div", { className: "admin-form-row" },
            React.createElement("input", { placeholder: "Nombre", value: editando?.nombre || '', onChange: e => setEditando({...editando, nombre: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Precio", value: editando?.precio || '', onChange: e => setEditando({...editando, precio: e.target.value}) }),
            React.createElement("button", { className: "btn-pay", onClick: () => guardarProducto(editando) }, "Guardar")
          ),
          React.createElement("table", { className: "report-table" },
            React.createElement("tbody", null, productos.map(p => React.createElement("tr", {key: p.id},
              React.createElement("td", null, p.nombre),
              React.createElement("td", null, React.createElement("button", { onClick: () => setEditando(p) }, "Editar"))
            )))
          )
        )
      )
    ),

    // MODAL VENTAS
    verCarrito && carrito.length > 0 && React.createElement("div", { className: "modal-overlay" },
      React.createElement("div", { className: "modal-content" },
        React.createElement("div", { className: "modal-header" }, React.createElement("h2", null, "Confirmar Venta")),
        React.createElement("div", { className: "confirm-list" },
          carrito.map(item => React.createElement("div", { key: item.id, className: "confirm-item" },
            React.createElement("span", null, `${item.cantidad}x ${item.nombre}`),
            React.createElement("strong", null, `$${(item.precio * item.cantidad).toLocaleString()}`)
          ))
        ),
        React.createElement("div", { className: "confirm-total" }, React.createElement("h2", null, `TOTAL: $${carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0).toLocaleString()}`)),
        React.createElement("div", { className: "modal-actions" },
          React.createElement("button", { className: "btn-pay", onClick: () => {alert("Cobrado"); setCarrito([]); setVerCarrito(false);} }, "CONFIRMAR PAGO"),
          React.createElement("button", { className: "btn-cancel", onClick: () => setVerCarrito(false) }, "Cancelar")
        )
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
