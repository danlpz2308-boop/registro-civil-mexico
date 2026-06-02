const express = require('express');
const fileUpload = require('express-fileupload');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(fileUpload({ 
    useTempFiles: true,
    tempFileDir: '/tmp/',
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB
}));
app.use(express.static('public'));

// Crear carpeta de BD si no existe
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

const dbPath = path.join(dbDir, 'padron_civil.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ Error al conectar BD:', err);
    else console.log('✅ Base de datos conectada:', dbPath);
});

// ========================================
// OPTIMIZACIONES PARA GRAN VOLUMEN
// ========================================

// Desactivar fsync durante importación masiva
db.configure('busyTimeout', 30000); // 30 segundos

// ========================================
// CREAR TABLA OPTIMIZADA CON WAL MODE
// ========================================
db.serialize(() => {
    // Habilitar WAL mode para mejor concurrencia
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA synchronous = NORMAL');
    db.run('PRAGMA cache_size = -64000'); // 64MB cache
    db.run('PRAGMA temp_store = MEMORY');
    db.run('PRAGMA mmap_size = 30000000'); // Memory-mapped I/O
    db.run('PRAGMA page_size = 4096');

    db.run(`
        CREATE TABLE IF NOT EXISTS actas_nacimiento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            folio TEXT UNIQUE NOT NULL,
            curp TEXT UNIQUE NOT NULL,
            nombres TEXT NOT NULL,
            paterno TEXT NOT NULL,
            materno TEXT,
            sexo TEXT,
            fecha_nac TEXT,
            lugar_nac TEXT,
            entidad TEXT,
            municipio TEXT,
            fecha_reg TEXT,
            padre1 TEXT,
            padre2 TEXT,
            nac1 TEXT DEFAULT 'MEXICANA',
            nac2 TEXT DEFAULT 'MEXICANA',
            abueloP1 TEXT,
            abuelaP2 TEXT,
            abueloM1 TEXT,
            abuelaM2 TEXT,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Crear índices para búsqueda rápida
    db.run(`CREATE INDEX IF NOT EXISTS idx_curp ON actas_nacimiento(curp)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_nombres ON actas_nacimiento(nombres)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_paterno ON actas_nacimiento(paterno)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_materno ON actas_nacimiento(materno)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_folio ON actas_nacimiento(folio)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_entidad ON actas_nacimiento(entidad)`);

    console.log('✅ Tabla de actas creada con optimizaciones para gran volumen');
});

// ========================================
// FUNCIONES UTILITARIAS
// ========================================
const promiseDb = {
    run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    },
    get: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },
    all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }
};

// ========================================
// LECTOR DBF BINARIO OPTIMIZADO
// ========================================
function readDBFBuffer(buffer) {
    try {
        const view = new DataView(buffer);
        
        const numRecords = view.getUint32(4, true);
        const headerLength = view.getUint16(8, true);
        const recordLength = view.getUint16(10, true);

        let offset = 32;
        const fields = [];

        while (view.getUint8(offset) !== 0x0D) {
            const nameBytes = new Uint8Array(buffer, offset, 11);
            const name = Buffer.from(nameBytes).toString('ascii').replace(/\0/g, '').trim();
            const type = String.fromCharCode(view.getUint8(offset + 11));
            const length = view.getUint8(offset + 16);
            fields.push({ name, type, length });
            offset += 32;
        }

        const records = [];
        let recordOffset = headerLength;
        const decoder = new TextDecoder('iso-8859-1');
        // Soportar hasta 3.6M registros
        const limit = Math.min(numRecords, 3600000);

        console.log(`📖 Leyendo ${limit.toLocaleString('es-MX')} registros...`);
        
        for (let i = 0; i < limit; i++) {
            if (i % 500000 === 0 && i > 0) {
                console.log(`  ⏳ Procesados ${i.toLocaleString('es-MX')} registros...`);
            }
            
            const isDeleted = view.getUint8(recordOffset) === 0x2A;
            if (!isDeleted) {
                let fieldOffset = recordOffset + 1;
                const record = {};
                for (const field of fields) {
                    const fieldBytes = new Uint8Array(buffer, fieldOffset, field.length);
                    let value = decoder.decode(fieldBytes).trim();
                    if (typeof value === 'string') value = value.toUpperCase();
                    record[field.name] = value;
                    fieldOffset += field.length;
                }
                records.push(record);
            }
            recordOffset += recordLength;
        }

        console.log(`✅ Lectura completada: ${records.length.toLocaleString('es-MX')} registros leídos`);
        return records;
    } catch (error) {
        throw new Error(`Error al parsear DBF: ${error.message}`);
    }
}

// ========================================
// RUTAS API
// ========================================

// GET: Obtener estadísticas
app.get('/api/estadisticas', async (req, res) => {
    try {
        const result = await promiseDb.get(`SELECT COUNT(*) as total FROM actas_nacimiento`);
        res.json({ 
            total: result.total,
            mensaje: `Total de actas en la base de datos: ${result.total.toLocaleString('es-MX')}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Buscar actas
app.post('/api/buscar', async (req, res) => {
    try {
        const { q, limite = 50 } = req.body;
        
        if (!q || q.trim() === '') {
            return res.json([]);
        }

        const searchTerm = `%${q.toUpperCase()}%`;
        
        const sql = `
            SELECT * FROM actas_nacimiento
            WHERE curp LIKE ? 
               OR nombres LIKE ?
               OR paterno LIKE ?
               OR materno LIKE ?
               OR folio LIKE ?
            LIMIT ?
        `;
        
        const results = await promiseDb.all(sql, [
            searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, parseInt(limite)
        ]);
        
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET: Obtener una acta por ID
app.get('/api/acta/:id', async (req, res) => {
    try {
        const acta = await promiseDb.get(
            `SELECT * FROM actas_nacimiento WHERE folio = ? OR id = ?`,
            [req.params.id, req.params.id]
        );
        
        if (!acta) {
            return res.status(404).json({ error: 'Acta no encontrada' });
        }
        
        res.json(acta);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Crear nueva acta manualmente
app.post('/api/acta/crear', async (req, res) => {
    try {
        const {
            nombres, paterno, materno, sexo, fecha_nac, lugar_nac,
            padre1, padre2, nac1, nac2, abueloP1, abuelaP2, abueloM1, abuelaM2,
            entidad, municipio, curp
        } = req.body;

        const folio = `RC-${Date.now().toString().slice(-6)}`;
        const finalCurp = curp || 'NO-ASIGNADA';

        const sql = `
            INSERT INTO actas_nacimiento 
            (folio, curp, nombres, paterno, materno, sexo, fecha_nac, lugar_nac, 
             padre1, padre2, nac1, nac2, abueloP1, abuelaP2, abueloM1, abuelaM2,
             entidad, municipio, fecha_reg)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await promiseDb.run(sql, [
            folio, finalCurp.toUpperCase(), nombres.toUpperCase(), paterno.toUpperCase(),
            materno.toUpperCase(), sexo.toUpperCase(), fecha_nac, lugar_nac.toUpperCase(),
            padre1.toUpperCase(), padre2.toUpperCase(), nac1, nac2,
            abueloP1.toUpperCase(), abuelaP2.toUpperCase(), 
            abueloM1.toUpperCase(), abueloM2.toUpperCase(),
            entidad || 'MÉXICO', municipio || 'REGISTRO LOCAL',
            new Date().getFullYear().toString()
        ]);

        res.json({ 
            success: true, 
            id: result.lastID, 
            folio,
            mensaje: 'Acta registrada exitosamente'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Importar archivo DBF - OPTIMIZADO PARA GRAN VOLUMEN
app.post('/api/importar-dbf', async (req, res) => {
    try {
        if (!req.files || !req.files.dbfFile) {
            return res.status(400).json({ error: 'No se proporcionó archivo DBF' });
        }

        const uploadedFile = req.files.dbfFile;
        const fileName = uploadedFile.name.toLowerCase();

        if (!fileName.endsWith('.dbf')) {
            return res.status(400).json({ error: 'El archivo debe ser formato .dbf' });
        }

        console.log(`\n📥 INICIANDO IMPORTACIÓN: ${fileName}`);
        console.log(`📊 Tamaño del archivo: ${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`);
        
        const startTime = Date.now();
        
        // Leer archivo en buffer
        const buffer = uploadedFile.data;
        const recordsRaw = readDBFBuffer(buffer);

        console.log(`📊 Total de registros a importar: ${recordsRaw.length.toLocaleString('es-MX')}`);

        // Preparar datos mapeados
        const recordsMapped = recordsRaw.map((row, index) => {
            let domicilio = [row.CALLE, row.EXT || row.NUM_EXT, row.COLONIA || row.COL]
                .filter(Boolean).join(" ");
            if (!domicilio) domicilio = row.LUGAR || row.ESTADO || row.ENTIDAD || "MÉXICO";

            return {
                folio: row.FOLIO || row.ID || row.CLAVE || row.CVE || `1999-${index+1}`,
                curp: row.CURP || row.CLAVE || row.CVE_ELEC || "NO-ASIGNADA",
                nombres: row.NOMBRE || "",
                paterno: row.PATERNO || row.APELLIDO_P || "",
                materno: row.MATERNO || row.APELLIDO_M || "",
                sexo: row.SEXO ? (row.SEXO === 'H' ? 'MASCULINO' : (row.SEXO === 'M' ? 'FEMENINO' : 'NO-ESPECIFICADO')) : 'NO-ESPECIFICADO',
                fecha_nac: row.FECHA_NAC || row.FECNAC || row.AÑO_NAC || row.EDAD || "NO-REGISTRADA",
                lugar_nac: domicilio,
                padre1: row.PADRE1 || row.NOMBRE_PAD || row.PADRE || "",
                padre2: row.PADRE2 || row.NOMBRE_MAD || row.MADRE || "",
                nac1: row.NAC_PAD || "MEXICANA",
                nac2: row.NAC_MAD || "MEXICANA",
                abueloP1: row.ABUELO_P1 || "",
                abuelaP2: row.ABUELA_P2 || "",
                abueloM1: row.ABUELO_M1 || "",
                abuelaM2: row.ABUELA_M2 || "",
                entidad: row.ENTIDAD || row.E || "MÉXICO",
                municipio: row.MUNICIPIO || row.M || "NO-ESP",
                fecha_reg: row.FECHA_REG || row.REGISTRO || "1999"
            };
        });

        // Insertar en lotes GRANDES para mejor rendimiento
        const batchSize = 10000; // Aumentado a 10,000 para gran volumen
        let insertados = 0;
        let errores = 0;
        let batchNumber = 0;

        console.log(`\n🔄 Iniciando inserción en lotes de ${batchSize.toLocaleString('es-MX')}...`);

        for (let i = 0; i < recordsMapped.length; i += batchSize) {
            batchNumber++;
            const batch = recordsMapped.slice(i, i + batchSize);
            const batchStartTime = Date.now();
            
            for (const rec of batch) {
                try {
                    await promiseDb.run(`
                        INSERT INTO actas_nacimiento 
                        (folio, curp, nombres, paterno, materno, sexo, fecha_nac, lugar_nac,
                         padre1, padre2, nac1, nac2, abueloP1, abuelaP2, abueloM1, abuelaM2,
                         entidad, municipio, fecha_reg)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        rec.folio, rec.curp, rec.nombres, rec.paterno, rec.materno, rec.sexo,
                        rec.fecha_nac, rec.lugar_nac, rec.padre1, rec.padre2, rec.nac1, rec.nac2,
                        rec.abueloP1, rec.abuelaP2, rec.abueloM1, rec.abuelaM2, rec.entidad,
                        rec.municipio, rec.fecha_reg
                    ]);
                    insertados++;
                } catch (err) {
                    errores++;
                }
            }
            
            const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(2);
            const progressPercent = Math.min(100, Math.round((i + batchSize) / recordsMapped.length * 100));
            console.log(`  ⏳ Lote ${batchNumber}: ${(i + batchSize).toLocaleString('es-MX')}/${recordsMapped.length.toLocaleString('es-MX')} (${progressPercent}%) - ${batchTime}s`);
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        const recordsPerSecond = Math.round(insertados / parseFloat(totalTime));

        console.log(`\n✅ IMPORTACIÓN COMPLETADA`);
        console.log(`   Total procesados: ${recordsMapped.length.toLocaleString('es-MX')}`);
        console.log(`   Insertados correctamente: ${insertados.toLocaleString('es-MX')}`);
        console.log(`   Errores: ${errores.toLocaleString('es-MX')}`);
        console.log(`   Tiempo total: ${totalTime}s`);
        console.log(`   Velocidad: ${recordsPerSecond.toLocaleString('es-MX')} registros/segundo\n`);

        res.json({
            success: true,
            total: recordsMapped.length,
            insertados,
            errores,
            time: parseFloat(totalTime),
            speed: recordsPerSecond,
            mensaje: `✅ Importación completada en ${totalTime}s: ${insertados.toLocaleString('es-MX')} registros insertados, ${errores.toLocaleString('es-MX')} errores`
        });

    } catch (error) {
        console.error('❌ Error en importación:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Buscar parentesco
app.post('/api/parentesco/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const target = await promiseDb.get(
            `SELECT * FROM actas_nacimiento WHERE folio = ? OR id = ?`,
            [id, id]
        );

        if (!target) {
            return res.status(404).json({ error: 'Persona no encontrada' });
        }

        // Hermanos: comparten padres
        const hermanos = await promiseDb.all(`
            SELECT * FROM actas_nacimiento
            WHERE id != ?
            AND (
                (padre1 = ? AND padre1 != '') OR
                (padre2 = ? AND padre2 != '') OR
                (padre1 = ? AND padre1 != '') OR
                (padre2 = ? AND padre2 != '')
            )
            LIMIT 20
        `, [target.id, target.padre1, target.padre1, target.padre2, target.padre2]);

        // Tíos: comparten abuelos
        const tios = await promiseDb.all(`
            SELECT * FROM actas_nacimiento
            WHERE id != ?
            AND (
                (padre1 IN (?, ?, ?, ?)) OR
                (padre2 IN (?, ?, ?, ?))
            )
            LIMIT 20
        `, [
            target.id,
            target.abueloP1, target.abueloP1, target.abueloM1, target.abueloM1,
            target.abueloP1, target.abueloP1, target.abueloM1, target.abueloM1
        ]);

        // Primos: comparten abuelos
        const primos = await promiseDb.all(`
            SELECT * FROM actas_nacimiento
            WHERE id != ?
            AND (
                (abueloP1 IN (?, ?) OR abuelaP2 IN (?, ?)) OR
                (abueloM1 IN (?, ?) OR abuelaM2 IN (?, ?))
            )
            LIMIT 20
        `, [
            target.id,
            target.abueloP1, target.abueloP1, target.abuelaP2, target.abuelaP2,
            target.abueloM1, target.abueloM1, target.abuelaM2, target.abuelaM2
        ]);

        res.json({
            target,
            hermanos,
            tios,
            primos
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// INICIAR SERVIDOR
// ========================================
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║  🏛️  REGISTRO CIVIL - MÉXICO            ║
║     Servidor corriendo en:              ║
║     http://localhost:${PORT}                ║
║  🚀 Optimizado para 3.6M+ registros    ║
╚════════════════════════════════════════╝
    `);
});
