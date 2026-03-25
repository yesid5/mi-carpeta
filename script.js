const API_URL "https://mi-carpeta.onrender.com"; // 👈 CAMBIA ESTO POR TU URL REAL

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [busqueda, setBusqueda] = React.useState("");

  const cargarProductos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Error al cargar productos"); }
  };

  React.useEffect(() => { cargarProductos(); }, []);

  const agregarAlCarrito = (p) => {
    const existe = carrito.find(item => item.id === p.id);
    if (existe) {
      setCarrito(carrito.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) return;
    const total = carrito.reduce((acc, i) => acc + (Number(i.precio) * i.cantidad), 0);
    try {
      const res = await fetch(`${API_URL}/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total, carrito })
      });
      if (res.ok) {
        alert("💰 Venta cobrada con éxito");
        setCarrito([]);
        cargarProductos();
      }
    } catch (e) { alert("Error al procesar el pago"); }
  };

  const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const totalCarrito = carrito.reduce((acc, i) => acc + (Number(i.precio) * i.cantidad), 0);

  return React.createElement("div", { className: "container" },
    React.createElement("h1", null, "🏪 Tienda JP"),
    React.createElement("input", {
      type: "text",
      placeholder: "🔍 Buscar producto...",
      value: busqueda,
      onChange: (e) => setBusqueda(e.target.value)
    }),
    React.createElement("div", { className: "grid" },
      filtrados.map(p => 
        React.createElement("div", { key: p.id, className: "card", onClick: () => agregarAlCarrito(p) },
          React.createElement("img", { 
            src: p.imagen_url || 'https://via.placeholder.com/100',
            onError: (e) => { e.target.src = 'https://img.icons8.com/clouds/100/product.png'; }
          }),
          React.createElement("p", null, p.nombre),
          React.createElement("strong", null, `$${Number(p.precio).toLocaleString()}`)
        )
      )
    ),
    carrito.length > 0 && React.createElement("div", { className: "footer-carrito" },
      React.createElement("button", { onClick: finalizarVenta }, 
        `COBRAR: $${totalCarrito.toLocaleString()}`
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
