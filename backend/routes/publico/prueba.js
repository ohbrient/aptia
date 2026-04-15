const router    = require('express').Router();
const db        = require('../../db');
const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');

// ── Función: enviar informe por email al RRHH ─────────────────
async function enviarInformeRRHH({ candidato, prueba_id, resultados, fullText }) {
  try {
    const { rows: [datos] } = await db.query(`
      SELECT u.email AS rrhh_email, u.nombre AS rrhh_nombre,
             e.nombre AS empresa_rrhh,
             p.nombre AS prueba_nombre,
             pr.nombre AS proceso_nombre, pr.puesto
      FROM candidatos c
      JOIN procesos pr ON pr.id = c.proceso_id
      JOIN empresas_cliente ec ON ec.id = pr.empresa_cliente_id
      JOIN empresas_rrhh e ON e.id = ec.empresa_rrhh_id
      JOIN usuarios_rrhh u ON u.empresa_rrhh_id = e.id AND u.rol = 'admin'
      LEFT JOIN pruebas p ON p.id = $2
      WHERE c.id = $1 LIMIT 1
    `, [candidato.id, prueba_id]);

    if (!datos?.rrhh_email) return;

    const DIM_COLORS = { O:'#7C3AED',C:'#059669',E:'#D97706',A:'#DC2626',N:'#7C3AED',D:'#F97316',I:'#2563EB',S:'#059669',default:'#2563EB' };

    const barras = (resultados||[]).map(r => {
      const color = DIM_COLORS[r.codigo]||DIM_COLORS.default;
      const pct   = parseFloat(r.puntaje_pct)||0;
      return `<div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span style="font-size:13px;font-weight:600;color:#334155">${r.dimension}</span>
          <span style="font-size:13px;font-weight:700;color:${color}">${pct}%</span>
        </div>
        <div style="height:8px;background:#F1F5F9;border-radius:100px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:100px"></div>
        </div>
      </div>`;
    }).join('');

    const informeHtml = fullText.split('\n\n').map(p => {
      if (p.startsWith('### ')) return `<h3 style="font-size:15px;font-weight:700;color:#0F172A;margin:20px 0 8px;border-left:3px solid #2563EB;padding-left:10px">${p.slice(4)}</h3>`;
      const html = p.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
      return html.trim()?`<p style="color:#475569;line-height:1.8;margin-bottom:12px">${html}</p>`:'';
    }).join('');

    const fecha = new Date().toLocaleDateString('es-DO',{year:'numeric',month:'long',day:'numeric'});

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#F8FAFC;margin:0;padding:0">
<div style="max-width:640px;margin:0 auto;padding:32px 16px">
  <div style="background:#2563EB;border-radius:16px 16px 0 0;padding:28px 32px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <div style="background:rgba(255,255,255,0.2);width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff">A</div>
      <span style="color:#fff;font-size:18px;font-weight:700">Aptia</span>
    </div>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0">Informe Psicométrico Automático · ${fecha}</p>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
    <div style="background:#F8FAFC;border-radius:12px;padding:20px 24px;margin-bottom:28px;border:1px solid #E2E8F0">
      <p style="font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;margin:0 0 6px">Candidato evaluado</p>
      <p style="font-size:20px;font-weight:700;color:#0F172A;margin:0 0 4px">${candidato.nombre} ${candidato.apellido||''}</p>
      <p style="font-size:13px;color:#64748B;margin:0">${candidato.email}</p>
      ${datos.proceso_nombre?`<p style="font-size:13px;color:#64748B;margin:6px 0 0">Proceso: <strong>${datos.proceso_nombre}</strong>${datos.puesto?` · ${datos.puesto}`:''}</p>`:''}
    </div>
    ${barras?`<div style="margin-bottom:28px">
      <h2 style="font-size:15px;font-weight:700;color:#0F172A;margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid #E2E8F0">Resultados por dimensión</h2>
      ${barras}</div>`:''}
    <div style="margin-bottom:28px">
      <h2 style="font-size:15px;font-weight:700;color:#0F172A;margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid #E2E8F0">Análisis psicológico — IA</h2>
      ${informeHtml}
    </div>
    <div style="border-top:1px solid #E2E8F0;padding-top:20px;text-align:center">
      <p style="font-size:11px;color:#94A3B8;margin:0">Generado automáticamente por Aptia · Confidencial</p>
    </div>
  </div>
</div>
</body></html>`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT||'587'),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Aptia" <${process.env.SMTP_USER}>`,
      to: datos.rrhh_email,
      subject: `📋 Informe: ${candidato.nombre} ${candidato.apellido||''} completó su evaluación`,
      html,
    });

    console.log(`[informe-email] Enviado a ${datos.rrhh_email}`);
  } catch(err) {
    console.error('[informe-email]', err.message);
  }
}

// ── GET /api/prueba/:token ────────────────────────────────────
// Carga la prueba del candidato por token
router.get('/:token', async (req, res) => {
  try {
    const { rows: [candidato] } = await db.query(
      `SELECT c.*, p.nombre AS proceso_nombre, p.puesto,
              ec.nombre AS empresa_nombre, ec.logo_url, ec.color_primario
       FROM candidatos c
       JOIN procesos p ON p.id = c.proceso_id
       JOIN empresas_cliente ec ON ec.id = p.empresa_cliente_id
       WHERE c.token_acceso = $1`,
      [req.params.token]
    );

    if (!candidato) return res.status(404).json({ error: 'Enlace inválido' });
    if (candidato.estado === 'completado') return res.status(410).json({ error: 'ya_completado', candidato });
    if (candidato.estado === 'expirado' || (candidato.fecha_vencimiento && new Date() > new Date(candidato.fecha_vencimiento))) {
      await db.query(`UPDATE candidatos SET estado='expirado' WHERE id=$1`, [candidato.id]);
      return res.status(410).json({ error: 'enlace_expirado' });
    }

    // Obtener pruebas del proceso con sus ítems y opciones
    const { rows: pruebas } = await db.query(`
      SELECT pr.*, pp.orden AS proceso_orden
      FROM proceso_pruebas pp
      JOIN pruebas pr ON pr.id = pp.prueba_id
      WHERE pp.proceso_id = $1 AND pr.activa = true
      ORDER BY pp.orden
    `, [candidato.proceso_id]);

    for (const prueba of pruebas) {
      const { rows: items } = await db.query(`
        SELECT i.id, i.texto, i.orden, i.dimension_id,
          json_agg(json_build_object('id', o.id, 'texto', o.texto, 'valor', o.valor, 'orden', o.orden)
            ORDER BY o.orden) AS opciones
        FROM items i
        LEFT JOIN opciones_item o ON o.item_id = i.id
        WHERE i.prueba_id = $1 AND i.activo = true
        GROUP BY i.id
        ORDER BY i.orden
      `, [prueba.id]);
      prueba.items = items;
    }

    res.json({ candidato, pruebas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar la evaluación' });
  }
});

// ── POST /api/prueba/:token/iniciar ──────────────────────────
router.post('/:token/iniciar', async (req, res) => {
  try {
    const { rows: [candidato] } = await db.query(
      'SELECT * FROM candidatos WHERE token_acceso=$1', [req.params.token]
    );
    if (!candidato) return res.status(404).json({ error: 'Token inválido' });
    if (candidato.estado === 'completado') return res.status(410).json({ error: 'ya_completado' });

    await db.query(
      `UPDATE candidatos SET estado='en_progreso', fecha_inicio=NOW(), ip_acceso=$1 WHERE id=$2`,
      [req.ip, candidato.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar evaluación' });
  }
});

// ── POST /api/prueba/:token/responder ─────────────────────────
// Guarda respuestas y calcula resultados
router.post('/:token/responder', async (req, res) => {
  const { prueba_id, respuestas } = req.body;
  // respuestas: [{ item_id, opcion_id, valor_numerico }]

  try {
    const { rows: [candidato] } = await db.query(
      'SELECT * FROM candidatos WHERE token_acceso=$1', [req.params.token]
    );
    if (!candidato) return res.status(404).json({ error: 'Token inválido' });

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Crear o recuperar sesión
      let sesion;
      const { rows: existing } = await client.query(
        'SELECT * FROM sesiones_prueba WHERE candidato_id=$1 AND prueba_id=$2',
        [candidato.id, prueba_id]
      );
      if (existing.length) {
        sesion = existing[0];
      } else {
        const { rows: [s] } = await client.query(
          `INSERT INTO sesiones_prueba (candidato_id, prueba_id) VALUES ($1,$2) RETURNING *`,
          [candidato.id, prueba_id]
        );
        sesion = s;
      }

      // Insertar respuestas
      for (const r of respuestas) {
        await client.query(
          `INSERT INTO respuestas (sesion_id, item_id, opcion_id, valor_numerico)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (sesion_id, item_id) DO UPDATE SET opcion_id=$3, valor_numerico=$4`,
          [sesion.id, r.item_id, r.opcion_id, r.valor_numerico]
        );
      }

      // Calcular puntajes por dimensión
      const { rows: dims } = await client.query(
        'SELECT * FROM dimensiones WHERE prueba_id=$1', [prueba_id]
      );

      // Detectar si es selección forzada (DISC)
      const { rows: [pruebaInfo] } = await client.query(
        'SELECT escala_tipo FROM pruebas WHERE id=$1', [prueba_id]
      );
      const esDisc     = pruebaInfo?.escala_tipo === 'seleccion_forzada';
      const esMultiple = pruebaInfo?.escala_tipo === 'multiple';

      const resultados = [];
      for (const dim of dims) {
        const { rows: [calc] } = await client.query(`
          SELECT
            SUM(r.valor_numerico) AS suma,
            AVG(r.valor_numerico) AS promedio,
            COUNT(*) AS total
          FROM respuestas r
          JOIN items i ON i.id = r.item_id
          WHERE r.sesion_id=$1 AND i.dimension_id=$2
        `, [sesion.id, dim.id]);

        if (calc.total > 0) {
          let pct;
          if (esDisc) {
            const suma = parseFloat(calc.suma) || 0;
            pct = Math.round(((suma + 28) / 56) * 100);
          } else if (esMultiple) {
            // Múltiple opción: promedio de 0 y 1 → % de correctas
            pct = Math.round(parseFloat(calc.promedio) * 100);
          } else {
            pct = Math.round(((parseFloat(calc.promedio) - 1) / 4) * 100);
          }
          pct = Math.max(0, Math.min(100, pct));
          const nivel = pct >= 80 ? 'muy_alto' : pct >= 60 ? 'alto' : pct >= 40 ? 'moderado' : pct >= 20 ? 'bajo' : 'muy_bajo';
          await client.query(
            `INSERT INTO resultados (sesion_id, dimension_id, puntaje_raw, puntaje_pct, nivel)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (sesion_id, dimension_id) DO UPDATE SET puntaje_raw=$3, puntaje_pct=$4, nivel=$5`,
            [sesion.id, dim.id, parseFloat(calc.promedio), pct, nivel]
          );
          resultados.push({ dimension: dim.nombre, codigo: dim.codigo, puntaje_pct: pct, nivel });
        }
      }

      // Marcar sesión como completada
      await client.query(
        `UPDATE sesiones_prueba SET estado='completada', completada_at=NOW() WHERE id=$1`, [sesion.id]
      );

      // Si todas las sesiones completadas → candidato completado
      const { rows: pendientes } = await client.query(`
        SELECT pp.prueba_id FROM proceso_pruebas pp
        LEFT JOIN sesiones_prueba sp ON sp.prueba_id=pp.prueba_id AND sp.candidato_id=$1 AND sp.estado='completada'
        WHERE pp.proceso_id=$2 AND sp.id IS NULL
      `, [candidato.id, candidato.proceso_id]);

      if (!pendientes.length) {
        await client.query(
          `UPDATE candidatos SET estado='completado', fecha_completado=NOW() WHERE id=$1`, [candidato.id]
        );
      }

      await client.query('COMMIT');
      res.json({ ok: true, resultados });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar respuestas' });
  }
});

// ── POST /api/prueba/:token/informe ──────────────────────────
// Genera informe IA con streaming
router.post('/:token/informe', async (req, res) => {
  const { prueba_id, resultados } = req.body;

  try {
    const { rows: [candidato] } = await db.query(
      'SELECT * FROM candidatos WHERE token_acceso=$1', [req.params.token]
    );
    if (!candidato) return res.status(404).json({ error: 'Token inválido' });

    // Verificar si ya existe informe
    const { rows: existente } = await db.query(
      'SELECT contenido_texto FROM informes WHERE candidato_id=$1 AND prueba_id=$2',
      [candidato.id, prueba_id]
    );
    if (existente.length) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.end(existente[0].contenido_texto);
    }

    const nivel = v => v >= 70 ? 'alta' : v >= 40 ? 'moderada' : 'baja';
    const resumenDims = resultados.map(r => `- ${r.dimension}: ${r.puntaje_pct}% (${nivel(r.puntaje_pct)})`).join('\n');

    const prompt = `Eres un psicólogo organizacional especialista en evaluaciones de personalidad para procesos de selección en empresas latinoamericanas.

Un candidato completó una prueba psicométrica. Sus resultados:
${resumenDims}

Redacta un informe profesional en español con estas secciones:

### Perfil General
(2-3 párrafos describiendo la personalidad integralmente)

### Fortalezas Laborales
(3-4 fortalezas concretas con explicación)

### Áreas de Desarrollo
(2-3 áreas con tacto y profesionalismo)

### Perfil de Rol Ideal
(Tipos de roles y entornos compatibles)

### Recomendación para RRHH
(Conclusión ejecutiva de 2-3 líneas)

Usa "el candidato". Interpreta cualitativamente, no menciones porcentajes.`;

    // Streaming hacia el cliente
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let fullText = '';

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    stream.on('text', (text) => {
      fullText += text;
      res.write(text);
    });

    stream.on('finalMessage', async () => {
      res.end();

      // Guardar informe para no regenerar
      await db.query(
        `INSERT INTO informes (candidato_id, prueba_id, contenido_texto)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [candidato.id, prueba_id, fullText]
      );

      // Enviar informe por email al RRHH automáticamente
      try {
        await enviarInformeRRHH({ candidato, prueba_id, resultados, fullText });
      } catch (emailErr) {
        console.error('[informe-email]', emailErr.message);
      }
    });

    stream.on('error', (err) => {
      console.error(err);
      res.end('\n\nError al generar el informe.');
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar informe' });
  }
});

module.exports = router;

// ── POST /api/prueba/:token/violacion ─────────────────────────
router.post('/:token/violacion', async (req, res) => {
  const { tipo, detalle } = req.body;
  try {
    const { rows: [candidato] } = await db.query(
      'SELECT * FROM candidatos WHERE token_acceso=$1', [req.params.token]
    );
    if (!candidato) return res.status(404).json({ error: 'Token inválido' });

    await db.query(
      `INSERT INTO audit_log (actor_tipo, actor_id, accion, detalle)
       VALUES ('candidato', $1, $2, $3)`,
      [candidato.id, `violacion_${tipo}`, JSON.stringify({ detalle, timestamp: new Date() })]
    );

    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ error: 'Error al registrar violación' });
  }
});

// ── GET /api/prueba/preview/:prueba_id ───────────────────────
// Vista previa para superadmin - no guarda datos
router.get('/preview/:prueba_id', async (req, res) => {
  try {
    const { rows: [prueba] } = await db.query(
      `SELECT p.*, 
        json_agg(
          json_build_object(
            'id', i.id, 'texto', i.texto, 'orden', i.orden,
            'dimension_id', i.dimension_id,
            'dimension_codigo', d.codigo,
            'tiempo_limite', p.tiempo_limite,
            'opciones', (
              SELECT json_agg(json_build_object('id',op.id,'texto',op.texto,'valor',op.valor,'orden',op.orden) ORDER BY op.orden)
              FROM opciones_item op WHERE op.item_id = i.id
            )
          ) ORDER BY i.orden
        ) FILTER (WHERE i.id IS NOT NULL) AS items
       FROM pruebas p
       LEFT JOIN items i ON i.prueba_id = p.id AND i.activo = true
       LEFT JOIN dimensiones d ON d.id = i.dimension_id
       WHERE p.id = $1
       GROUP BY p.id`,
      [req.params.prueba_id]
    );
    if (!prueba) return res.status(404).json({ error: 'Prueba no encontrada' });
    res.json({
      prueba: {
        id: prueba.id,
        nombre: prueba.nombre,
        escala_tipo: prueba.escala_tipo,
        tiempo_limite: prueba.tiempo_limite,
        instrucciones: prueba.instrucciones,
        pruebas: [{ ...prueba, escala_tipo: prueba.escala_tipo, items: prueba.items || [] }],
      },
      candidato: { nombre: 'Vista previa', apellido: '' },
      proceso_nombre: 'Modo preview',
      empresa_nombre: 'Aptia',
      preview: true,
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar preview' });
  }
});