# Configuración para Railway

## Variables de Entorno (Opcional)

```env
PORT=3000
DATABASE_PATH=/tmp/railway-db
RAILWAY_ENVIRONMENT=true
```

## Características Railway ✅

- ✅ **Health Check**: Endpoint `/health` para monitoreo
- ✅ **Puerto Dinámico**: Detecta automáticamente `$PORT`
- ✅ **Temp Directory**: Usa `/tmp` del sistema
- ✅ **Graceful Shutdown**: Maneja SIGTERM y SIGINT correctamente
- ✅ **Database Path**: Almacena BD en `/tmp/railway-db`
- ✅ **Error Handling**: Logs detallados para debugging
- ✅ **Node Version**: Optimizado para Node 18.x

---

## Deployment en Railway

### 1. Conectar Repositorio

```
1. Ir a https://railway.app
2. Click "New Project"
3. "Deploy from GitHub"
4. Seleccionar: danlpz2308-boop/registro-civil-mexico
5. Railway automáticamente configura todo
```

### 2. Verificar Funcionamiento

```bash
# Health check
curl https://[tu-dominio]/health

# Debe responder:
# {"status":"ok","timestamp":"2026-06-02T..."}
```

### 3. Importar Datos

```
1. Abrir: https://[tu-dominio]
2. Click: "Importar DBF"
3. Seleccionar archivo .dbf
4. Esperar a que se procese
```

---

## Estructura de Archivos

```
/
├── server.js              # Servidor (optimizado Railway)
├── package.json           # Node 18.x + dependencias
├── public/
│   ├── index.html
│   └── app.js
└── data/                  # BD local (no persiste en Railway)
```

---

## ⚠️ NOTA IMPORTANTE

La base de datos en `/tmp` de Railway es **efímera** (se reinicia con deployments).

### Para Persistencia Permanente, opciones:

#### **Opción 1: PostgreSQL en Railway** (RECOMENDADO)

Railway ofrece PostgreSQL integrado:

1. En Railway Dashboard → "New Service"
2. Seleccionar "PostgreSQL"
3. Conectar a la aplicación automáticamente
4. Modificar código para usar PostgreSQL

#### **Opción 2: Volumen Persistente**

1. En Railway → Settings → Volumes
2. Crear volumen: `/data`
3. Mount: `/app/data`
4. Cambiar DB path a `/app/data/padron_civil.db`

#### **Opción 3: Amazon S3**

Guardar/cargar DB desde S3 para persistencia:

```env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
```

---

## Monitoreo en Railway

**Railway proporciona:**
- 📊 Logs en tiempo real
- 💾 Uso de CPU, Memoria, Red
- 🔄 Auto-restart en errores
- 📈 Métricas históricas
- 🚨 Alertas configurables

---

## Health Check

Railway verifica automáticamente el health endpoint:

```http
GET /health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-06-02T21:30:00Z"
}
```

---

## Logs en Railway

Los logs se ven en tiempo real en el dashboard:

```
📥 INICIANDO IMPORTACIÓN: archivo.dbf
📊 Tamaño: 120.45 MB
📖 Leyendo 3,600,000 registros...
⏳ Lote 1: 10,000/3,600,000 (0%) - 2.45s
...
✅ IMPORTACIÓN COMPLETADA
```

---

## Troubleshooting Railway

### Problema: "Database locked"

**Causa:** Reinicio de Railway durante transacción

**Solución:** Automático con graceful shutdown configurado

### Problema: "Memory exceeded"

**Causa:** Archivo DBF muy grande

**Solución:** Dividir en archivos menores (< 500MB)

### Problema: "No persisten datos"

**Causa:** Sistema de archivos efímero

**Solución:** Usar PostgreSQL o volumen persistente (ver arriba)

### Problema: "Port error"

**Solución:** Railway asigna puerto automáticamente en `$PORT`

---

## Variables de Entorno en Railway

En Railway Dashboard:

1. Seleccionar proyecto
2. Variables
3. Agregar variables:

```env
RAILWAY_ENVIRONMENT=true
DATABASE_PATH=/tmp/railway-db
```

---

## Configuración Recomendada

### Para Desarrollo
- Sin persistencia
- Health checks automáticos
- Logs detallados

### Para Producción
- PostgreSQL integrado (opción recomendada)
- Volumen persistente `/app/data`
- Backups automáticos
- Monitoreo activo

---

## Deploy Manual CLI

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Conectar
railway link

# Deploy
railway up
```

---

## Rollback

Si necesitas volver a versión anterior:

Railway → Deployments → Seleccionar versión → Redeploy

---

## Cost Estimations

- **Compute**: ~$5/mes (pequeño)
- **Database (PostgreSQL)**: ~$15/mes
- **Storage**: ~$1/GB/mes
- **Bandwidth**: Incluido

---

**🚂 Railway configurado correctamente** ✅
