const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [seccion, setSeccion] = React.useState("tienda");
  const [autenticado, setAutenticado] = React.useState(false);
  const [password, setPassword] = React.useState("");
  
  // ESTADOS DE BÚSQUEDA
  const [busquedaTienda, setBusquedaTienda] = React.useState("");
  const [busquedaAdmin, setBusquedaAdmin] = React.useState("");
  
  const productoVacio = { nombre: '', precio: '', imagen_url: '' };
  const [editando, setEditando] = React.useState(productoVacio);
  
  const [compra, setCompra] = React.useState({ cant: 1, precioUnit: 0 });

  const cargarDatos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error al sincronizar"); }
  };

  React.useEffect(() => { cargarDatos(); }, []);

  // FILTRADO EN TIEMPO REAL
  const productosFiltradosTienda = productos.filter(p => 
    p.nombre.toLowerCase().includes(busquedaTienda.toLowerCase())
  );

  const productosFiltradosAdmin = productos.filter(p => 
    p.nombre.toLowerCase().includes(busquedaAdmin.toLowerCase())
  );

  const agregarAlCarrito = (p) => {
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
  };

  const guardarProducto = async () => {
    if (!editando.nombre || !editando.precio) return alert("Faltan datos");
    const metodo = editando.id ? 'PUT' : 'POST';
    const url = editando.id ? `${API_URL}/productos/${editando.id}` : `${API_URL}/productos`;
    
    try {
      await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editando)
      });
      alert(editando.id ? "✅ Actualizado" : "✅ Creado con éxito");
      setEditando(productoVacio);
      cargarDatos();
    } catch (e) { alert("Error al guardar"); }
  };

  return React.createElement("div", { className: "pos-container" },
    
    React.createElement("nav", { className: "top-nav" },
      React.createElement("div", { className: "nav-logo" }, "MERCAEXPRESS 33"),
      React.createElement("div", { className: "nav-links" },
        React.createElement("button", { onClick: () => {setSeccion("tienda"); setAutenticado(false);}, className: seccion === "tienda" ? "active" : "" }, "🛒 Ventas"),
        React.createElement("button", { onClick: () => setSeccion("login"), className: (seccion === "admin" || seccion === "login") ? "active" : "" }, "📊 Admin")
      )
    ),

    React.createElement("main", { className: "main-panel" },
      
      seccion === "login" && !autenticado && React.createElement("div", { className: "login-box" },
        React.createElement("h2", null, "Acceso Admin"),
        React.createElement("input", { type: "password", placeholder: "Clave", onChange: e => setPassword(e.target.value) }),
        React.createElement("button", { className: "btn-save", style: {width:'100%'}, onClick: () => password === "1234" ? (setAutenticado(true), setSeccion("admin")) : alert("Error") }, "Entrar")
      ),

      // TIENDA CON BUSCADOR
      seccion === "tienda" && React.createElement("div", null,
        React.createElement("div", { className: "search-bar-container" },
          React.createElement("input", { 
            className: "search-input", 
            placeholder: "🔍 Buscar producto por nombre...", 
            value: busquedaTienda,
            onChange: (e) => setBusquedaTienda(e.target.value)
          })
        ),
        React.createElement("div", { className: "product-grid" },
          productosFiltradosTienda.map(p => 
            React.createElement("div", { key: p.id, className: "product-card", onClick: () => agregarAlCarrito(p) },
              React.createElement("img", { src: p.imagen_url || 'https://img.icons8.com/fluency/100/box.png', className: "prod-img" }),
              React.createElement("div", { className: "card-info" },
                React.createElement("h3", null, p.nombre),
                React.createElement("span", { className: "price" }, `$${Number(p.precio).toLocaleString()}`)
              )
            )
          )
        )
      ),

      // ADMIN CON BUSCADOR DE INVENTARIO
      seccion === "admin" && autenticado && React.createElement("div", { className: "admin-horizontal" },
        
        // Formulario (Igual al anterior pero con reset)
        React.createElement("div", { className: "admin-card" },
          React.createElement("div", { style: {display:'flex', justifyContent:'space-between', marginBottom:'20px'} },
             React.createElement("h2", null, editando.id ? "✏️ Editando" : "➕ Nuevo Producto"),
             editando.id && React.createElement("button", { onClick: () => setEditando(productoVacio) }, "Limpiar")
          ),
          React.createElement("div", { className: "admin-form-grid" },
            React.createElement("input", { placeholder: "Nombre", value: editando.nombre, onChange: e => setEditando({...editando, nombre: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Precio", value: editando.precio, onChange: e => setEditando({...editando, precio: e.target.value}) }),
            React.createElement("button", { className: "btn-save", onClick: guardarProducto }, "Guardar")
          ),

          // TABLA CON BUSCADOR DE ADMIN
          React.createElement("div", { style: {marginTop:'30px'} },
            React.createElement("input", { 
              className: "search-input", 
              style: {marginBottom: '15px'},
              placeholder: "🔍 Filtrar inventario para editar...", 
              value: busquedaAdmin,
              onChange: (e) => setBusquedaAdmin(e.target.value)
            }),
            React.createElement("table", { className: "report-table" },
              React.createElement("tbody", null, productosFiltradosAdmin.map(p => React.createElement("tr", {key: p.id},
                React.createElement("td", null, p.nombre),
                React.createElement("td", null, `$${Number(p.precio).toLocaleString()}`),
                React.createElement("td", null, React.createElement("button", { onClick: () => setEditando(p), className: "btn-edit-small" }, "✏️"))
              )))
            )
          )
        )
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
