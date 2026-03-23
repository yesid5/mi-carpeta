const { useState, useEffect } = React;

const POSApp = () => {
  // --- ESTADOS ---
  const [productosDB, setProductosDB] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [reporte, setReporte] = useState(null);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [statusDB, setStatusDB] = useState('conectando'); // online, offline, conectando

  // URL de tu servidor en Render (Asegúrate de cambiarla)
  const API_URL = 'https://mi-carpeta.onrender.com';

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
      }).
      catch(err => console.log("La cámara no pudo iniciar o no hay permisos."));
    }
    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.log("Error al detener cámara"));
      }
    };
  }, [escaneando, productosDB]);

  // --- 3. ACCIONES DEL CARRITO ---
  const agregarAlCarrito = producto => {
    if (producto.stock <= 0) return alert("¡Producto agotado!");
    const existe = carrito.find(item => item.id === producto.id);
    if (existe) {
      setCarrito(carrito.map((item) =>
      item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item));

    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) return alert("El carrito está vacío");
    setCargando(true);

    const datosVenta = {
      metodo_pago: 'Efectivo',
      productos: carrito.map(i => ({
        id: i.id,
        cantidad: i.cantidad,
        precio_unitario: i.precio })) };



    try {
      const res = await fetch(`${API_URL}/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosVenta) });

      if (res.ok) {
        alert("✅ Venta realizada con éxito");
        setCarrito([]);
        cargarProductos(); // Actualiza el stock
      } else {
        const error = await res.json();
        alert("❌ Error: " + error.error);
      }
    } catch (err) {
      alert("❌ Error de comunicación con el servidor");
    } finally {
      setCargando(false);
    }
  };

  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  // --- INTERFAZ ---
  return /*#__PURE__*/(
    React.createElement("div", { className: "pos-container" }, /*#__PURE__*/
    React.createElement("div", { className: "main-panel" }, /*#__PURE__*/
    React.createElement("header", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } }, /*#__PURE__*/
    React.createElement("h1", null, "\uD83C\uDFEA Tienda jp"), /*#__PURE__*/
    React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, /*#__PURE__*/

    React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '5px', background: '#eee', padding: '5px 10px', borderRadius: '15px' } }, /*#__PURE__*/
    React.createElement("div", { style: {
        width: '10px', height: '10px', borderRadius: '50%',
        backgroundColor: statusDB === 'online' ? '#28a745' : statusDB === 'conectando' ? '#ffc107' : '#dc3545' } }), /*#__PURE__*/

    React.createElement("span", { style: { fontSize: '0.7rem', fontWeight: 'bold' } },
    statusDB.toUpperCase())))), /*#__PURE__*/






    React.createElement("div", { style: { display: 'flex', gap: '10px', marginBottom: '20px' } }, /*#__PURE__*/
    React.createElement("input", {
      type: "text",
      placeholder: "Buscar por nombre...",
      value: busqueda,
      onChange: e => setBusqueda(e.target.value),
      style: { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd' } }), /*#__PURE__*/

    React.createElement("button", {
      onClick: () => setEscaneando(!escaneando),
      style: { padding: '0 20px', borderRadius: '8px', background: escaneando ? '#ff4d4d' : '#007bff', color: 'white', border: 'none', cursor: 'pointer' } },

    escaneando ? 'Cerrar Cámara' : '📷 Escanear')),




    escaneando && /*#__PURE__*/
    React.createElement("div", { style: { marginBottom: '20px', borderRadius: '10px', overflow: 'hidden', border: '3px solid #007bff' } }, /*#__PURE__*/
    React.createElement("div", { id: "reader", style: { width: '100%' } })), /*#__PURE__*/




    React.createElement("div", { className: "product-grid" },
    productosDB.
    filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).
    map((p) => /*#__PURE__*/
    React.createElement("div", { key: p.id, className: "product-card", onClick: () => agregarAlCarrito(p) }, /*#__PURE__*/
    React.createElement("h3", null, p.nombre), /*#__PURE__*/
    React.createElement("p", { className: "price" }, "$", p.precio.toLocaleString()), /*#__PURE__*/
    React.createElement("p", { className: "stock" }, "Disp: ", p.stock))))), /*#__PURE__*/







    React.createElement("div", { className: "sidebar" }, /*#__PURE__*/
    React.createElement("h2", null, "\uD83D\uDED2 Cuenta"), /*#__PURE__*/
    React.createElement("div", { className: "cart-list", style: { flex: 1, overflowY: 'auto', minHeight: '200px' } },
    carrito.map((item) => /*#__PURE__*/
    React.createElement("div", { key: item.id, className: "cart-item" }, /*#__PURE__*/
    React.createElement("span", null, item.cantidad, "x ", item.nombre), /*#__PURE__*/
    React.createElement("span", null, "$", (item.precio * item.cantidad).toLocaleString())))), /*#__PURE__*/



    React.createElement("div", { className: "total-section" }, /*#__PURE__*/
    React.createElement("hr", null), /*#__PURE__*/
    React.createElement("h3", null, "Total: $", total.toLocaleString()), /*#__PURE__*/
    React.createElement("button", { className: "btn-pay", onClick: finalizarVenta, disabled: cargando },
    cargando ? 'PROCESANDO...' : 'FINALIZAR VENTA'), /*#__PURE__*/

    React.createElement("button", { className: "btn-report", onClick: () => setMostrarReporte(true) }, "CIERRE DE CAJA"))),




    mostrarReporte && /*#__PURE__*/
    React.createElement("div", { className: "modal" }, /*#__PURE__*/
    React.createElement("div", { className: "modal-content" }, /*#__PURE__*/
    React.createElement("h2", null, "Resumen de Caja"), /*#__PURE__*/
    React.createElement("p", { style: { fontSize: '1.5rem', margin: '20px 0' } }, "Total: ", /*#__PURE__*/React.createElement("strong", null, "$", total.toLocaleString())), /*#__PURE__*/
    React.createElement("button", { onClick: () => setMostrarReporte(false), className: "btn-pay" }, "Cerrar")))));





};

ReactDOM.render( /*#__PURE__*/React.createElement(POSApp, null), document.getElementById('root'));
