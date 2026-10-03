# 📋 Auditor y Comparador de Boletines

Herramienta de verificación de integridad y control de calidad para migración de boletines escolares (manuales vs generados automáticamente).

Permite auditar cientos de boletines PDF en segundos, comparando:
- **Calificaciones por criterio y generales** (1° a 4° bimestre).
- **Proyectos Pedagógicos Individuales (PPI)** y dispositivos de apoyo escolar.
- **Control de asistencia** (Asistencias, Inasistencias y Llegadas tarde por bimestre).
- **Observaciones de los docentes**.
- **Síntesis conceptual y condición de promoción**.

---

## 🚀 Inicio Rápido (Interfaz Web)

Para abrir la aplicación interactiva:

```bash
npm run dev
```

Abre tu navegador en `http://localhost:5173`.

### Funcionalidades de la Interfaz Web:
1. **Prueba rápida:** Haz clic en **"Cargar Muestras"** para probar la auditoría inmediatamente con los boletines de ejemplo.
2. **Carga masiva (Batch):** Arrastra una lista de PDFs manuales y los PDFs emitidos por la aplicación. El sistema los empareja automáticamente por **DNI** o nombre del alumno.
3. **Filtro de solo discrepancias:** Te lleva directo a los errores sin tener que revisar manualmente lo que ya está bien.
4. **Reglas de normalización configurables:** Botón de ajustes en la barra superior para definir equivalencias cosméticas (ej. `---` vs `-`, `NO` vs `No`, `0` como guión, etc.).
5. **Exportación:** Descarga reportes completos en formato CSV o JSON.

---

## 💻 Uso por Consola (CLI)

Para ejecutar una comparación directa desde la terminal:

```bash
# Comparación directa de las muestras:
npm run compare

# O especificando tus propios archivos:
npm run compare -- "ruta/al/manual.pdf" "ruta/al/app.pdf"
```

---

## 🏗️ Estructura del Proyecto

- `src/core/parser.ts`: Extractor espacial de texto y tablas a partir de PDFs mediante `pdfjs-dist`.
- `src/core/normalizer.ts`: Motor de equivalencias para ignorar diferencias cosméticas.
- `src/core/differ.ts`: Algoritmo de comparación campo a campo con clasificación por severidad.
- `src/core/batchMatcher.ts`: Emparejador masivo por DNI y nombre de estudiante.
- `src/components/`: Componentes React (DropZone, DiffDetail, StudentList, SummaryCards, ConfigModal).
- `scripts/compare-cli.mjs`: Utilidad standalone para ejecución por línea de comandos.
- `samples/`: Boletines reales de muestra para pruebas y calibración.
