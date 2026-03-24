const API_URL = "https://mi-carpeta.onrender.com"; // CAMBIA ESTO

const POSApp = () => {
  const [productos, setProductos] = React.useState([]);
  const [carrito, setCarrito] = React.useState([]);
  const [busqueda, setBusqueda] = React.useState("");

  const cargarProductos = async () => {
    try {
      const res = await fetch(`${API_URL}/productos`);
      const data = await res.json();
      setProductos(data);
    } catch (e) { console.error("Error cargando"); }
  };

  React.useEffect(() => { cargarProductos(); }, []);

  const agregarAlCarrito = (p) => {
    const existe = carrito.find(i => i.id === p.id);
    if (existe) {
      setCarrito(carrito.map(i => i.id === p.id ? {...i, cantidad: i.cantidad + 1} : i));
    } else {
      setCarrito([...carrito, {...p, cantidad: 1}]);
    }
  };

  const finalizarVenta = async () => {
    const total = carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
    const res = await fetch(`${API_URL}/ventas`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ total, carrito })
    });
    if (res.ok) {
      alert("✅ Venta realizada");
      setCarrito([]);
      cargarProductos();
    }
  };

  const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="container">
      <h1>🏪 Tienda JP</h1>
      <input 
        type="text" 
        placeholder="Buscar..." 
        value={busqueda} 
        onChange={(e) => setBusqueda(e.target.value)} 
      />
      
      <div className="grid">
        {filtrados.map(p => (
          <div key={p.id} className="card" onClick={() => agregarAlCarrito(p)}>
            <img src={p.imagen_url || 'https://via.placeholder.com/100'} alt={p.nombre} />
            <p>{p.nombre}</p>
            <strong>${parseFloat(p.precio).toLocaleString()}</strong>
          </div>
        ))}
      </div>

      {carrito.length > 0 && (
        <div className="footer-carrito">
          <button onClick={finalizarVenta}>Cobrar Total: ${carrito.reduce((acc, i) => acc + (i.precio * i.cantidad), 0)}</button>
        </div>
      )}
    </div>
  );
};

// RENDERIZADO FINAL LIMPIO
ReactDOM.render(React.createElement(POSApp), document.getElementById('root'));
