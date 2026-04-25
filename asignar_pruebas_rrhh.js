/**
 * ASIGNAR PRUEBAS A EMPRESAS RRHH
 * Asigna todas las pruebas del banco superadmin a todas las empresas RRHH activas.
 * Uso: node asignar_pruebas_rrhh.js
 */

require('./backend/node_modules/dotenv').config({ path: './backend/.env' });
const { pool } = require('./backend/db');

async function main() {
  const client = await pool.connect();
  try {
    console.log('\n🚀 Asignando pruebas del banco a empresas RRHH...\n');

    // Obtener todas las pruebas del superadmin (empresa_rrhh_id IS NULL)
    const { rows: pruebas } = await client.query(`
      SELECT id, nombre, tipo FROM pruebas
      WHERE empresa_rrhh_id IS NULL AND activa = true
      ORDER BY nombre
    `);
    console.log(`📋 Pruebas en el banco: ${pruebas.length}`);

    // Obtener todas las empresas RRHH activas
    const { rows: empresas } = await client.query(`
      SELECT id, nombre FROM empresas_rrhh WHERE activo = true ORDER BY nombre
    `);
    console.log(`🏢 Empresas RRHH activas: ${empresas.length}\n`);

    if (!pruebas.length || !empresas.length) {
      console.log('⚠️  No hay pruebas o empresas para asignar.');
      return;
    }

    await client.query('BEGIN');

    let asignadas = 0;
    let yaExistian = 0;

    for (const empresa of empresas) {
      for (const prueba of pruebas) {
        // Verificar si ya existe la asignación
        const { rows: existe } = await client.query(
          'SELECT 1 FROM rrhh_pruebas WHERE empresa_rrhh_id=$1 AND prueba_id=$2',
          [empresa.id, prueba.id]
        );

        if (!existe.length) {
          await client.query(
            `INSERT INTO rrhh_pruebas (empresa_rrhh_id, prueba_id, habilitada)
             VALUES ($1, $2, true)`,
            [empresa.id, prueba.id]
          );
          asignadas++;
        } else {
          // Asegurarse de que esté habilitada
          await client.query(
            'UPDATE rrhh_pruebas SET habilitada=true WHERE empresa_rrhh_id=$1 AND prueba_id=$2',
            [empresa.id, prueba.id]
          );
          yaExistian++;
        }
      }
      console.log(`  ✅ ${empresa.nombre} — ${pruebas.length} pruebas asignadas`);
    }

    await client.query('COMMIT');

    console.log('\n════════════════════════════════');
    console.log(`✅ Proceso completado:`);
    console.log(`   Nuevas asignaciones: ${asignadas}`);
    console.log(`   Ya existían (actualizadas): ${yaExistian}`);
    console.log(`   Total empresas procesadas: ${empresas.length}`);
    console.log('════════════════════════════════\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    process.exit(0);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
