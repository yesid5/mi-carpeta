const { useState, useEffect } = React;

const POSApp = () => {
  // --- ESTADOS ---
  const [productosDB, setProductosDB] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [statusDB, setStatusDB] = useState('conectando'); // online, offline, conectando

  // URL de tu servidor en Render (Asegúrate de que sea la correcta)
  const API_URL = "https://mi-tienda-jp.onrender.com";

  // --- 1. CARGA DE DATOS ---
  const cargarProductos = async () => {
    try {
      setStatusDB('conectando');
      const res = await fetch(`${API_URL}/productos`);
      if (res.ok) {
        const datos = await res.json();
        setProductosDB(datos);
        setStatusDB('online');
      } else {
        setStatusDB('offline');
      }
    } catch (err) {
      console.error("Error de conexión:", err);
      setStatusDB('offline');
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  // --- 2. LÓGICA DEL ESCÁNER ---
  useEffect(() => {
    let html5QrCode;
    if (escaneando) {
      html5QrCode = new Html5Qrcode("reader");
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        decodedText => {
          const p = productosDB.find(prod => prod.codigo_barras === decodedText);
          if (p) {
            agregarAlCarrito(p);
            setEscaneando(false);
            html5QrCode.stop();
          }
        }
      ).catch(err => console.log("Error de cámara:", err));
    }
    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.log("Error al detener"));
      }
    };
  }, [escaneando, productosDB]);

  // --- 3. ACCIONES DEL CARRITO ---
  const agregarAlCarrito = producto => {
    if (parseFloat(producto.stock) <= 0) return alert("¡Producto agotado!");
    
    const existe = carrito.find(item => item.id === producto.id);
    if (existe) {
      setCarrito(carrito.map(item =>
        item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) return alert("El carrito está vacío");
    setCargando(true);

    const datosVenta = {
      total: total,
      carrito: carrito, // El backend espera 'carrito' según tu server.js
      metodo_pago: 'Efectivo'
    };

    try {
      const res = await fetch(`${API_URL}/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosVenta)
      });

      if (res.ok) {
        alert("✅ Venta realizada con éxito");
        setCarrito([]);
        cargarProductos(); // Actualiza el stock automáticamente
      } else {
        alert("❌ No se pudo procesar la venta");
      }
    } catch (err) {
      alert("❌ Error de comunicación con el servidor");
    } finally {
      setCargando(false);
    }
  };

  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  // --- 4. FILTRADO INTELIGENTE ---
  const productosFiltrados = productosDB.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (p.codigo_barras && p.codigo_barras.includes(busqueda))
  );

  // --- INTERFAZ ---
  return React.createElement("div", { className: "pos-container" },
    React.createElement("div", { className: "main-panel" },
      React.createElement("header", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
        React.createElement("h1", null, "🏪 Tienda JP"),
        React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '5px', background: '#eee', padding: '5px 10px', borderRadius: '15px' } },
          React.createElement("div", { style: {
            width: '10px', height: '10px', borderRadius: '50%',
            backgroundColor: statusDB === 'online' ? '#28a745' : statusDB === 'conectando' ? '#ffc107' : '#dc3545'
          } }),
          React.createElement("span", { style: { fontSize: '0.7rem', fontWeight: 'bold' } }, statusDB.toUpperCase())
        )
      ),

      React.createElement("div", { style: { display: 'flex', gap: '10px', marginBottom: '20px' } },
        React.createElement("input", {
          type: "text",
          placeholder: "Buscar por nombre o código...",
          value: busqueda,
          onChange: e => setBusqueda(e.target.value),
          style: { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }
        }),
        React.createElement("button", {
          onClick: () => setEscaneando(!escaneando),
          style: { padding: '0 20px', borderRadius: '8px', background: escaneando ? '#ff4d4d' : '#007bff', color: 'white', border: 'none', cursor: 'pointer' }
        }, escaneando ? 'Cerrar Cámara' : '📷 Escanear')
      ),

      escaneando && React.createElement("div", { style: { marginBottom: '20px', borderRadius: '10px', overflow: 'hidden', border: '3px solid #007bff' } },
        React.createElement("div", { id: "reader", style: { width: '100%' } })
      ),

      React.createElement("div", { className: "product-grid" },
        productosFiltrados.map((p) =>
          React.createElement("div", { 
            key: p.id, 
            className: `product-card ${p.stock <= 0 ? 'no-stock' : ''}`, 
            onClick: () => agregarAlCarrito(p) 
          },
            React.createElement("h3", null, p.nombre),
            React.createElement("p", { className: "price" }, "$", parseFloat(p.precio).toLocaleString()),
            React.createElement("p", { 
              style: { 
                color: p.stock <= 5 ? '#d32f2f' : '#666', 
                fontWeight: p.stock <= 5 ? 'bold' : 'normal'
              } 
            }, `Stock: ${p.stock} ${p.stock <= 5 ? '⚠️' : ''}`)
          )
        )
      )
    ),

    React.createElement("div", { className: "sidebar" },
      React.createElement("h2", null, "🛒 Cuenta"),
      React.createElement("div", { className: "cart-list", style: { flex: 1, overflowY: 'auto', minHeight: '200px' } },
        carrito.map((item) =>
          React.createElement("div", { key: item.id, className: "cart-item" },
            React.createElement("span", null, item.cantidad, "x ", item.nombre),
            React.createElement("span", null, "$", (item.precio * item.cantidad).toLocaleString())
          )
        )
      ),
      React.createElement("div", { className: "total-section" },
        React.createElement("hr", null),
        React.createElement("h3", null, "Total: $", total.toLocaleString()),
        React.createElement("button", { className: "btn-pay", onClick: finalizarVenta, disabled: cargando || carrito.length === 0 },
          cargando ? 'PROCESANDO...' : 'FINALIZAR VENTA'),
        React.createElement("button", { 
          className: "btn-report", 
          onClick: async () => {
             // Aquí podrías llamar a tu ruta de /reporte-hoy si quieres datos reales
             setMostrarReporte(true);
          } 
        }, "CIERRE DE CAJA")
      )
    ),

    mostrarReporte && React.createElement("div", { className: "modal-overlay" },
      React.createElement("div", { className: "modal-content" },
        React.createElement("h2", null, "Resumen de Caja"),
        React.createElement("p", { style: { fontSize: '1.2rem', margin: '20px 0' } }, "Ventas registradas en esta sesión."),
        React.createElement("h1", { style: { color: '#28a745' } }, "$", total.toLocaleString()),
        React.createElement("button", { onClick: () => setMostrarReporte(false), className: "btn-pay" }, "Entendido")
      )
    )
  );
};

ReactDOM.render(React.createElement(POSApp, null), document.getElementById('root'));
