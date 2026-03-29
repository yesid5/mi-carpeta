// 1. CORRECCIÓN: Se agregó el "=" que faltaba
const API_URL = "https://mi-carpeta.onrender.com"; 

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [busqueda, setBusqueda] = React.useState("");

  // Función para cargar productos desde el backend
  const cargarProductos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { 
      console.error("Error al cargar productos", e); 
    }
  };

  React.useEffect(() => { 
    cargarProductos(); 
  }, []);

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
    } catch (e) { 
      alert("Error al procesar el pago"); 
    }
  };

  const filtrados = productos.filter(p => 
    p.nombre && p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  
  const totalCarrito = carrito.reduce((acc, i) => acc + (Number(i.precio) * i.cantidad), 0);

  // --- RENDERIZADO ---
  return React.createElement("div", { className: "container" },
    React.createElement("h1", null, "🏪 Tienda JP"),
    
    React.createElement("input", {
      type: "text",
      className: "search-input", // Agregamos clase para CSS
      placeholder: "🔍 Buscar producto...",
      value: busqueda,
      onChange: (e) => setBusqueda(e.target.value)
    }),

    React.createElement("div", { className: "grid" },
      filtrados.map(p => 
        React.createElement("div", { 
          key: p.id, 
          className: "card", 
          onClick: () => agregarAlCarrito(p) 
        },
          React.createElement("img", { 
            // Usamos una imagen de respaldo más confiable que placeholder.com
            src: p.imagen_url || 'https://img.icons8.com/fluency/100/box.png',
            style: { width: '80px', height: '80px', objectFit: 'cover' },
            onError: (e) => { e.target.src = 'https://img.icons8.com/fluency/100/box.png'; }
          }),
          React.createElement("p", { className: "p-name" }, p.nombre),
          React.createElement("strong", null, `$${Number(p.precio).toLocaleString()}`)
        )
      )
    ),

    // Mostrar footer solo si hay productos en el carrito
    carrito.length > 0 && React.createElement("div", { className: "footer-carrito" },
      React.createElement("button", { 
        className: "btn-pay", 
        onClick: finalizarVenta 
      }, `COBRAR: $${totalCarrito.toLocaleString()}`)
    )
  );
};

// 2. CORRECCIÓN: Renderizado compatible con React 18
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(React.createElement(POSApp));
