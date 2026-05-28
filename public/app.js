const API_URL = 'http://localhost:3000/api';
let personaActiva = null;

// Actualizar estadísticas al cargar
async function actualizarEstadisticas() {
    try {
        const response = await fetch(`${API_URL}/estadisticas`);
        const data = await response.json();
        document.getElementById('contadorTotal').textContent = data.total.toLocaleString('es-MX');
    } catch (error) {
        console.error('Error:', error);
    }
}

// Buscar actas
async function buscar(termino) {
    if (!termino.trim()) {
        document.getElementById('gridResultados').innerHTML = '';
        document.getElementById('contadorResultados').textContent = '0';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/buscar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: termino, limite: 50 })
        });
        const resultados = await response.json();
        renderizarResultados(resultados);
    } catch (error) {
        console.error('Error en búsqueda:', error);
    }
}

// Renderizar resultados
function renderizarResultados(resultados) {
    const grid = document.getElementById('gridResultados');
    grid.innerHTML = '';
    document.getElementById('contadorResultados').textContent = resultados.length;

    if (resultados.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400 font-bold bg-white border border-dashed border-slate-300 rounded-xl">
            <i class="fa-solid fa-folder-open text-5xl mb-3 text-cyan-200"></i><br>No se encontraron resultados.
        </div>`;
        return;
    }

    resultados.forEach(p => {
        const html = `
        <div onclick="abrirActa(${p.id})" class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-cyan-400 cursor-pointer transition">
            <div class="flex justify-between items-start mb-3">
                <div class="bg-cyan-50 text-cyan-800 text-xs font-bold px-2 py-1 rounded">Folio: ${p.folio}</div>
                <i class="fa-solid fa-file-contract text-cyan-700 text-xl opacity-30"></i>
            </div>
            <h3 class="font-bold text-lg text-slate-800 uppercase">${p.paterno} ${p.materno}<br><span class="text-cyan-700">${p.nombres}</span></h3>
            <div class="mt-3 text-[10px] text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-100 truncate">${p.curp}</div>
            <div class="mt-2 text-xs text-slate-600"><i class="fa-solid fa-calendar-day w-4"></i> ${p.fecha_nac}</div>
        </div>`;
        grid.insertAdjacentHTML('beforeend', html);
    });
}

// Abrir acta
async function abrirActa(id) {
    try {
        const response = await fetch(`${API_URL}/acta/${id}`);
        personaActiva = await response.json();

        document.getElementById('actaNombre').textContent = personaActiva.nombres || '-';
        document.getElementById('actaPaterno').textContent = personaActiva.paterno || '-';
        document.getElementById('actaMaterno').textContent = personaActiva.materno || '-';
        document.getElementById('actaSexo').textContent = personaActiva.sexo || '-';
        document.getElementById('actaFechaNac').textContent = personaActiva.fecha_nac || '-';
        document.getElementById('actaLugarNac').textContent = personaActiva.lugar_nac || '-';
        document.getElementById('actaCurp').textContent = personaActiva.curp || '-';
        document.getElementById('actaCrip').textContent = personaActiva.folio || '-';
        document.getElementById('actaEntidad').textContent = personaActiva.entidad || 'MÉXICO';
        document.getElementById('actaMunicipio').textContent = personaActiva.municipio || '-';
        document.getElementById('actaFechaReg').textContent = personaActiva.fecha_reg || '-';
        
        document.getElementById('actaPadre1').textContent = personaActiva.padre1 || '-';
        document.getElementById('actaPadre2').textContent = personaActiva.padre2 || '-';
        document.getElementById('nacPadre1').textContent = personaActiva.nac1 || 'MEXICANA';
        document.getElementById('nacPadre2').textContent = personaActiva.nac2 || 'MEXICANA';
        
        document.getElementById('actaAbueloP1').textContent = personaActiva.abueloP1 || '-';
        document.getElementById('actaAbuelaP2').textContent = personaActiva.abuelaP2 || '-';
        document.getElementById('actaAbueloM1').textContent = personaActiva.abueloM1 || '-';
        document.getElementById('actaAbuelaM2').textContent = personaActiva.abuelaM2 || '-';

        cargarParentescos(id);
        document.getElementById('modalActa').classList.remove('hidden');
    } catch (error) {
        console.error('Error:', error);
    }
}

// Cargar parentescos
async function cargarParentescos(id) {
    try {
        const response = await fetch(`${API_URL}/parentesco/${id}`, { method: 'POST' });
        const data = await response.json();

        dibujarLista(data.hermanos, 'listaHermanos', 'Sin hermanos registrados');
        dibujarLista(data.tios, 'listaTios', 'Sin tíos registrados');
        dibujarLista(data.primos, 'listaPrimos', 'Sin primos registrados');
    } catch (error) {
        console.error('Error:', error);
    }
}

// Dibujar lista de parientes
function dibujarLista(array, containerId, msjVacio) {
    const div = document.getElementById(containerId);
    div.innerHTML = '';
    if (array.length === 0) {
        div.innerHTML = `<div class="text-xs text-slate-400 italic">${msjVacio}</div>`;
        return;
    }
    array.slice(0, 10).forEach(rel => {
        div.innerHTML += `
            <div onclick="abrirActa(${rel.id})" class="bg-white p-3 rounded shadow-sm border-l-4 border-cyan-500 cursor-pointer hover:bg-cyan-50">
                <div class="font-bold text-sm text-slate-800">${rel.nombres} ${rel.paterno}</div>
                <div class="text-[10px] text-slate-500 font-mono mt-1">${rel.curp}</div>
            </div>`;
    });
}

// Importar DBF
document.getElementById('dbfUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('dbfFile', file);

    document.getElementById('modalLoader').classList.remove('hidden');

    try {
        const response = await fetch(`${API_URL}/importar-dbf`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        alert(`✅ Importación exitosa!\n\nTotal: ${result.total}\nInsertados: ${result.insertados}\nErrores: ${result.errores}`);
        actualizarEstadisticas();
    } catch (error) {
        alert('❌ Error en la importación: ' + error.message);
    } finally {
        document.getElementById('modalLoader').classList.add('hidden');
        e.target.value = '';
    }
});

// Registrar nueva acta
document.getElementById('formNuevaActa').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        nombres: document.getElementById('fNombre').value,
        paterno: document.getElementById('fPaterno').value,
        materno: document.getElementById('fMaterno').value,
        sexo: document.getElementById('fSexo').value,
        fecha_nac: document.getElementById('fFecha').value,
        lugar_nac: document.getElementById('fLugar').value,
        padre1: document.getElementById('fPadre1').value,
        padre2: document.getElementById('fPadre2').value,
        abueloP1: document.getElementById('fAbueloP1').value,
        abuelaP2: document.getElementById('fAbuelaP2').value,
        abueloM1: document.getElementById('fAbueloM1').value,
        abuelaM2: document.getElementById('fAbuelaM2').value,
        curp: document.getElementById('fCurp').value
    };

    try {
        const response = await fetch(`${API_URL}/acta/crear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        alert('✅ ' + result.mensaje);
        cerrarModales();
        document.getElementById('formNuevaActa').reset();
        actualizarEstadisticas();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
});

// Búsqueda con debounce
let timeoutBusqueda;
document.getElementById('busquedaInput').addEventListener('input', (e) => {
    clearTimeout(timeoutBusqueda);
    timeoutBusqueda = setTimeout(() => {
        buscar(e.target.value);
    }, 300);
});

// Exportar a imagen
document.getElementById('btnImg').addEventListener('click', async () => {
    const btn = document.getElementById('btnImg');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';
    
    try {
        const canvas = await html2canvas(document.getElementById('actaDocumento'), { scale: 3, useCORS: true, backgroundColor: '#fdfbf7' });
        const link = document.createElement('a');
        link.download = `ACTA_${personaActiva.folio}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (error) {
        console.error('Error:', error);
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-image text-cyan-600 mr-2"></i> JPG';
    }
});

// Exportar a PDF
document.getElementById('btnPdf').addEventListener('click', async () => {
    const btn = document.getElementById('btnPdf');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> PDF...';
    
    try {
        const canvas = await html2canvas(document.getElementById('actaDocumento'), { scale: 3, useCORS: true, backgroundColor: '#fdfbf7' });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'letter');
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = (canvas.height * pdfW) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 10, pdfW, pdfH);
        pdf.save(`ACTA_${personaActiva.folio}.pdf`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-file-pdf text-red-600 mr-2"></i> PDF';
    }
});

// Controles UI
function abrirModalRegistro() { document.getElementById('modalRegistro').classList.remove('hidden'); }
function cerrarModales() {
    document.getElementById('modalActa').classList.add('hidden');
    document.getElementById('modalRegistro').classList.add('hidden');
}

// Inicializar
actualizarEstadisticas();
