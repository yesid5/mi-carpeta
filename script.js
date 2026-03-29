const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [seccion, setSeccion] = React.useState("tienda");
  const [autenticado, setAutenticado] = React.useState(false);
  const [password, setPassword] = React.useState("");
  
  // Estado inicial para producto nuevo
  const productoVacio = { nombre: '', precio: '', imagen_url: '' };
  const [editando, setEditando] = React.useState(productoVacio);
  
  const [compra, setCompra] = React.useState({ 
    proveedor: '', nit: '', nro: '', codigo: '', 
    descripcion: '', cant: 1, precioUnit: 0, impuesto: 19 
  });

  const cargarDatos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error al sincronizar"); }
  };

  React.useEffect(() => { cargarDatos(); }, []);

  const agregarAlCarrito = (p) => {
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
  };

  const manejarImagen = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditando({ ...editando, imagen_url: reader.result });
      reader.readAsDataURL(file);
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

      seccion === "admin" && autenticado && React.createElement("div", { className: "admin-horizontal" },
        
        // GESTIÓN DE PRODUCTOS (NUEVO / EDITAR)
        React.createElement("div", { className: "admin-card" },
          React.createElement("div", { style: {display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'} },
             React.createElement("h2", {style:{margin:0}}, editando.id ? "✏️ Editando Producto" : "➕ Crear Producto Nuevo"),
             editando.id && React.createElement("button", { onClick: () => setEditando(productoVacio), className: "btn-cancel", style:{width:'auto', padding:'5px 15px'} }, "Cancelar / Nuevo")
          ),
          React.createElement("div", { className: "admin-form-grid" },
            React.createElement("div", { className: "photo-upload-container" },
              React.createElement("img", { src: editando.imagen_url || 'https://img.icons8.com/fluency/100/image.png', className: "preview-img" }),
              React.createElement("input", { type: "file", accept: "image/*", onChange: manejarImagen, id: "file-input", style: {display:'none'} }),
              React.createElement("label", { htmlFor: "file-input", className: "btn-upload" }, "Cambiar Foto")
            ),
            React.createElement("div", { style: {flex:1, display:'flex', flexDirection:'column', gap:'10px'} },
              React.createElement("input", { placeholder: "Nombre del Producto", value: editando.nombre, onChange: e => setEditando({...editando, nombre: e.target.value}) }),
              React.createElement("input", { type: "number", placeholder: "Precio de Venta", value: editando.precio, onChange: e => setEditando({...editando, precio: e.target.value}) }),
              React.createElement("button", { className: "btn-save", onClick: guardarProducto }, editando.id ? "Actualizar Producto" : "Registrar Producto")
            )
          ),

          // TABLA PARA EDITAR PRODUCTOS EXISTENTES
          React.createElement("div", { style: {marginTop:'30px', overflowX:'auto'} },
            React.createElement("h3", null, "Inventario Actual"),
            React.createElement("table", { className: "report-table" },
              React.createElement("thead", null, React.createElement("tr", null, 
                React.createElement("th", null, "Foto"),
                React.createElement("th", null, "Nombre"),
                React.createElement("th", null, "Precio"),
                React.createElement("th", null, "Acción")
              )),
              React.createElement("tbody", null, productos.map(p => React.createElement("tr", {key: p.id},
                React.createElement("td", null, React.createElement("img", {src: p.imagen_url, style:{width:'40px', borderRadius:'5px'}})),
                React.createElement("td", null, p.nombre),
                React.createElement("td", null, `$${Number(p.precio).toLocaleString()}`),
                React.createElement("td", null, React.createElement("button", { onClick: () => {setEditando(p); window.scrollTo(0,0);}, className: "btn-edit-small" }, "✏️ Editar"))
              )))
            )
          )
        ),

        // FACTURA DE COMPRA
        React.createElement("div", { className: "admin-card" },
          React.createElement("h2", null, "🧾 Registro Factura de Compra"),
          React.createElement("div", { className: "admin-form-grid" },
            React.createElement("input", { placeholder: "Proveedor" }),
            React.createElement("input", { placeholder: "NIT" }),
            React.createElement("input", { placeholder: "Nro Factura" }),
            React.createElement("input", { type: "number", placeholder: "Costo Unit.", onChange: e => setCompra({...compra, precioUnit: e.target.value}) }),
            React.createElement("input", { type: "number", placeholder: "Cant.", onChange: e => setCompra({...compra, cant: e.target.value}) }),
            React.createElement("div", { className: "total-badge" }, `TOTAL: $${((compra.cant * compra.precioUnit) * 1.19).toLocaleString()}`)
          )
        )
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
