# 🏛️ Sistema de Registro Civil - Población de México

**Versión 2.0** - Sistema escalable para albergar **3.6M+ registros** con optimizaciones para Railway

## 📋 Descripción

Sistema completo de gestión de Registro Civil diseñado para manejar la población de México. Permite:

✅ Importar archivos DBF masivamente (3.6M registros por archivo)  
✅ Búsqueda ultrarrápida por CURP, nombre o folio  
✅ Inteligencia relacional (hermanos, tíos, primos)  
✅ Crear registros nuevos manualmente  
✅ Exportar actas a PDF e imagen JPG  
✅ Base de datos SQLite con WAL mode optimizado  
✅ API REST para integración  
✅ **Compatible con Railway.app** 🚂  

---

## 🚀 Instalación Local

### Requisitos previos
```bash
- Node.js 18.x
- npm
```

### Pasos

```bash
# Clonar repositorio
git clone https://github.com/danlpz2308-boop/registro-civil-mexico.git
cd registro-civil-mexico

# Instalar dependencias
npm install

# Ejecutar servidor
npm start
```

Abrir en navegador: `http://localhost:3000`

---

## 🚂 Deployment en Railway

### Deploy Automático

1. Ir a [railway.app](https://railway.app)
2. Click "New Project"
3. "Deploy from GitHub"
4. Seleccionar: `danlpz2308-boop/registro-civil-mexico`
5. Railway automáticamente instala y ejecuta

**¡Listo!** El sistema estará disponible en un dominio Railway.

### Verificar

```bash
curl https://[tu-dominio]/health
# Respuesta: {"status":"ok","timestamp":"..."}
```

### Características Railway

✅ Health check automático (`/health`)  
✅ Puerto dinámico (`$PORT`)  
✅ Graceful shutdown (SIGTERM/SIGINT)  
✅ Temp directory configurado  
✅ Logs en tiempo real  
✅ Auto-restart en errores  

Ver [RAILWAY.md](./RAILWAY.md) para configuración avanzada.

---

## 📂 Estructura del Proyecto

```
registro-civil-mexico/
├── server.js                 # Backend Express (optimizado Railway)
├── package.json              # Dependencias + Node 18.x
├── .gitignore                # Archivos excluidos
├── README.md                 # Este archivo
├── RAILWAY.md                # Guía de Railway
├── TEST_DBF_UPLOAD.md        # Guía de pruebas
├── public/
│   ├── index.html            # Interfaz
│   └── app.js                # Lógica frontend
└── data/
    └── padron_civil.db       # Base de datos (local)
```

---

## 🗄️ Base de Datos

### Tabla: `actas_nacimiento`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | ID único (PK) |
| folio | TEXT | Folio único |
| curp | TEXT | CURP único |
| nombres | TEXT | Nombres |
| paterno | TEXT | Apellido paterno |
| materno | TEXT | Apellido materno |
| sexo | TEXT | MASCULINO / FEMENINO |
| fecha_nac | TEXT | Fecha nacimiento |
| lugar_nac | TEXT | Lugar nacimiento |
| entidad | TEXT | Estado |
| municipio | TEXT | Municipio |
| padre1 | TEXT | Padre/Madre 1 |
| padre2 | TEXT | Padre/Madre 2 |
| nac1 | TEXT | Nacionalidad padre 1 |
| nac2 | TEXT | Nacionalidad padre 2 |
| abueloP1 | TEXT | Abuelo paterno |
| abuelaP2 | TEXT | Abuela paterna |
| abueloM1 | TEXT | Abuelo materno |
| abuelaM2 | TEXT | Abuela materna |

**Índices optimizados:**
```sql
idx_curp      - Búsquedas por CURP
idx_nombres   - Búsquedas por nombre
idx_paterno   - Búsquedas por apellido
idx_materno   - Búsquedas por apellido
idx_folio     - Búsquedas por folio
idx_entidad   - Filtros por estado
```

---

## 🔌 API REST

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### **GET** - Estadísticas
```http
GET /api/estadisticas
```

#### **POST** - Buscar
```http
POST /api/buscar
Content-Type: application/json

{
  "q": "JUAN",
  "limite": 50
}
```

#### **GET** - Obtener Acta
```http
GET /api/acta/:id
```

#### **POST** - Crear Acta
```http
POST /api/acta/crear
```

#### **POST** - Importar DBF
```http
POST /api/importar-dbf
Content-Type: multipart/form-data
```

#### **POST** - Parentesco
```http
POST /api/parentesco/:id
```

#### **GET** - Health Check (Railway)
```http
GET /health
```

---

## 💻 Interfaz de Usuario

### Características

**Pantalla Principal:**
- 🔍 Búsqueda instantánea por nombre, CURP o folio
- 📊 Contador de actas en tiempo real
- 📇 Grid de resultados (Top 50)
- 📤 Importar DBF
- ✏️ Registrar nuevo acta

**Visor de Acta:**
- 📄 Acta oficial con diseño profesional
- 👨‍👩‍👧‍👦 Panel relacional (hermanos, tíos, primos)
- 📥 Exportar a PDF
- 🖼️ Exportar a JPG

---

## 📊 Capacidades

| Métrica | Valor |
|---------|-------|
| **Máximo registros por archivo** | 3,600,000 |
| **Velocidad de importación** | ~20,000 registros/segundo |
| **Tiempo para 3.6M** | ~180-200 segundos |
| **Velocidad de búsqueda** | <100ms |
| **Tamaño BD (3.6M)** | ~500-700 MB |

---

## ⚙️ Optimizaciones SQLite

```javascript
PRAGMA journal_mode = WAL          // Mejor concurrencia
PRAGMA synchronous = NORMAL        // Menos sincronización
PRAGMA cache_size = -64000         // 64MB caché
PRAGMA mmap_size = 30000000        // Memory-mapped I/O
PRAGMA page_size = 4096            // Tamaño página óptimo
```

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| "Database locked" | Se resuelve automáticamente con graceful shutdown |
| Datos no persisten (Railway) | Usar volumen persistente o PostgreSQL |
| Búsqueda lenta | Verificar índices creados |
| Port conflict | Railway asigna automáticamente |

---

## 📝 Licencia

MIT License © 2024

---

## 👨‍💻 Autor

**danlpz2308-boop**

---

**🚀 Sistema listo para producción con Railway** ✅
