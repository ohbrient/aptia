/**
 * SEED — BANCO DE PRUEBAS PSICOMÉTRICAS
 * Aptia Platform
 * 24 pruebas | ~500 items | ~1800 opciones
 *
 * Uso: node scripts/seed_banco_pruebas.js
 * (ejecutar desde la raíz del proyecto)
 */

const { v4: uuidv4 } = require('./backend/node_modules/uuid');
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });
const { pool } = require('./backend/db'); // pool del proyecto

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

async function insertPrueba(client, p) {
  const id = uuidv4();
  await client.query(`
    INSERT INTO pruebas (id, nombre, descripcion, tipo, instrucciones, tiempo_limite, total_items, escala_tipo, activa, empresa_rrhh_id, categoria)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NULL,$9)
  `, [id, p.nombre, p.descripcion, p.tipo, p.instrucciones, p.tiempo_limite ?? null, p.total_items, p.escala_tipo, p.categoria ?? p.tipo]);
  return id;
}

async function insertDim(client, pruebaId, d, orden) {
  const id = uuidv4();
  await client.query(`
    INSERT INTO dimensiones (id, prueba_id, nombre, codigo, descripcion, orden, interpretacion_alta, interpretacion_baja)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `, [id, pruebaId, d.nombre, d.codigo, d.descripcion ?? null, orden, d.alta ?? null, d.baja ?? null]);
  return id;
}

async function insertItem(client, pruebaId, dimensionId, texto, orden, invertido = false) {
  const id = uuidv4();
  await client.query(`
    INSERT INTO items (id, prueba_id, dimension_id, texto, orden, invertido, activo)
    VALUES ($1,$2,$3,$4,$5,$6,true)
  `, [id, pruebaId, dimensionId, texto, orden, invertido]);
  return id;
}

async function insertOpcion(client, itemId, texto, valor, orden) {
  await client.query(`
    INSERT INTO opciones_item (id, item_id, texto, valor, orden)
    VALUES ($1,$2,$3,$4,$5)
  `, [uuidv4(), itemId, texto, valor, orden]);
}

// Opciones Likert estándar 1-5
async function addLikert5(client, itemId) {
  const opts = [
    [1, 'Totalmente en desacuerdo', 1],
    [2, 'En desacuerdo', 2],
    [3, 'Ni de acuerdo ni en desacuerdo', 3],
    [4, 'De acuerdo', 4],
    [5, 'Totalmente de acuerdo', 5],
  ];
  for (const [o, t, v] of opts) await insertOpcion(client, itemId, t, v, o);
}

// Opciones Likert frecuencia 1-5
async function addLikertFrecuencia(client, itemId) {
  const opts = [
    [1, 'Nunca', 1],
    [2, 'Pocas veces', 2],
    [3, 'A veces', 3],
    [4, 'Frecuentemente', 4],
    [5, 'Siempre', 5],
  ];
  for (const [o, t, v] of opts) await insertOpcion(client, itemId, t, v, o);
}

// ─────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────

// ══════════════════════════════════════════════════════════
// 1. TMMS-24 — Inteligencia Emocional
// ══════════════════════════════════════════════════════════
async function seedTMMS(client) {
  console.log('  → TMMS-24...');
  const pid = await insertPrueba(client, {
    nombre: 'TMMS-24 — Inteligencia Emocional',
    descripcion: 'Evalúa la inteligencia emocional intrapersonal percibida a través de tres dimensiones: atención, claridad y reparación emocional.',
    tipo: 'inteligencia',
    instrucciones: 'A continuación encontrará algunas afirmaciones sobre sus emociones y sentimientos. Lea atentamente cada frase e indique el grado de acuerdo con cada una marcando del 1 (totalmente en desacuerdo) al 5 (totalmente de acuerdo).',
    tiempo_limite: 10,
    total_items: 24,
    escala_tipo: 'likert5',
    categoria: 'inteligencia',
  });

  const dims = [
    { nombre: 'Atención Emocional', codigo: 'ATE', alta: 'Excelente percepción emocional', baja: 'Baja atención a las propias emociones' },
    { nombre: 'Claridad de Sentimientos', codigo: 'CLA', alta: 'Alta comprensión de los estados emocionales', baja: 'Dificultad para identificar emociones' },
    { nombre: 'Regulación Emocional', codigo: 'REP', alta: 'Excelente capacidad de autorregulación', baja: 'Dificultad para manejar estados emocionales negativos' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    // Atención
    [1, 'Presto mucha atención a los sentimientos.', 'ATE'],
    [2, 'Normalmente me preocupo mucho por lo que siento.', 'ATE'],
    [3, 'Normalmente dedico tiempo a pensar en mis emociones.', 'ATE'],
    [4, 'Pienso que vale la pena prestar atención a mis emociones y estado de ánimo.', 'ATE'],
    [5, 'Dejo que mis sentimientos afecten a mis pensamientos.', 'ATE'],
    [6, 'Pienso en mi estado de ánimo constantemente.', 'ATE'],
    [7, 'A menudo pienso en mis sentimientos.', 'ATE'],
    [8, 'Presto mucha atención a cómo me siento.', 'ATE'],
    // Claridad
    [9, 'Tengo claros mis sentimientos.', 'CLA'],
    [10, 'Frecuentemente puedo definir mis sentimientos.', 'CLA'],
    [11, 'Casi siempre sé cómo me siento.', 'CLA'],
    [12, 'Normalmente conozco mis sentimientos sobre las personas.', 'CLA'],
    [13, 'A menudo me doy cuenta de mis sentimientos en diferentes situaciones.', 'CLA'],
    [14, 'Siempre puedo decir cómo me siento.', 'CLA'],
    [15, 'A veces puedo decir cuáles son mis emociones.', 'CLA'],
    [16, 'Puedo llegar a comprender mis sentimientos.', 'CLA'],
    // Regulación
    [17, 'Aunque a veces me siento triste, suelo tener una visión optimista.', 'REP'],
    [18, 'Aunque me sienta mal, procuro pensar en cosas agradables.', 'REP'],
    [19, 'Cuando estoy triste, pienso en todos los placeres de la vida.', 'REP'],
    [20, 'Intento tener pensamientos positivos aunque me sienta mal.', 'REP'],
    [21, 'Si doy demasiadas vueltas a las cosas, trato de calmarme.', 'REP'],
    [22, 'Me preocupo por tener un buen estado de ánimo.', 'REP'],
    [23, 'Tengo mucha energía cuando me siento feliz.', 'REP'],
    [24, 'Cuando estoy enfadado intento cambiar mi estado de ánimo.', 'REP'],
  ];
  for (const [orden, texto, dim] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden);
    await addLikert5(client, iid);
  }
}

// ══════════════════════════════════════════════════════════
// 2. BIG FIVE BFQ
// ══════════════════════════════════════════════════════════
async function seedBigFive(client) {
  console.log('  → Big Five BFQ...');
  const pid = await insertPrueba(client, {
    nombre: 'Big Five BFQ — Cuestionario de Personalidad',
    descripcion: 'Evaluación de los cinco grandes factores de personalidad: Energía, Afabilidad, Tesón, Estabilidad Emocional y Apertura Mental.',
    tipo: 'personalidad',
    instrucciones: 'Las siguientes afirmaciones describen distintas formas de comportarse. Lea cada una y marque en qué medida se aplica a usted del 1 (totalmente en desacuerdo) al 5 (totalmente de acuerdo). No hay respuestas correctas o incorrectas.',
    tiempo_limite: 40,
    total_items: 50,
    escala_tipo: 'likert5',
    categoria: 'personalidad',
  });

  const dims = [
    { nombre: 'Energía / Extraversión', codigo: 'E', alta: 'Persona muy activa, sociable y dominante', baja: 'Persona introvertida, reservada y tranquila' },
    { nombre: 'Afabilidad / Amabilidad', codigo: 'A', alta: 'Muy cooperativo, altruista y empático', baja: 'Tendencia a la hostilidad o desconfianza' },
    { nombre: 'Tesón / Conciencia', codigo: 'T', alta: 'Muy organizado, responsable y perseverante', baja: 'Tendencia a la desorganización e impulsividad' },
    { nombre: 'Estabilidad Emocional', codigo: 'ES', alta: 'Persona calmada, resiliente y segura', baja: 'Alta emotividad, ansiedad y vulnerabilidad al estrés' },
    { nombre: 'Apertura Mental', codigo: 'O', alta: 'Muy creativo, curioso e imaginativo', baja: 'Pensamiento convencional y poco curioso' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    // Energía
    [1,'Soy muy activo/a y lleno/a de energía.','E',false],
    [2,'Me gusta socializar con mucha gente.','E',false],
    [3,'Tomo la iniciativa fácilmente en situaciones sociales.','E',false],
    [4,'Me convierto rápidamente en el centro de atención en reuniones.','E',false],
    [5,'Soy conversador/a y expresivo/a.','E',false],
    [6,'Prefiero estar solo/a antes que rodeado/a de gente.','E',true],
    [7,'Soy una persona alegre y optimista.','E',false],
    [8,'Tiendo a imponerme y llevar el mando en grupos.','E',false],
    [9,'Me resulta fácil hacer amigos nuevos.','E',false],
    [10,'Prefiero observar antes que participar activamente.','E',true],
    // Afabilidad
    [11,'Me pongo fácilmente en el lugar de los demás.','A',false],
    [12,'Trato bien a todos, incluso a quienes no me tratan bien.','A',false],
    [13,'Estoy dispuesto/a a colaborar con los demás.','A',false],
    [14,'Me interesa el bienestar de quienes me rodean.','A',false],
    [15,'Tiendo a ser comprensivo/a con las debilidades ajenas.','A',false],
    [16,'Me involucro emocionalmente en los problemas de mis amigos.','A',false],
    [17,'Soy generoso/a con las personas de mi entorno.','A',false],
    [18,'Evito los conflictos con los demás siempre que puedo.','A',false],
    [19,'Desconfío fácilmente de las intenciones de los demás.','A',true],
    [20,'Soy respetuoso/a con opiniones que difieren de la mía.','A',false],
    // Tesón
    [21,'Llevo a cabo mis planes y decisiones con constancia.','T',false],
    [22,'Soy muy perseverante en el trabajo.','T',false],
    [23,'Me esfuerzo para conseguir mis objetivos.','T',false],
    [24,'Soy una persona muy organizada y metódica.','T',false],
    [25,'Termino siempre lo que empiezo.','T',false],
    [26,'Trabajo con esmero y dedicación.','T',false],
    [27,'Me tomo muy en serio mis responsabilidades.','T',false],
    [28,'Soy preciso/a y escrupuloso/a en mi trabajo.','T',false],
    [29,'Cumplo siempre con mis compromisos y obligaciones.','T',false],
    [30,'Prefiero planificar antes que improvisar.','T',false],
    // Estabilidad Emocional
    [31,'Me deprimo con facilidad.','ES',true],
    [32,'Me preocupo demasiado por cosas sin importancia.','ES',true],
    [33,'Soy una persona ansiosa.','ES',true],
    [34,'Me irrito con facilidad.','ES',true],
    [35,'Mis estados de humor cambian mucho.','ES',true],
    [36,'A menudo me siento tenso/a y angustiado/a.','ES',true],
    [37,'Me siento insatisfecho/a conmigo mismo/a frecuentemente.','ES',true],
    [38,'Soy una persona muy impulsiva.','ES',true],
    [39,'Mantengo la calma en situaciones de presión.','ES',false],
    [40,'Me recupero rápido de los contratiempos emocionales.','ES',false],
    // Apertura Mental
    [41,'Tengo mucha curiosidad intelectual.','O',false],
    [42,'Me gustan los retos intelectuales y los problemas complejos.','O',false],
    [43,'La belleza del arte me llega profundamente.','O',false],
    [44,'Me interesan las cuestiones filosóficas y culturales.','O',false],
    [45,'Tengo mucha imaginación y fantasía.','O',false],
    [46,'Soy una persona muy creativa.','O',false],
    [47,'Me gusta explorar ideas nuevas y no convencionales.','O',false],
    [48,'Me resulta fácil adaptarme a los cambios.','O',false],
    [49,'Prefiero lo rutinario y familiar a lo novedoso.','O',true],
    [50,'Me gusta profundizar en los temas que me interesan.','O',false],
  ];
  for (const [orden, texto, dim, inv] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden, inv);
    await addLikert5(client, iid);
  }
}

// ══════════════════════════════════════════════════════════
// 3. GORDON P-IPG — Inventario de Personalidad
// ══════════════════════════════════════════════════════════
async function seedGordon(client) {
  console.log('  → Gordon P-IPG...');
  const pid = await insertPrueba(client, {
    nombre: 'Gordon P-IPG — Inventario de Personalidad',
    descripcion: 'Evalúa 8 rasgos de personalidad y autoestima relacionados con la adaptación social y laboral.',
    tipo: 'personalidad',
    instrucciones: 'Lea cada afirmación e indique qué tan bien le describe en una escala del 1 (nada) al 5 (totalmente).',
    tiempo_limite: 25,
    total_items: 36,
    escala_tipo: 'likert5',
    categoria: 'personalidad',
  });

  const dims = [
    { nombre: 'Ascendencia', codigo: 'ASC', alta: 'Persona dominante y con iniciativa social', baja: 'Persona sumisa y reservada' },
    { nombre: 'Responsabilidad', codigo: 'RES', alta: 'Muy confiable, perseverante y organizado', baja: 'Tendencia a la irresponsabilidad' },
    { nombre: 'Estabilidad Emocional', codigo: 'EST', alta: 'Tranquilo, equilibrado y seguro', baja: 'Ansioso, tenso e inestable' },
    { nombre: 'Sociabilidad', codigo: 'SOC', alta: 'Muy sociable y disfruta del trato con personas', baja: 'Poco sociable, tímido' },
    { nombre: 'Cautela', codigo: 'CAU', alta: 'Reflexivo, prudente y meticuloso', baja: 'Impulsivo y poco reflexivo' },
    { nombre: 'Originalidad', codigo: 'ORI', alta: 'Muy creativo e intelectualmente curioso', baja: 'Pensamiento convencional' },
    { nombre: 'Relaciones Personales', codigo: 'REL', alta: 'Alta confianza en las personas, tolerante', baja: 'Desconfiado y poco tolerante' },
    { nombre: 'Vigor', codigo: 'VIG', alta: 'Enérgico, activo y de alta iniciativa', baja: 'Bajo nivel de energía y actividad' },
    { nombre: 'Autoestima', codigo: 'AUT', alta: 'Alta confianza y valoración personal positiva', baja: 'Baja autoestima e inseguridad' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    [1,'Me gusta asumir el mando en situaciones de grupo.','ASC',false],
    [2,'Defiendo mis opiniones con firmeza cuando creo tener razón.','ASC',false],
    [3,'Prefiero que otros tomen decisiones por mí.','ASC',true],
    [4,'Hablo con facilidad ante grupos de personas.','ASC',false],
    [5,'Termino lo que empiezo, sin importar los obstáculos.','RES',false],
    [6,'Cumplo mis compromisos aunque me resulte difícil.','RES',false],
    [7,'Tiendo a dejar las tareas a medias con frecuencia.','RES',true],
    [8,'Actúo con diligencia y responsabilidad en mis obligaciones.','RES',false],
    [9,'Rara vez me pongo nervioso/a o ansioso/a.','EST',false],
    [10,'Me siento emocionalmente estable la mayor parte del tiempo.','EST',false],
    [11,'Pequeños contratiempos me afectan mucho.','EST',true],
    [12,'Me recupero rápido cuando algo me frustra.','EST',false],
    [13,'Disfruto mucho estar rodeado/a de personas.','SOC',false],
    [14,'Me siento cómodo/a en reuniones sociales y fiestas.','SOC',false],
    [15,'Prefiero pasar el tiempo libre solo/a.','SOC',true],
    [16,'Hago amigos fácilmente.','SOC',false],
    [17,'Reflexiono bien antes de tomar decisiones importantes.','CAU',false],
    [18,'Evalúo los riesgos cuidadosamente antes de actuar.','CAU',false],
    [19,'Actúo impulsivamente sin pensar en las consecuencias.','CAU',true],
    [20,'Planifico mis acciones antes de ejecutarlas.','CAU',false],
    [21,'Me atraen los retos intelectuales y las nuevas ideas.','ORI',false],
    [22,'Soy una persona con ideas originales y creativas.','ORI',false],
    [23,'Prefiero seguir métodos probados antes que experimentar.','ORI',true],
    [24,'Disfruto resolver problemas de formas novedosas.','ORI',false],
    [25,'Confío en las buenas intenciones de las personas.','REL',false],
    [26,'Soy tolerante con los defectos de los demás.','REL',false],
    [27,'Desconfío fácilmente de las personas que no conozco.','REL',true],
    [28,'Mantengo relaciones armoniosas con las personas de mi entorno.','REL',false],
    [29,'Tengo mucha energía para hacer las cosas.','VIG',false],
    [30,'Me mantengo activo/a y dinámico/a durante todo el día.','VIG',false],
    [31,'Me siento cansado/a frecuentemente sin razón aparente.','VIG',true],
    [32,'Me entusiasmo fácilmente con nuevos proyectos.','VIG',false],
    [33,'Tengo una buena imagen de mí mismo/a.','AUT',false],
    [34,'Me siento satisfecho/a con lo que soy y he logrado.','AUT',false],
    [35,'A menudo dudo de mis propias capacidades.','AUT',true],
    [36,'Me siento seguro/a de mis decisiones y juicios.','AUT',false],
  ];
  for (const [orden, texto, dim, inv] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden, inv);
    await addLikert5(client, iid);
  }
}

// ══════════════════════════════════════════════════════════
// 4. ALLPORT — Estudio de Valores
// ══════════════════════════════════════════════════════════
async function seedAllport(client) {
  console.log('  → Allport Valores...');
  const pid = await insertPrueba(client, {
    nombre: 'Allport — Estudio de Valores',
    descripcion: 'Evalúa los valores morales que rigen la conducta del evaluado en seis áreas: teórico, económico, estético, social, político y religioso.',
    tipo: 'comportamiento',
    instrucciones: 'Lea cada afirmación e indique en qué medida refleja sus valores y creencias personales. No hay respuestas correctas ni incorrectas.',
    tiempo_limite: 30,
    total_items: 30,
    escala_tipo: 'likert5',
    categoria: 'comportamiento',
  });

  const dims = [
    { nombre: 'Teórico', codigo: 'TEO', alta: 'Fuerte orientación hacia el conocimiento y la verdad', baja: 'Poca motivación por el conocimiento abstracto' },
    { nombre: 'Económico', codigo: 'ECO', alta: 'Alta orientación al éxito material y productividad', baja: 'Poco interés por aspectos materiales' },
    { nombre: 'Estético', codigo: 'EST', alta: 'Alta sensibilidad artística y valoración de la belleza', baja: 'Poco interés por el arte y la belleza' },
    { nombre: 'Social', codigo: 'SOC', alta: 'Fuerte orientación altruista y de servicio a otros', baja: 'Poca motivación por el bienestar ajeno' },
    { nombre: 'Político', codigo: 'POL', alta: 'Alta motivación por el poder e influencia', baja: 'Poco interés por el poder o liderazgo' },
    { nombre: 'Religioso', codigo: 'REL', alta: 'Fuerte orientación espiritual y búsqueda de trascendencia', baja: 'Poca orientación espiritual o religiosa' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    [1,'Me apasiona buscar la verdad y el conocimiento aunque no tenga utilidad inmediata.','TEO',false],
    [2,'Prefiero conocer el porqué de las cosas antes que utilizarlas con fines prácticos.','TEO',false],
    [3,'Disfruto debates intelectuales donde se confrontan distintas teorías.','TEO',false],
    [4,'Me interesa más comprender los hechos que sacar beneficio de ellos.','TEO',false],
    [5,'Leo libros técnicos o científicos por placer, sin necesidad de que sean útiles.','TEO',false],
    [6,'Para mí, lo más importante en la vida es lograr estabilidad y éxito económico.','ECO',false],
    [7,'Evalúo las situaciones principalmente por su rentabilidad o beneficio práctico.','ECO',false],
    [8,'Considero que los recursos deben invertirse donde generen mayor rendimiento.','ECO',false],
    [9,'Me motiva principalmente el retorno económico al realizar una tarea.','ECO',false],
    [10,'Valoro las relaciones por el beneficio mutuo que aportan.','ECO',false],
    [11,'La belleza de una obra de arte puede emocionarme profundamente.','EST',false],
    [12,'Valoro la forma y la armonía estética en la vida cotidiana.','EST',false],
    [13,'Prefiero un entorno bello antes que uno meramente funcional.','EST',false],
    [14,'La experiencia artística es tan importante para mí como la intelectual.','EST',false],
    [15,'Me detengo a contemplar la belleza en la naturaleza o el arte frecuentemente.','EST',false],
    [16,'Me preocupa mucho el bienestar de los demás, incluso de personas que no conozco.','SOC',false],
    [17,'Prefiero ayudar a otros antes que buscar beneficio personal.','SOC',false],
    [18,'Siento satisfacción profunda cuando contribuyo al bienestar ajeno.','SOC',false],
    [19,'Me involucro activamente en causas sociales o comunitarias.','SOC',false],
    [20,'Disfruto de las relaciones humanas sin esperar nada a cambio.','SOC',false],
    [21,'Me gusta tener poder e influencia sobre las decisiones del grupo.','POL',false],
    [22,'Considero importante ocupar posiciones de liderazgo en cualquier organización.','POL',false],
    [23,'Me motiva la competencia y ganar en situaciones de rivalidad.','POL',false],
    [24,'Prefiero ser quien dirija y organice a otros que seguir instrucciones.','POL',false],
    [25,'Disfruto persuadir a los demás para que adopten mis puntos de vista.','POL',false],
    [26,'Las cuestiones espirituales son de gran importancia en mi vida diaria.','REL',false],
    [27,'Busco un significado trascendente en mis actividades cotidianas.','REL',false],
    [28,'Mi vida está guiada por principios espirituales o religiosos.','REL',false],
    [29,'La práctica religiosa o meditativa es parte fundamental de mi rutina.','REL',false],
    [30,'Encuentro paz interior a través de la fe o la espiritualidad.','REL',false],
  ];
  for (const [orden, texto, dim, inv] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden, inv ?? false);
    await addLikert5(client, iid);
  }
}

// ══════════════════════════════════════════════════════════
// 5. MOSS — Test de Adaptación Social (situacional)
// ══════════════════════════════════════════════════════════
async function seedMoss(client) {
  console.log('  → Moss Adaptación Social...');
  const pid = await insertPrueba(client, {
    nombre: 'Moss — Test de Adaptación Social',
    descripcion: 'Evalúa habilidades interpersonales y adaptabilidad social a través de situaciones laborales cotidianas.',
    tipo: 'comportamiento',
    instrucciones: 'A continuación se presentan situaciones laborales. Seleccione la opción que mejor describe cómo actuaría usted en cada caso.',
    tiempo_limite: 25,
    total_items: 20,
    escala_tipo: 'multiple',
    categoria: 'comportamiento',
  });

  const dims = [
    { nombre: 'Habilidad en Supervisión', codigo: 'SUP', alta: 'Excelente capacidad para supervisar y guiar equipos', baja: 'Dificultad para supervisar o dirigir personas' },
    { nombre: 'Capacidad de Decisión en RRHH', codigo: 'DEC', alta: 'Toma decisiones efectivas en situaciones humanas', baja: 'Dificultad para decidir en situaciones interpersonales' },
    { nombre: 'Evaluación de Problemas Interpersonales', codigo: 'EVA', alta: 'Alta capacidad para analizar y resolver conflictos', baja: 'Dificultad para evaluar situaciones conflictivas' },
    { nombre: 'Habilidad para Establecer Relaciones', codigo: 'REL', alta: 'Facilidad para crear vínculos positivos de trabajo', baja: 'Dificultad para relacionarse con compañeros' },
    { nombre: 'Sentido Común y Tacto', codigo: 'TAC', alta: 'Excelente juicio social y manejo diplomático', baja: 'Poco tacto en situaciones delicadas' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const situaciones = [
    // SUP
    [1,'Un empleado bajo su supervisión comete el mismo error repetidamente. ¿Qué hace?','SUP',[
      ['Ignorarlo y esperar que mejore solo',1],
      ['Llamarle la atención públicamente para que sirva de ejemplo',2],
      ['Hablar privadamente con él, explicar el error y buscar soluciones juntos',4],
      ['Reportarlo a RRHH sin hablar con él primero',3],
    ]],
    [2,'Dos miembros de su equipo tienen un conflicto que afecta la productividad. Usted:','SUP',[
      ['Los reúne por separado para escuchar cada versión y luego los reúne juntos',4],
      ['Ignora el conflicto esperando que se resuelva solo',1],
      ['Toma partido por quien considera que tiene razón',2],
      ['Los reporta a su jefe inmediato sin intervenir',3],
    ]],
    [3,'Un colaborador solicita un cambio de turno por razones personales urgentes. Usted:','SUP',[
      ['Lo rechaza automáticamente por política de empresa',1],
      ['Lo aprueba sin verificar el impacto en el equipo',2],
      ['Evalúa la situación, busca cubrir el turno y aprueba si es posible',4],
      ['Le dice que hable con RRHH sin darle ninguna respuesta',3],
    ]],
    [4,'Su equipo no logra cumplir una meta importante. Como supervisor, usted:','SUP',[
      ['Culpa a los miembros del equipo ante la gerencia',1],
      ['Analiza las causas con el equipo y replantea la estrategia',4],
      ['Asume solo toda la responsabilidad sin comunicarlo al equipo',2],
      ['Solicita extensión del plazo sin explorar soluciones internas',3],
    ]],
    // DEC
    [5,'Debe contratar a un candidato entre dos finalistas igualmente calificados. Usted:','DEC',[
      ['Elige al que le genera mejor impresión personal',2],
      ['Compara objetivamente las competencias versus el perfil del cargo',4],
      ['Deja la decisión al azar (por ejemplo, tirar una moneda)',1],
      ['Pide a alguien más que decida por usted',3],
    ]],
    [6,'Un empleado excelente solicita un aumento que la empresa no puede pagar actualmente. Usted:','DEC',[
      ['Le dice que no hay presupuesto y da por terminada la conversación',1],
      ['Le promete el aumento aunque no tenga autorización',2],
      ['Le explica la situación honestamente y le ofrece alternativas no salariales',4],
      ['Lo evita y espera que el empleado olvide el tema',3],
    ]],
    [7,'Un colaborador solicita un día libre en una semana de alta demanda. Usted:','DEC',[
      ['Niega la solicitud sin explicar el motivo',1],
      ['Aprueba la solicitud sin considerar las necesidades del negocio',2],
      ['Explica la situación, negocia otro día o encuentra una solución intermedia',4],
      ['Se molesta y cuestiona la lealtad del empleado',3],
    ]],
    [8,'Descubre que un empleado, sin mala intención, difundió información confidencial. Usted:','DEC',[
      ['Lo despide inmediatamente sin más investigación',1],
      ['Ignora el incidente para no crear conflictos',2],
      ['Investiga el alcance del daño, habla con él y aplica medidas proporcionadas',4],
      ['Lo regaña públicamente frente al equipo',3],
    ]],
    // EVA
    [9,'Nota tensión entre dos departamentos que afecta los resultados. Usted:','EVA',[
      ['Espera que la tensión disminuya sola con el tiempo',1],
      ['Convoca una reunión entre ambos equipos para identificar la causa raíz',4],
      ['Toma partido por el departamento que considera más importante',2],
      ['Reporta el problema a la dirección sin hacer nada por su cuenta',3],
    ]],
    [10,'Un cliente se queja de un empleado que en realidad siguió el protocolo correctamente. Usted:','EVA',[
      ['Le da la razón al cliente automáticamente sin investigar',1],
      ['Defiende al empleado sin escuchar la queja del cliente',2],
      ['Escucha al cliente, investiga la situación y responde con base en los hechos',4],
      ['Le pide al empleado que se disculpe aunque no haya cometido ningún error',3],
    ]],
    [11,'Un colaborador muestra síntomas de estrés laboral. Usted:','EVA',[
      ['Ignora los síntomas, el trabajo es responsabilidad de cada quien',1],
      ['Lo llama a su oficina y le pregunta qué ocurre de manera empática',4],
      ['Lo presiona más para que se "ponga las pilas"',2],
      ['Comenta la situación con otros colegas sin hablar primero con él',3],
    ]],
    [12,'Detecta que un miembro del equipo está desmotivado. ¿Qué hace?','EVA',[
      ['Lo ignora, la motivación es responsabilidad de cada empleado',1],
      ['Lo amenaza con medidas disciplinarias si no mejora su actitud',2],
      ['Conversa con él para identificar la causa y busca soluciones concretas',4],
      ['Lo reemplaza inmediatamente con alguien más motivado',3],
    ]],
    // REL
    [13,'Es su primer día en un nuevo equipo de trabajo. ¿Qué hace para integrarse?','REL',[
      ['Espera a que los demás se acerquen primero',2],
      ['Se presenta, muestra interés por las personas y observa la dinámica del equipo',4],
      ['Se concentra solo en sus tareas sin relacionarse con nadie',1],
      ['Intenta impresionar a todos contando sus logros inmediatamente',3],
    ]],
    [14,'Un colega nuevo parece aislado y no se ha integrado al equipo. Usted:','REL',[
      ['No interviene, ese es problema de él',1],
      ['Lo incluye en conversaciones, lo invita a actividades del equipo',4],
      ['Le comenta a otros sobre el problema del colega',2],
      ['Le dice directamente que su actitud aislada es un problema',3],
    ]],
    [15,'Debe trabajar estrechamente con alguien con quien tuvo un conflicto previo. Usted:','REL',[
      ['Evita toda interacción con esa persona lo más posible',1],
      ['Habla con él/ella para aclarar el pasado y establecer una relación profesional',4],
      ['Le cuenta a otros sobre el conflicto para ganarse su apoyo',2],
      ['Trabaja con él/ella pero de manera tensa y distante',3],
    ]],
    [16,'Llega a una reunión y nota que la mayoría del equipo está de mal humor. Usted:','REL',[
      ['Comienza la reunión sin hacer ningún comentario',2],
      ['Pregunta si hay algo que deba saber antes de comenzar',4],
      ['Se pone también de mal humor y la reunión se deteriora',1],
      ['Pospone la reunión sin dar explicaciones',3],
    ]],
    // TAC
    [17,'Debe darle retroalimentación negativa a un empleado sensible. Usted:','TAC',[
      ['Le dice directamente los errores sin ningún contexto positivo',2],
      ['Evita la conversación para no herir sus sentimientos',1],
      ['Estructura la conversación con puntos positivos, áreas de mejora y plan concreto',4],
      ['Le envía la retroalimentación por escrito para evitar la incomodidad',3],
    ]],
    [18,'Un empleado interrumpe una reunión importante con una pregunta trivial. Usted:','TAC',[
      ['Lo ignora completamente y continúa',1],
      ['Le responde brevemente y le pide que guarde las demás preguntas para después',4],
      ['Le llama la atención frente a todos por interrumpir',2],
      ['Para toda la reunión para responder detalladamente',3],
    ]],
    [19,'Debe comunicar malas noticias (despidos, recortes) al equipo. Usted:','TAC',[
      ['Envía un correo electrónico para evitar el cara a cara',1],
      ['Reúne al equipo, comunica con honestidad, empatía y espacio para preguntas',4],
      ['Pide a alguien más que dé la noticia para no involucrarse',2],
      ['Lo pospone indefinidamente esperando que las cosas mejoren',3],
    ]],
    [20,'Está en medio de una negociación tensa con un cliente molesto. Usted:','TAC',[
      ['Discute y defiende su posición sin ceder en nada',1],
      ['Cede en todo lo que el cliente pide para evitar el conflicto',2],
      ['Escucha activamente, valida la preocupación y busca una solución mutuamente aceptable',4],
      ['Termina la reunión y le pasa el problema a su jefe',3],
    ]],
  ];

  let orden = 1;
  for (const [, texto, dim, opciones] of situaciones) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden++);
    for (let o = 0; o < opciones.length; o++) {
      await insertOpcion(client, iid, opciones[o][0], opciones[o][1], o + 1);
    }
  }
}

// ══════════════════════════════════════════════════════════
// 6. ZAVIC — Valores e Intereses Laborales
// ══════════════════════════════════════════════════════════
async function seedZavic(client) {
  console.log('  → Zavic...');
  const pid = await insertPrueba(client, {
    nombre: 'Zavic — Valores e Intereses Laborales',
    descripcion: 'Evalúa valores (moral, legalidad, indiferencia, corrupción) e intereses laborales (económico, político, social, religioso) en contextos de trabajo.',
    tipo: 'comportamiento',
    instrucciones: 'Se presentan situaciones laborales. Seleccione la opción que mejor describe su forma de actuar o lo que priorizaría en cada caso.',
    tiempo_limite: 20,
    total_items: 24,
    escala_tipo: 'multiple',
    categoria: 'comportamiento',
  });

  const dims = [
    { nombre: 'Moral', codigo: 'MOR', alta: 'Alta orientación ética en el trabajo', baja: 'Baja orientación moral' },
    { nombre: 'Legalidad', codigo: 'LEG', alta: 'Fuerte respeto por las normas y leyes', baja: 'Tendencia a incumplir normas' },
    { nombre: 'Indiferencia', codigo: 'IND', alta: 'Pasividad ante situaciones que requieren acción', baja: 'Alta implicación en situaciones problemáticas' },
    { nombre: 'Corrupción', codigo: 'COR', alta: 'Tendencia a actuar de manera deshonesta o corrupta', baja: 'Sin tendencias corruptas' },
    { nombre: 'Interés Económico', codigo: 'IEC', alta: 'Alta motivación por beneficios económicos', baja: 'Poca orientación económica' },
    { nombre: 'Interés Político', codigo: 'IPO', alta: 'Alta motivación por influencia y poder', baja: 'Poco interés político' },
    { nombre: 'Interés Social', codigo: 'ISO', alta: 'Alta motivación por contribuir a la sociedad', baja: 'Poca orientación social' },
    { nombre: 'Interés Religioso', codigo: 'IRE', alta: 'Alta motivación espiritual en el trabajo', baja: 'Poca orientación espiritual' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  // Formato: situación con 4 opciones que representan MOR, LEG, IND, COR
  const valores = [
    [1,'Descubres que un compañero está falsificando reportes. ¿Qué haces?','MOR',[
      ['Lo reportas porque está mal aunque afecte tu relación con él (MOR)',4,'MOR'],
      ['Lo reportas porque viola las políticas de la empresa (LEG)',3,'LEG'],
      ['No intervienes para no meterte en problemas (IND)',2,'IND'],
      ['Le propones encubrirlo a cambio de un beneficio (COR)',1,'COR'],
    ]],
    [2,'Tu empresa tiene una norma que consideras innecesaria. ¿Qué haces?','LEG"',[
      ['La sigues porque crees en actuar con integridad siempre (MOR)',4,'MOR'],
      ['La sigues porque es la norma establecida (LEG)',3,'LEG'],
      ['La ignoras silenciosamente cuando te conviene (IND)',2,'IND'],
      ['La aprovechas para negociar excepciones personales (COR)',1,'COR'],
    ]],
    [3,'Tu supervisor te pide hacer algo que consideras éticamente cuestionable. Tú:','MOR',[
      ['Te niegas y explicas tus razones éticas (MOR)',4,'MOR'],
      ['Preguntas si es legal antes de hacerlo (LEG)',3,'LEG'],
      ['Lo haces sin cuestionar para evitar problemas (IND)',2,'IND'],
      ['Lo haces si obtienes algún beneficio personal a cambio (COR)',1,'COR'],
    ]],
    [4,'Encuentras un error en tu nómina que resultó en un pago excesivo a tu favor. Tú:','MOR',[
      ['Lo reportas de inmediato porque es lo correcto (MOR)',4,'MOR'],
      ['Lo reportas porque es obligación legal (LEG)',3,'LEG'],
      ['Esperas a ver si alguien lo nota (IND)',2,'IND'],
      ['Aprovechas el dinero extra sin decir nada (COR)',1,'COR'],
    ]],
    [5,'Un proveedor te ofrece un regalo personal a cambio de preferirlo en licitaciones. Tú:','COR',[
      ['Lo rechazas porque comprometería tu integridad (MOR)',4,'MOR'],
      ['Lo rechazas porque viola las políticas de la empresa (LEG)',3,'LEG'],
      ['Lo recibes pero no cambias tu decisión (piensas) (IND)',2,'IND'],
      ['Lo aceptas y le das preferencia en las compras (COR)',1,'COR'],
    ]],
    [6,'Tienes información privilegiada sobre un cambio que afectará el precio de acciones. Tú:','LEG',[
      ['No la usas porque sería deshonesto (MOR)',4,'MOR'],
      ['No la usas porque el uso de información privilegiada es ilegal (LEG)',3,'LEG'],
      ['No haces nada al respecto (IND)',2,'IND'],
      ['La aprovechas para obtener beneficios financieros (COR)',1,'COR'],
    ]],
  ];

  // Intereses
  const intereses = [
    [7,'Cuando eliges un trabajo, lo más importante para ti es:','IEC',[
      ['El salario y los beneficios económicos (IEC)',4,'IEC'],
      ['La posibilidad de ascender y tener más poder (IPO)',3,'IPO'],
      ['Contribuir positivamente a la sociedad (ISO)',3,'ISO'],
      ['Trabajar en una organización con valores espirituales (IRE)',2,'IRE'],
    ]],
    [8,'Lo que más te motiva en el trabajo diario es:','ISO',[
      ['Ganar más dinero (IEC)',3,'IEC'],
      ['Tener influencia sobre decisiones importantes (IPO)',3,'IPO'],
      ['Ayudar a otros y contribuir al bien común (ISO)',4,'ISO'],
      ['Trabajar en un ambiente de valores y fe (IRE)',2,'IRE'],
    ]],
    [9,'Si recibes un bono inesperado, ¿qué haces con él?','IEC',[
      ['Lo inviertes para hacer crecer tu patrimonio (IEC)',4,'IEC'],
      ['Lo donas a una causa social (ISO)',3,'ISO'],
      ['Lo usas para financiar actividades políticas o de liderazgo (IPO)',2,'IPO'],
      ['Lo destinas a tu comunidad religiosa o espiritual (IRE)',2,'IRE'],
    ]],
    [10,'Al evaluar el éxito profesional, lo mides principalmente por:','IPO',[
      ['Los ingresos y estabilidad financiera lograda (IEC)',3,'IEC'],
      ['El cargo y la influencia que has alcanzado (IPO)',4,'IPO'],
      ['El impacto positivo que has tenido en personas y comunidades (ISO)',3,'ISO'],
      ['Si tu trabajo ha sido coherente con tus principios espirituales (IRE)',2,'IRE'],
    ]],
    [11,'En un proyecto con múltiples objetivos, priorizarías:','ISO',[
      ['El que genere mayor retorno económico (IEC)',3,'IEC'],
      ['El que te dé más visibilidad y poder en la organización (IPO)',3,'IPO'],
      ['El que genere mayor beneficio social (ISO)',4,'ISO'],
      ['El que esté más alineado a valores espirituales (IRE)',2,'IRE'],
    ]],
    [12,'Tu objetivo de largo plazo en la vida profesional es:','IEC',[
      ['Lograr independencia financiera (IEC)',4,'IEC'],
      ['Convertirte en un líder con influencia en la sociedad (IPO)',3,'IPO'],
      ['Dejar un legado de impacto positivo en tu comunidad (ISO)',3,'ISO'],
      ['Vivir y trabajar conforme a tus principios espirituales (IRE)',2,'IRE'],
    ]],
  ];

  let orden = 1;
  for (const [, texto, , opciones] of [...valores, ...intereses]) {
    // Asociar al dim de la primera opción relevante
    const mainDim = opciones[0][2];
    const iid = await insertItem(client, pid, dimIds[mainDim] ?? dimIds['MOR'], texto, orden++);
    for (let o = 0; o < opciones.length; o++) {
      await insertOpcion(client, iid, opciones[o][0], opciones[o][1], o + 1);
    }
  }

  // Items Likert adicionales sobre valores
  const valorItems = [
    [13,'Creo que las personas deben actuar éticamente incluso cuando nadie las observa.','MOR'],
    [14,'Respeto las normas de la empresa aunque no esté de acuerdo con ellas.','LEG'],
    [15,'Ante una injusticia laboral, prefiero no involucrarse para evitar conflictos.','IND'],
    [16,'El éxito económico justifica ciertas acciones cuestionables.','COR'],
    [17,'Prefiero trabajos bien pagados aunque sean poco significativos socialmente.','IEC'],
    [18,'Me importa tener influencia en las decisiones que afectan a mi organización.','IPO'],
    [19,'Contribuir a proyectos de impacto social me genera mucha satisfacción.','ISO'],
    [20,'La espiritualidad es una guía importante para mis decisiones laborales.','IRE'],
    [21,'Informaría sobre una irregularidad aunque afecte mi posición en la empresa.','MOR'],
    [22,'Cumplir con las leyes y reglamentos es una responsabilidad ineludible.','LEG'],
    [23,'Prefiero no opinar en situaciones conflictivas aunque conozca la solución.','IND'],
    [24,'Aprovecharía una ventaja competitiva aunque no fuera completamente transparente.','COR'],
  ];

  for (const [, texto, dim] of valorItems) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden++);
    await addLikert5(client, iid);
  }
}

// ══════════════════════════════════════════════════════════
// 7. LÜSCHER — Test de los 8 Colores (adaptado digital)
// ══════════════════════════════════════════════════════════
async function seedLuscher(client) {
  console.log('  → Lüscher 8 colores...');
  const pid = await insertPrueba(client, {
    nombre: 'Lüscher — Test de los 8 Colores (Adaptado)',
    descripcion: 'Versión digital adaptada del test proyectivo de Lüscher. Evalúa el estado emocional y perfil psicológico a través de la preferencia por colores.',
    tipo: 'personalidad',
    instrucciones: 'Para cada color presentado, indica en qué medida lo encuentras agradable y lo preferirías en tu entorno habitual. No pienses demasiado, responde con tu primera impresión.',
    tiempo_limite: 10,
    total_items: 16,
    escala_tipo: 'likert5',
    categoria: 'personalidad',
  });

  const dims = [
    { nombre: 'Necesidad de Calma (Azul)', codigo: 'AZU', alta: 'Alta necesidad de tranquilidad y estabilidad', baja: 'Rechazo al sosiego, posible agitación interna' },
    { nombre: 'Afirmación Personal (Verde)', codigo: 'VER', alta: 'Fuerte voluntad y necesidad de autoafirmación', baja: 'Baja confianza y necesidad de reconocimiento' },
    { nombre: 'Vitalidad (Rojo)', codigo: 'ROJ', alta: 'Alta energía, impulso y vitalidad', baja: 'Baja energía, posible agotamiento' },
    { nombre: 'Espontaneidad (Amarillo)', codigo: 'AMA', alta: 'Optimismo, curiosidad y proyección hacia el futuro', baja: 'Pesimismo o cautela excesiva' },
    { nombre: 'Sensibilidad (Violeta)', codigo: 'VIO', alta: 'Alta sensibilidad, intuitivo y mágico', baja: 'Poca sensibilidad emocional' },
    { nombre: 'Necesidad de Comodidad (Marrón)', codigo: 'MAR', alta: 'Necesidad de seguridad física y confort', baja: 'Desapego de las necesidades físicas' },
    { nombre: 'Rechazo/Estrés (Negro)', codigo: 'NEG', alta: 'Alta frustración, protesta o renuncia', baja: 'Ausencia de conflicto o rechazo activo' },
    { nombre: 'Neutralidad (Gris)', codigo: 'GRI', alta: 'Alta necesidad de distancia y no compromiso', baja: 'Buena disposición a la implicación' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  // Vuelta 1 y Vuelta 2 (se aplica dos veces para obtener mayor confiabilidad)
  const colores = [
    ['AZU', 'Azul oscuro'],
    ['VER', 'Verde oscuro'],
    ['ROJ', 'Rojo-naranja'],
    ['AMA', 'Amarillo brillante'],
    ['VIO', 'Violeta'],
    ['MAR', 'Marrón'],
    ['NEG', 'Negro'],
    ['GRI', 'Gris neutro'],
  ];

  let orden = 1;
  for (let vuelta = 1; vuelta <= 2; vuelta++) {
    for (const [cod, nombreColor] of colores) {
      const texto = `[Vuelta ${vuelta}] ¿Qué tan agradable te resulta el color ${nombreColor}?`;
      const iid = await insertItem(client, pid, dimIds[cod], texto, orden++);
      await insertOpcion(client, iid, 'Muy desagradable', 1, 1);
      await insertOpcion(client, iid, 'Desagradable', 2, 2);
      await insertOpcion(client, iid, 'Indiferente', 3, 3);
      await insertOpcion(client, iid, 'Agradable', 4, 4);
      await insertOpcion(client, iid, 'Muy agradable', 5, 5);
    }
  }
}

// ══════════════════════════════════════════════════════════
// 8. KOSTICK — Inventario de Percepción y Preferencias
// ══════════════════════════════════════════════════════════
async function seedKostick(client) {
  console.log('  → Kostick...');
  const pid = await insertPrueba(client, {
    nombre: 'Kostick — Inventario de Percepción y Preferencias',
    descripcion: 'Evalúa el comportamiento, capacidades de trabajo y estilos administrativos a través de 20 dimensiones organizadas en 7 factores.',
    tipo: 'comportamiento',
    instrucciones: 'En cada par de afirmaciones, seleccione la que mejor lo describe a usted en su ambiente de trabajo.',
    tiempo_limite: 30,
    total_items: 40,
    escala_tipo: 'seleccion_forzada',
    categoria: 'comportamiento',
  });

  const dims = [
    { nombre: 'Grado de Energía', codigo: 'GEN', alta: 'Alta actividad, dinámico e incansable', baja: 'Ritmo de trabajo más moderado' },
    { nombre: 'Liderazgo', codigo: 'LID', alta: 'Fuerte capacidad de influir y dirigir', baja: 'Preferencia por seguir antes que liderar' },
    { nombre: 'Modo de Vida', codigo: 'MVD', alta: 'Orientado al cambio y la innovación', baja: 'Preferencia por la estabilidad y rutina' },
    { nombre: 'Naturaleza Social', codigo: 'NSO', alta: 'Muy sociable y orientado a las personas', baja: 'Más orientado a tareas que a personas' },
    { nombre: 'Adaptación al Trabajo', codigo: 'ATR', alta: 'Alta orientación al logro y los resultados', baja: 'Orientación más relajada hacia metas' },
    { nombre: 'Naturaleza Emocional', codigo: 'NEM', alta: 'Emocionalmente sensible y expresivo', baja: 'Emocionalmente controlado y reservado' },
    { nombre: 'Subordinación', codigo: 'SUB', alta: 'Alta necesidad de estructura y normas', baja: 'Preferencia por la autonomía' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const pares = [
    // Grado de Energía
    [1,'A) Me gusta tener muchos proyectos activos al mismo tiempo.',['GEN','LID'],4,2],
    [2,'A) Trabajo mejor cuando el ritmo es intenso y hay presión de tiempo.',['GEN','ATR'],4,2],
    [3,'A) Busco siempre nuevas tareas cuando termino las actuales.',['GEN','MVD'],4,2],
    [4,'A) Me resulta fácil sostener un alto nivel de actividad por largos períodos.',['GEN','NEM'],4,2],
    [5,'A) Prefiero trabajar en pocos proyectos pero de forma intensa.',['GEN','SUB'],3,3],
    // Liderazgo
    [6,'A) Me gusta dirigir y organizar el trabajo de otros.',['LID','NSO'],4,2],
    [7,'A) Tomo decisiones con confianza incluso en situaciones ambiguas.',['LID','ATR'],4,2],
    [8,'A) Prefiero que alguien más tome las decisiones del grupo.',['SUB','LID'],4,1],
    [9,'A) Me resulta natural asumir la responsabilidad de un equipo.',['LID','GEN'],4,2],
    [10,'A) Me siento cómodo delegando tareas importantes a otros.',['LID','NEM'],3,3],
    // Modo de Vida
    [11,'A) Disfruto explorar nuevas formas de hacer el trabajo.',['MVD','ATR'],4,2],
    [12,'A) Prefiero los métodos probados antes que experimentar.',['SUB','MVD'],4,1],
    [13,'A) Me adapto fácilmente cuando cambian las reglas del juego.',['MVD','NEM'],4,2],
    [14,'A) Me incomoda cuando los procesos cambian constantemente.',['SUB','MVD'],3,2],
    [15,'A) Busco activamente maneras de mejorar los procedimientos existentes.',['MVD','LID'],4,2],
    // Naturaleza Social
    [16,'A) Prefiero trabajar en equipo que de forma independiente.',['NSO','GEN'],4,2],
    [17,'A) Me energiza el contacto frecuente con otras personas.',['NSO','NEM'],4,2],
    [18,'A) Prefiero trabajar con datos y sistemas que con personas.',['ATR','NSO'],4,1],
    [19,'A) Construyo relaciones laborales fácil y rápidamente.',['NSO','LID'],4,2],
    [20,'A) Me resulta fácil mantener redes de contactos profesionales.',['NSO','MVD'],4,2],
    // Adaptación al Trabajo
    [21,'A) Me oriento siempre hacia los resultados y las metas.',['ATR','GEN'],4,2],
    [22,'A) Establezco altos estándares para mi propio desempeño.',['ATR','LID'],4,2],
    [23,'A) Me siento insatisfecho/a cuando no alcanzo mis objetivos.',['ATR','NEM'],4,3],
    [24,'A) Planifico cuidadosamente antes de actuar.',['ATR','SUB'],4,3],
    [25,'A) Soy muy persistente cuando enfrento obstáculos en mis metas.',['ATR','GEN'],4,2],
    // Naturaleza Emocional
    [26,'A) Expreso mis emociones con facilidad.',['NEM','NSO'],4,2],
    [27,'A) Me afectan emocionalmente las críticas que recibo.',['NEM','ATR'],4,2],
    [28,'A) Controlo bien mis emociones incluso bajo presión.',['SUB','NEM'],4,1],
    [29,'A) Me entusiasmo fácilmente con nuevos proyectos.',['NEM','MVD'],4,2],
    [30,'A) Me cuesta trabajo mantener la calma en situaciones de conflicto.',['NEM','LID'],4,1],
    // Subordinación
    [31,'A) Sigo las instrucciones y políticas de la empresa fielmente.',['SUB','LID'],4,2],
    [32,'A) Prefiero ambientes donde las reglas estén bien definidas.',['SUB','ATR'],4,2],
    [33,'A) Me resulta difícil trabajar sin una estructura clara.',['SUB','GEN'],4,2],
    [34,'A) Respeto la jerarquía organizacional incluso cuando no estoy de acuerdo.',['SUB','LID'],4,2],
    [35,'A) Prefiero tener libertad para decidir cómo hacer mi trabajo.',['MVD','SUB'],4,1],
    // Mixtos finales
    [36,'A) El reconocimiento público de mis logros es importante para mí.',['NEM','LID'],4,2],
    [37,'A) Me cuesta manejar múltiples interrupciones durante el día.',['GEN','SUB'],3,3],
    [38,'A) Prefiero aprender haciendo antes que leyendo o estudiando.',['MVD','ATR'],4,3],
    [39,'A) Me siento a gusto tomando decisiones con información incompleta.',['LID','SUB'],4,2],
    [40,'A) Me importa más el proceso que el resultado final.',['SUB','ATR'],3,2],
  ];

  let orden = 1;
  for (const [, texto, dims2, valA, valB] of pares) {
    const dimPrincipal = dimIds[dims2[0]] ?? dimIds['GEN'];
    const iid = await insertItem(client, pid, dimPrincipal, texto, orden++);
    await insertOpcion(client, iid, 'Opción A — me describe más', valA, 1);
    await insertOpcion(client, iid, 'Opción B — me describe más', valB, 2);
  }
}

// ══════════════════════════════════════════════════════════
// 9. LIFO — Life and Orientation
// ══════════════════════════════════════════════════════════
async function seedLifo(client) {
  console.log('  → LIFO...');
  const pid = await insertPrueba(client, {
    nombre: 'LIFO — Life and Orientation',
    descripcion: 'Evalúa el estilo de trabajo y liderazgo del candidato en situaciones normales y de estrés, identificando el estilo predominante.',
    tipo: 'comportamiento',
    instrucciones: 'En cada situación, distribuya 4 puntos entre las 4 opciones (A, B, C, D) según cuánto lo representa cada una. Puede distribuirlos como 4-0-0-0, 3-1-0-0, 2-1-1-0, 2-2-0-0 o 1-1-1-1.',
    tiempo_limite: 25,
    total_items: 18,
    escala_tipo: 'seleccion_forzada',
    categoria: 'comportamiento',
  });

  const dims = [
    { nombre: 'Da/Apoya (DA)', codigo: 'DA', alta: 'Orientado a las personas, altruista y colaborador', baja: 'Poca orientación de apoyo y servicio' },
    { nombre: 'Toma/Controla (TC)', codigo: 'TC', alta: 'Orientado a los resultados, directivo y competitivo', baja: 'Poca orientación al control y resultados' },
    { nombre: 'Mantiene/Conserva (MC)', codigo: 'MC', alta: 'Orientado a la estabilidad, analítico y cauteloso', baja: 'Poca orientación a la conservación y análisis' },
    { nombre: 'Adapta/Negocia (AN)', codigo: 'AN', alta: 'Flexible, diplomático y orientado al acuerdo', baja: 'Poca orientación a la negociación' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const scenarios = [
    [1,'Cuando trabajo en equipo, usualmente...','DA',[
      ['A) Me aseguro de que todos se sientan incluidos y valorados',4,'DA'],
      ['B) Establezco los objetivos y empujo al equipo hacia los resultados',4,'TC'],
      ['C) Analizo cuidadosamente antes de actuar y busco el consenso',4,'MC'],
      ['D) Ajusto mi rol según lo que el equipo necesite en cada momento',4,'AN'],
    ]],
    [2,'Ante un conflicto en el equipo, tiendo a...','AN',[
      ['A) Mediar y asegurarme de que todos sean escuchados',4,'DA'],
      ['B) Confrontar el problema directamente y buscar resolución rápida',4,'TC'],
      ['C) Analizar las causas antes de proponer soluciones',4,'MC'],
      ['D) Buscar el compromiso que satisfaga a todas las partes',4,'AN'],
    ]],
    [3,'Cuando debo tomar una decisión importante, prefiero...','MC',[
      ['A) Consultar con los afectados antes de decidir',4,'DA'],
      ['B) Tomar la decisión con confianza y rapidez',4,'TC'],
      ['C) Recopilar toda la información posible antes de actuar',4,'MC'],
      ['D) Evaluar múltiples opciones y negociar la mejor salida',4,'AN'],
    ]],
    [4,'Mi mayor fortaleza como líder es...','TC',[
      ['A) Inspirar y motivar a las personas con empatía',4,'DA'],
      ['B) Generar resultados concretos y superar obstáculos',4,'TC'],
      ['C) Garantizar que todo se haga de manera sistemática y ordenada',4,'MC'],
      ['D) Adaptar mi estilo según las personas y situaciones',4,'AN'],
    ]],
    [5,'Cuando hay presión de tiempo, yo...','TC',[
      ['A) Me aseguro de apoyar emocionalmente al equipo aunque tome más tiempo',4,'DA'],
      ['B) Focalizo toda la energía en el resultado sin distracciones',4,'TC'],
      ['C) Mantengo la calma, evalúo prioridades y actúo metódicamente',4,'MC'],
      ['D) Ajusto expectativas y negocio plazos realistas',4,'AN'],
    ]],
    [6,'Las personas que trabajan conmigo me describirían como...','DA',[
      ['A) Generoso/a, considerado/a y siempre dispuesto a ayudar',4,'DA'],
      ['B) Decidido/a, orientado/a al logro y competitivo/a',4,'TC'],
      ['C) Cuidadoso/a, meticuloso/a y confiable',4,'MC'],
      ['D) Flexible, diplomático/a y buen negociador/a',4,'AN'],
    ]],
    [7,'Al planificar un proyecto, lo que más valoro es...','MC',[
      ['A) Que el equipo esté comprometido y motivado',4,'DA'],
      ['B) Que los resultados sean claros y medibles',4,'TC'],
      ['C) Que los procesos sean sólidos y los riesgos estén controlados',4,'MC'],
      ['D) Que haya flexibilidad para adaptarse a los cambios',4,'AN'],
    ]],
    [8,'Cuando recibo críticas o retroalimentación negativa...','DA',[
      ['A) Me preocupa el impacto emocional que pudo haber tenido en mí',4,'DA'],
      ['B) La proceso rápidamente y paso a la acción correctiva',4,'TC'],
      ['C) La analizo detalladamente para entender qué salió mal',4,'MC'],
      ['D) La uso para ajustar mi enfoque y mejorar mis relaciones',4,'AN'],
    ]],
    [9,'En situaciones de estrés elevado, tiendo a...','TC',[
      ['A) Enfocarme en apoyar al equipo aunque descuide resultados',4,'DA'],
      ['B) Volverme más directivo y asumir más control',4,'TC'],
      ['C) Retraerme, analizar más y actuar con mayor cautela',4,'MC'],
      ['D) Buscar acuerdos rápidos para reducir la tensión',4,'AN'],
    ]],
    [10,'Mi mayor área de mejora como líder es...','AN',[
      ['A) Ser más firme cuando necesito decir que no',4,'DA'],
      ['B) Escuchar más antes de actuar',4,'TC'],
      ['C) Ser más ágil en mis decisiones',4,'MC'],
      ['D) Mantener una posición firme en lugar de siempre ceder',4,'AN'],
    ]],
  ];

  let orden = 1;
  for (const [, texto, , opciones] of scenarios) {
    const iid = await insertItem(client, pid, dimIds[opciones[0][2]], texto, orden++);
    for (let o = 0; o < opciones.length; o++) {
      await insertOpcion(client, iid, opciones[o][0], opciones[o][1], o + 1);
    }
  }

  // Items Likert complementarios
  const likertItems = [
    ['Prefiero trabajar para el bienestar del equipo antes que para el reconocimiento personal.','DA'],
    ['Me siento cómodo/a tomando decisiones difíciles que otros evitarían.','TC'],
    ['Analizo los problemas en profundidad antes de proponer soluciones.','MC'],
    ['Ajusto fácilmente mi estilo de comunicación según el interlocutor.','AN'],
    ['Me incomoda la competencia directa con mis compañeros.','DA'],
    ['Prefiero la acción sobre la planificación excesiva.','TC'],
    ['Valoro la precisión y la calidad por encima de la velocidad.','MC'],
    ['Encuentro soluciones que satisfacen a todas las partes en conflictos.','AN'],
  ];
  for (const [texto, dim] of likertItems) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden++);
    await addLikert5(client, iid);
  }
}

// ══════════════════════════════════════════════════════════
// 10. COMPEGENERAL — Competencias Generales
// ══════════════════════════════════════════════════════════
async function seedCompeGeneral(client) {
  console.log('  → COMPEGENERAL...');
  const pid = await insertPrueba(client, {
    nombre: 'COMPEGENERAL — Competencias Generales',
    descripcion: 'Evaluación de competencias cardinales para puestos operativos, administrativos y jefaturas medias.',
    tipo: 'competencias',
    instrucciones: 'Evalúe qué tan frecuentemente tiene los comportamientos descritos en su trabajo habitual.',
    tiempo_limite: 15,
    total_items: 20,
    escala_tipo: 'likert5',
    categoria: 'competencias',
  });

  const dims = [
    { nombre: 'Compromiso', codigo: 'COM', alta: 'Alto sentido de pertenencia y lealtad organizacional', baja: 'Bajo compromiso con la organización' },
    { nombre: 'Flexibilidad y Adaptación', codigo: 'FLE', alta: 'Alta adaptabilidad al cambio', baja: 'Resistencia al cambio' },
    { nombre: 'Iniciativa', codigo: 'INI', alta: 'Proactivo, anticipa necesidades y actúa sin esperar indicaciones', baja: 'Reactivo, espera instrucciones' },
    { nombre: 'Integridad', codigo: 'INT', alta: 'Actúa con honestidad y coherencia ética', baja: 'Comportamiento ético inconsistente' },
    { nombre: 'Responsabilidad Personal', codigo: 'RSP', alta: 'Asume consecuencias de sus acciones y cumple sus compromisos', baja: 'Evade responsabilidades' },
    { nombre: 'Temple', codigo: 'TEM', alta: 'Mantiene calma y efectividad bajo presión', baja: 'Se altera bajo presión' },
    { nombre: 'Perseverancia en el Logro', codigo: 'PER', alta: 'Persistente ante obstáculos, orientado a resultados', baja: 'Se rinde fácilmente' },
    { nombre: 'Comunicación Eficaz', codigo: 'CMU', alta: 'Transmite ideas con claridad y escucha activamente', baja: 'Dificultad para comunicarse efectivamente' },
    { nombre: 'Trabajo en Equipo', codigo: 'TEQ', alta: 'Colabora efectivamente y aporta al logro colectivo', baja: 'Prefiere trabajar de manera individual' },
    { nombre: 'Liderazgo', codigo: 'LID', alta: 'Influye positivamente y conduce equipos hacia objetivos', baja: 'Poca capacidad de influencia en el equipo' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    [1,'Cumplo con mis obligaciones laborales aunque la situación sea difícil.','COM'],
    [2,'Me adapto sin dificultad cuando cambian las tareas o prioridades.','FLE'],
    [3,'Propongo soluciones o mejoras antes de que me lo soliciten.','INI'],
    [4,'Actúo de manera honesta incluso cuando nadie me observa.','INT'],
    [5,'Asumo la responsabilidad de mis errores sin buscar excusas.','RSP'],
    [6,'Mantengo la calma y el rendimiento en situaciones de alta presión.','TEM'],
    [7,'Sigo trabajando hacia mis metas aunque encuentre obstáculos.','PER'],
    [8,'Me expreso con claridad y verifico que mi mensaje fue comprendido.','CMU'],
    [9,'Colaboro con mis compañeros para alcanzar los objetivos del equipo.','TEQ'],
    [10,'Motivo e influyo positivamente en las personas de mi entorno laboral.','LID'],
    [11,'Muestro lealtad hacia la organización en situaciones difíciles.','COM'],
    [12,'Acepto los cambios organizacionales con actitud positiva.','FLE'],
    [13,'Identifico oportunidades de mejora y actúo sobre ellas sin que me lo pidan.','INI'],
    [14,'Mantengo mis principios éticos incluso cuando podría obtener ventajas actuando diferente.','INT'],
    [15,'Entrego resultados en los plazos acordados consistentemente.','RSP'],
    [16,'Tomo decisiones efectivas bajo condiciones de estrés o incertidumbre.','TEM'],
    [17,'No abandono un objetivo aunque requiera más esfuerzo del esperado.','PER'],
    [18,'Escucho activamente antes de responder o dar instrucciones.','CMU'],
    [19,'Comparto información y recursos útiles con mi equipo voluntariamente.','TEQ'],
    [20,'Guío a mis compañeros cuando hay confusión sobre los objetivos del equipo.','LID'],
  ];
  for (const [orden, texto, dim] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden);
    await addLikertFrecuencia(client, iid);
  }
}

// ══════════════════════════════════════════════════════════
// 11. COMPEAVANZADO — Competencias Nivel Gerencial
// ══════════════════════════════════════════════════════════
async function seedCompeAvanzado(client) {
  console.log('  → COMPEAVANZADO...');
  const pid = await insertPrueba(client, {
    nombre: 'COMPEAVANZADO — Competencias Nivel Gerencial',
    descripcion: 'Evaluación de competencias para jefes de área, gerentes y directores.',
    tipo: 'competencias',
    instrucciones: 'Evalúe qué tan frecuentemente presenta los comportamientos descritos en su rol de liderazgo.',
    tiempo_limite: 30,
    total_items: 20,
    escala_tipo: 'likert5',
    categoria: 'competencias',
  });

  const dims = [
    { nombre: 'Compromiso Estratégico', codigo: 'CES', alta: 'Alto alineamiento con la visión y estrategia organizacional', baja: 'Bajo compromiso con la estrategia' },
    { nombre: 'Flexibilidad Estratégica', codigo: 'FES', alta: 'Alta adaptación de estrategias ante cambios del entorno', baja: 'Rigidez estratégica' },
    { nombre: 'Iniciativa Estratégica', codigo: 'IES', alta: 'Genera innovación y anticipa necesidades del negocio', baja: 'Poca iniciativa estratégica' },
    { nombre: 'Integridad Directiva', codigo: 'IND', alta: 'Modelo de ética e integridad para su equipo', baja: 'Comportamiento ético inconsistente como líder' },
    { nombre: 'Responsabilidad Ejecutiva', codigo: 'REJ', alta: 'Asume responsabilidad de resultados del equipo y organización', baja: 'Evade responsabilidades ejecutivas' },
    { nombre: 'Temple Directivo', codigo: 'TDI', alta: 'Mantiene visión clara en situaciones de crisis', baja: 'Se desestabiliza bajo presión ejecutiva' },
    { nombre: 'Perseverancia Gerencial', codigo: 'PGE', alta: 'Mantiene dirección estratégica ante obstáculos', baja: 'Abandona metas ante dificultades' },
    { nombre: 'Comunicación Ejecutiva', codigo: 'CEX', alta: 'Comunica visión y estrategia con claridad e impacto', baja: 'Comunicación ejecutiva deficiente' },
    { nombre: 'Gestión de Equipos', codigo: 'GEQ', alta: 'Desarrolla, motiva y retiene talento efectivamente', baja: 'Poca capacidad para gestionar equipos' },
    { nombre: 'Liderazgo Estratégico', codigo: 'LES', alta: 'Inspira y conduce equipos hacia la visión organizacional', baja: 'Liderazgo poco inspirador o estratégico' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    [1,'Alinea las decisiones de su área con la estrategia y visión de la organización.','CES'],
    [2,'Ajusta la estrategia del equipo cuando el entorno del negocio cambia.','FES'],
    [3,'Propone iniciativas que generan ventajas competitivas para la organización.','IES'],
    [4,'Es un modelo de conducta ética para su equipo y pares.','IND'],
    [5,'Asume responsabilidad de los resultados de su equipo ante la alta dirección.','REJ'],
    [6,'Mantiene claridad de dirección y toma decisiones efectivas durante crisis.','TDI'],
    [7,'Sostiene el rumbo estratégico del área aunque enfrente resistencia interna.','PGE'],
    [8,'Comunica la visión y los objetivos estratégicos de forma inspiradora.','CEX'],
    [9,'Desarrolla el talento de su equipo con planes de crecimiento individualizados.','GEQ'],
    [10,'Genera un entorno que motiva a su equipo a superar los objetivos planteados.','LES'],
    [11,'Traduce la visión organizacional en objetivos concretos para su equipo.','CES'],
    [12,'Incorpora aprendizajes del mercado para replantear procesos y estrategias.','FES'],
    [13,'Identifica oportunidades de negocio o mejora antes que sus pares.','IES'],
    [14,'Toma decisiones éticas incluso cuando implican costos para el área.','IND'],
    [15,'Da la cara ante problemas del equipo en lugar de delegar la responsabilidad.','REJ'],
    [16,'Transmite calma y seguridad al equipo en momentos de alta incertidumbre.','TDI'],
    [17,'Mantiene el foco en los objetivos estratégicos ante presiones del día a día.','PGE'],
    [18,'Adapta su estilo de comunicación según el nivel y necesidad del interlocutor.','CEX'],
    [19,'Crea condiciones para que su equipo trabaje de manera autónoma y efectiva.','GEQ'],
    [20,'Genera compromiso y sentido de propósito en su equipo más allá de las instrucciones.','LES'],
  ];
  for (const [orden, texto, dim] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden);
    await addLikertFrecuencia(client, iid);
  }
}

// ══════════════════════════════════════════════════════════
// 12. COMPESAC — Competencias Servicio al Cliente
// ══════════════════════════════════════════════════════════
async function seedCompeSAC(client) {
  console.log('  → COMPESAC...');
  const pid = await insertPrueba(client, {
    nombre: 'COMPESAC — Competencias para Servicio al Cliente',
    descripcion: 'Evalúa las competencias clave para puestos de soporte y servicio al cliente en diferentes niveles jerárquicos.',
    tipo: 'competencias',
    instrucciones: 'Evalúe qué tan frecuentemente presenta los comportamientos descritos en situaciones de atención al cliente.',
    tiempo_limite: 35,
    total_items: 20,
    escala_tipo: 'likert5',
    categoria: 'competencias',
  });

  const dims = [
    { nombre: 'Flexibilidad y Adaptación', codigo: 'FAD', alta: 'Alta adaptabilidad a diferentes tipos de clientes', baja: 'Rigidez ante situaciones variadas' },
    { nombre: 'Respeto', codigo: 'RES', alta: 'Trato respetuoso y digno a todos los clientes', baja: 'Falta de consideración al cliente' },
    { nombre: 'Responsabilidad en Servicio', codigo: 'RSV', alta: 'Asume responsabilidad en la resolución de problemas', baja: 'Evade responsabilidades con el cliente' },
    { nombre: 'Comunicación Eficaz', codigo: 'CME', alta: 'Comunica con claridad y escucha activamente al cliente', baja: 'Comunicación deficiente con clientes' },
    { nombre: 'Influencia y Negociación', codigo: 'INE', alta: 'Persuade y negocia efectivamente para satisfacer al cliente', baja: 'Poca capacidad de influencia' },
    { nombre: 'Orientación al Cliente', codigo: 'ORC', alta: 'Anticipa y supera expectativas del cliente', baja: 'Poco enfoque en las necesidades del cliente' },
    { nombre: 'Conocimiento del Producto/Servicio', codigo: 'CON', alta: 'Alto dominio del producto/servicio para asesorar al cliente', baja: 'Conocimiento insuficiente del producto' },
    { nombre: 'Tolerancia a la Presión', codigo: 'TPN', alta: 'Mantiene calidad del servicio bajo presión y clientes difíciles', baja: 'Se deteriora el servicio bajo presión' },
    { nombre: 'Liderazgo en Servicio', codigo: 'LIS', alta: 'Guía al equipo hacia la excelencia en servicio al cliente', baja: 'Poca capacidad de modelar el servicio al equipo' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    [1,'Adapto mi forma de comunicarme según el perfil del cliente.','FAD'],
    [2,'Trato a todos los clientes con el mismo respeto y consideración.','RES'],
    [3,'Me hago responsable de resolver los problemas del cliente hasta el final.','RSV'],
    [4,'Me aseguro de que el cliente haya comprendido la información que le di.','CME'],
    [5,'Logro que el cliente acepte soluciones que inicialmente no consideraba.','INE'],
    [6,'Anticipo las necesidades del cliente antes de que las exprese.','ORC'],
    [7,'Tengo dominio suficiente del producto/servicio para asesorar correctamente al cliente.','CON'],
    [8,'Mantengo la calma y la calidad de atención con clientes difíciles o agresivos.','TPN'],
    [9,'Comparto buenas prácticas de atención al cliente con mi equipo.','LIS'],
    [10,'Ajusto el protocolo de atención cuando la situación del cliente lo requiere.','FAD'],
    [11,'Evito actitudes que puedan hacer sentir al cliente inferior o ignorado.','RES'],
    [12,'Hago seguimiento al cliente hasta asegurarme de que su problema fue resuelto.','RSV'],
    [13,'Escucho activamente al cliente sin interrumpirlo mientras explica su situación.','CME'],
    [14,'Encuentro soluciones satisfactorias para el cliente dentro de los límites de la empresa.','INE'],
    [15,'Voy más allá de las instrucciones para satisfacer genuinamente al cliente.','ORC'],
    [16,'Actualizo mis conocimientos sobre el producto/servicio regularmente.','CON'],
    [17,'Cuando hay alta demanda de clientes, mantengo la calidad de servicio sin deterioro.','TPN'],
    [18,'Motivo a mis compañeros a brindar un servicio de excelencia.','LIS'],
    [19,'Me adapto sin dificultad a cambios en procedimientos de atención.','FAD'],
    [20,'El bienestar del cliente es una prioridad para mí incluso en días difíciles.','ORC'],
  ];
  for (const [orden, texto, dim] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden);
    await addLikertFrecuencia(client, iid);
  }
}

// ══════════════════════════════════════════════════════════
// 13. COMPEVENTAS — Competencias para Vendedores
// ══════════════════════════════════════════════════════════
async function seedCompeVentas(client) {
  console.log('  → COMPEVENTAS...');
  const pid = await insertPrueba(client, {
    nombre: 'COMPEVENTAS — Competencias para Vendedores',
    descripcion: 'Evaluación de competencias clave para puestos del área comercial y de ventas.',
    tipo: 'competencias',
    instrucciones: 'Evalúe qué tan frecuentemente presenta los comportamientos descritos en su rol de ventas.',
    tiempo_limite: 25,
    total_items: 18,
    escala_tipo: 'likert5',
    categoria: 'competencias',
  });

  const dims = [
    { nombre: 'Compromiso Comercial', codigo: 'CCO', alta: 'Alto compromiso con metas y objetivos comerciales', baja: 'Bajo compromiso con resultados de ventas' },
    { nombre: 'Integridad en Ventas', codigo: 'IVE', alta: 'Honesto y transparente con el cliente en el proceso de venta', baja: 'Comportamiento comercial poco ético' },
    { nombre: 'Perseverancia Comercial', codigo: 'PCV', alta: 'Persistente ante el rechazo, orientado al cierre', baja: 'Se desanima fácilmente ante el rechazo' },
    { nombre: 'Cierre de Negocios', codigo: 'CIE', alta: 'Alta capacidad para concretar ventas y acuerdos', baja: 'Dificultad para cerrar ventas' },
    { nombre: 'Servicio al Cliente Comercial', codigo: 'SCC', alta: 'Orientado a la satisfacción y fidelización del cliente', baja: 'Poca orientación postventa' },
    { nombre: 'Conocimiento Comercial', codigo: 'CCC', alta: 'Alto dominio del producto, mercado y competencia', baja: 'Conocimiento insuficiente del producto/mercado' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    [1,'Cumplo o supero mis cuotas de ventas consistentemente.','CCO'],
    [2,'Soy honesto/a con el cliente sobre lo que el producto puede y no puede hacer.','IVE'],
    [3,'No me desmotivo cuando un prospecto me dice que no.','PCV'],
    [4,'Identifico el momento adecuado para solicitar el cierre de una venta.','CIE'],
    [5,'Hago seguimiento postventa para asegurarme de la satisfacción del cliente.','SCC'],
    [6,'Conozco en profundidad las características y beneficios de lo que vendo.','CCC'],
    [7,'Establezco planes de acción claros para alcanzar mis metas comerciales.','CCO'],
    [8,'Nunca exagero las cualidades del producto para cerrar una venta.','IVE'],
    [9,'Retomo el contacto con prospectos que inicialmente rechazaron la oferta.','PCV'],
    [10,'Manejo las objeciones del cliente de forma efectiva para avanzar en la venta.','CIE'],
    [11,'Construyo relaciones de largo plazo con mis clientes más allá de la venta.','SCC'],
    [12,'Me mantengo actualizado/a sobre el mercado, la competencia y las tendencias.','CCC'],
    [13,'Priorizo efectivamente mis actividades para maximizar el tiempo productivo de ventas.','CCO'],
    [14,'Reconozco cuando un producto no es la mejor opción para el cliente y lo digo.','IVE'],
    [15,'Busco activamente nuevas oportunidades de negocio y prospecto continuamente.','PCV'],
    [16,'Genero sentido de urgencia en el cliente de manera natural y no manipuladora.','CIE'],
    [17,'El cliente me percibe como un asesor de confianza, no solo como un vendedor.','SCC'],
    [18,'Adapto mi presentación del producto según las necesidades específicas del cliente.','CCC'],
  ];
  for (const [orden, texto, dim] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden);
    await addLikertFrecuencia(client, iid);
  }
}

// ══════════════════════════════════════════════════════════
// 14. COMPEVENTAS GERENCIAL
// ══════════════════════════════════════════════════════════
async function seedCompeVentasGerencial(client) {
  console.log('  → COMPEVENTAS GERENCIAL...');
  const pid = await insertPrueba(client, {
    nombre: 'COMPEVENTAS GERENCIAL — Dirección de Ventas',
    descripcion: 'Evaluación de competencias para gerentes y directores del área comercial que dirigen equipos de ventas.',
    tipo: 'competencias',
    instrucciones: 'Evalúe qué tan frecuentemente presenta los comportamientos descritos en su rol de dirección comercial.',
    tiempo_limite: 25,
    total_items: 18,
    escala_tipo: 'likert5',
    categoria: 'competencias',
  });

  const dims = [
    { nombre: 'Compromiso Estratégico Comercial', codigo: 'CSC', alta: 'Alto compromiso con la estrategia y visión comercial', baja: 'Bajo compromiso estratégico' },
    { nombre: 'Integridad Gerencial Comercial', codigo: 'IGC', alta: 'Modelo ético para el equipo de ventas', baja: 'Inconsistencia ética como líder de ventas' },
    { nombre: 'Perseverancia Directiva', codigo: 'PDI', alta: 'Mantiene dirección ante obstáculos comerciales', baja: 'Se desvía del objetivo ante dificultades' },
    { nombre: 'Cierre y Negociación Ejecutiva', codigo: 'CNE', alta: 'Cierra acuerdos estratégicos y negocia en alto nivel', baja: 'Dificultad para cerrar en contexto ejecutivo' },
    { nombre: 'Servicio y Fidelización Estratégica', codigo: 'SFE', alta: 'Diseña estrategias de retención y fidelización', baja: 'Poco foco en retención de clientes clave' },
    { nombre: 'Dirección de Equipos Comerciales', codigo: 'DEC', alta: 'Desarrolla y potencia el desempeño del equipo de ventas', baja: 'Poca capacidad para gestionar equipos de ventas' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    [1,'Alinea la estrategia comercial del equipo con los objetivos de la organización.','CSC'],
    [2,'Es un modelo de conducta ética para su fuerza de ventas.','IGC'],
    [3,'Mantiene el foco estratégico del área ante presiones de corto plazo.','PDI'],
    [4,'Cierra acuerdos comerciales estratégicos con clientes de alto valor.','CNE'],
    [5,'Diseña e implementa estrategias de fidelización y retención de clientes clave.','SFE'],
    [6,'Desarrolla a los vendedores a su cargo con coaching y mentoring efectivo.','DEC'],
    [7,'Traduce los objetivos comerciales en planes de acción concretos para el equipo.','CSC'],
    [8,'Construye una cultura de honestidad e integridad dentro del equipo de ventas.','IGC'],
    [9,'No abandona las metas comerciales aunque el equipo enfrente rechazo o fracasos.','PDI'],
    [10,'Negocia en condiciones de alta presión manteniendo la rentabilidad de la empresa.','CNE'],
    [11,'Construye relaciones de largo plazo con cuentas clave que generan valor sostenido.','SFE'],
    [12,'Identifica las fortalezas y áreas de mejora de cada vendedor y actúa sobre ellas.','DEC'],
    [13,'Ajusta la estrategia comercial ágilmente ante cambios del mercado o competencia.','CSC'],
    [14,'Toma decisiones comerciales difíciles con base en principios éticos.','IGC'],
    [15,'Mantiene la motivación del equipo de ventas en períodos de bajo desempeño.','PDI'],
    [16,'Identifica y capitaliza oportunidades de negocios de alto impacto.','CNE'],
    [17,'Genera sistemas de seguimiento y gestión de clientes que fortalecen la relación.','SFE'],
    [18,'Crea un ambiente de alto rendimiento que retiene al talento comercial de alto valor.','DEC'],
  ];
  for (const [orden, texto, dim] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden);
    await addLikertFrecuencia(client, iid);
  }
}

// ══════════════════════════════════════════════════════════
// 15. IPV — Inventario de Personalidad para Vendedores
// ══════════════════════════════════════════════════════════
async function seedIPV(client) {
  console.log('  → IPV Vendedores...');
  const pid = await insertPrueba(client, {
    nombre: 'IPV — Inventario de Personalidad para Vendedores',
    descripcion: 'Evalúa la disposición para la venta enfatizando en receptividad y agresividad comercial.',
    tipo: 'personalidad',
    instrucciones: 'Lea cada afirmación e indique en qué medida lo describe en situaciones de venta.',
    tiempo_limite: 40,
    total_items: 20,
    escala_tipo: 'likert5',
    categoria: 'personalidad',
  });

  const dims = [
    { nombre: 'Receptividad', codigo: 'REC', alta: 'Alta orientación a escuchar y servir al cliente postventa', baja: 'Poca sensibilidad a las necesidades del cliente' },
    { nombre: 'Agresividad Comercial', codigo: 'AGR', alta: 'Alta capacidad de imposición y seguridad para ampliar mercados', baja: 'Poca iniciativa para la prospección activa' },
    { nombre: 'Disposición General para la Venta', codigo: 'DGV', alta: 'Perfil integral de buen vendedor', baja: 'Bajo potencial natural para las ventas' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    [1,'Escucho atentamente las necesidades del cliente antes de ofrecer una solución.','REC',false],
    [2,'Soy paciente con los clientes que tardan en decidirse.','REC',false],
    [3,'Me incomoda cuando un cliente me pone muchas objeciones.','REC',true],
    [4,'Me aseguro de que el cliente haya quedado completamente satisfecho con su compra.','REC',false],
    [5,'Adapto mi oferta al presupuesto y necesidades reales del cliente.','REC',false],
    [6,'Me energiza la posibilidad de explorar nuevos mercados y contactar prospectos.','AGR',false],
    [7,'Me siento seguro/a al presentar mi producto incluso ante clientes muy exigentes.','AGR',false],
    [8,'Evito acercarme a prospectos que podrían rechazarme.','AGR',true],
    [9,'Insisto con confianza cuando sé que mi producto es la mejor solución para el cliente.','AGR',false],
    [10,'Me resulta natural competir y ganar en escenarios de alta competencia.','AGR',false],
    [11,'Disfruto genuinamente el proceso de venta.','DGV',false],
    [12,'Me siento motivado/a incluso cuando no alcanzo mis metas de ventas inmediatamente.','DGV',false],
    [13,'Identifico fácilmente el momento en que el cliente está listo para cerrar.','DGV',false],
    [14,'Las ventas son para mí más que un trabajo, son una vocación.','DGV',false],
    [15,'Me recupero rápidamente de una venta perdida y sigo adelante.','DGV',false],
    [16,'Construyo confianza con el cliente desde el primer contacto.','DGV',false],
    [17,'Prefiero atender pocos clientes pero bien, antes que muchos superficialmente.','REC',false],
    [18,'Prospecto activamente sin esperar a que los clientes lleguen solos.','AGR',false],
    [19,'Mi red de contactos comerciales crece constantemente.','AGR',false],
    [20,'Me siento tan cómodo/a en el postventa como en la prospección.','DGV',false],
  ];
  for (const [orden, texto, dim, inv] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden, inv);
    await addLikert5(client, iid);
  }
}

// ══════════════════════════════════════════════════════════
// 16. KUDER KP — Preferencias Personales (Laboral)
// ══════════════════════════════════════════════════════════
async function seedKuder(client) {
  console.log('  → Kuder KP...');
  const pid = await insertPrueba(client, {
    nombre: 'Kuder KP — Escala de Preferencias Personales',
    descripcion: 'Evalúa las preferencias de desempeño laboral en cinco áreas que orientan la satisfacción y vocación del trabajador.',
    tipo: 'laborales',
    instrucciones: 'En cada grupo de tres actividades, seleccione la que MÁS le gustaría hacer y la que MENOS le gustaría hacer.',
    tiempo_limite: 30,
    total_items: 20,
    escala_tipo: 'seleccion_forzada',
    categoria: 'laborales',
  });

  const dims = [
    { nombre: 'Preferencia por Trabajo en Grupo', codigo: 'GRU', alta: 'Alta preferencia por actividades colaborativas y sociales', baja: 'Prefiere trabajar de manera individual' },
    { nombre: 'Preferencia por Estabilidad', codigo: 'EST', alta: 'Prefiere entornos predecibles y rutinarios', baja: 'Prefiere variedad y cambio constante' },
    { nombre: 'Preferencia Intelectual/Teórica', codigo: 'INT', alta: 'Alta motivación por el análisis y el conocimiento', baja: 'Prefiere actividades prácticas sobre teóricas' },
    { nombre: 'Preferencia por No Conflicto', codigo: 'NCO', alta: 'Prefiere ambientes armoniosos y de bajo conflicto', baja: 'Cómodo en entornos de debate y confrontación' },
    { nombre: 'Inclinación a Dirigir', codigo: 'DIR', alta: 'Alta motivación por liderar y dirigir a otros', baja: 'Prefiere ser dirigido' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const triadas = [
    [1,'Actividad 1:',[
      ['Organizar una reunión de equipo para resolver un problema',4,'GRU'],
      ['Leer y analizar un informe técnico complejo',4,'INT'],
      ['Mantener un proceso rutinario que funciona bien',4,'EST'],
    ]],
    [2,'Actividad 2:',[
      ['Liderar un proyecto con personas a su cargo',4,'DIR'],
      ['Trabajar en un ambiente sin conflictos ni tensiones',4,'NCO'],
      ['Colaborar con otros en la solución de problemas',4,'GRU'],
    ]],
    [3,'Actividad 3:',[
      ['Investigar y aprender sobre un tema nuevo',4,'INT'],
      ['Coordinar a un equipo hacia una meta definida',4,'DIR'],
      ['Ejecutar tareas conocidas de manera sistemática',4,'EST'],
    ]],
    [4,'Actividad 4:',[
      ['Participar en reuniones de discusión y debate',4,'NCO'],
      ['Desarrollar proyectos grupales de largo plazo',4,'GRU'],
      ['Analizar datos y generar reportes detallados',4,'INT'],
    ]],
    [5,'Actividad 5:',[
      ['Administrar y supervisar el trabajo de un equipo',4,'DIR'],
      ['Realizar tareas repetitivas con alta precisión',4,'EST'],
      ['Mediar en conflictos para llegar a acuerdos',4,'NCO'],
    ]],
    [6,'Actividad 6:',[
      ['Diseñar una estrategia de trabajo con el equipo',4,'GRU'],
      ['Investigar soluciones innovadoras a problemas',4,'INT'],
      ['Mantener procesos estables y predecibles',4,'EST'],
    ]],
    [7,'Actividad 7:',[
      ['Dirigir reuniones de planificación estratégica',4,'DIR'],
      ['Trabajar en un ambiente de bajo conflicto interpersonal',4,'NCO'],
      ['Participar activamente en proyectos colaborativos',4,'GRU'],
    ]],
    [8,'Actividad 8:',[
      ['Estudiar en profundidad un área de conocimiento específica',4,'INT'],
      ['Liderar el proceso de cambio en la organización',4,'DIR'],
      ['Seguir procedimientos establecidos consistentemente',4,'EST'],
    ]],
    [9,'Actividad 9:',[
      ['Evitar situaciones de confrontación con otros',4,'NCO'],
      ['Colaborar diariamente con un equipo interdisciplinario',4,'GRU'],
      ['Generar informes técnicos y analíticos',4,'INT'],
    ]],
    [10,'Actividad 10:',[
      ['Tomar decisiones que afectan a un grupo de personas',4,'DIR'],
      ['Trabajar en tareas con resultados predecibles',4,'EST'],
      ['Buscar acuerdos en situaciones de conflicto',4,'NCO'],
    ]],
  ];

  let orden = 1;
  for (const [, texto, opciones] of triadas) {
    const iid = await insertItem(client, pid, dimIds['GRU'], texto, orden++);
    for (let o = 0; o < opciones.length; o++) {
      await insertOpcion(client, iid, opciones[o][0], opciones[o][1], o + 1);
    }
  }

  // Items Likert adicionales
  const likertItems = [
    ['Prefiero trabajar en equipo que de manera individual.','GRU'],
    ['Me siento más productivo/a con rutinas y horarios fijos.','EST'],
    ['Disfruto estudiar y aprender conceptos nuevos por iniciativa propia.','INT'],
    ['Prefiero ambientes de trabajo donde no haya confrontaciones.','NCO'],
    ['Me gusta tener personas a mi cargo y dirigir su trabajo.','DIR'],
    ['El trabajo colaborativo me energiza.','GRU'],
    ['Me incomoda cuando cambian constantemente los procedimientos.','EST'],
    ['Prefiero analizar antes de actuar en cualquier situación.','INT'],
    ['Evito los debates acalorados aunque tenga argumentos sólidos.','NCO'],
    ['Me resulta natural tomar la iniciativa de liderazgo en un grupo.','DIR'],
  ];
  for (const [texto, dim] of likertItems) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden++);
    await addLikert5(client, iid);
  }
}

// ══════════════════════════════════════════════════════════
// 17. MAT — Manejo y Administración del Tiempo
// ══════════════════════════════════════════════════════════
async function seedMAT(client) {
  console.log('  → MAT...');
  const pid = await insertPrueba(client, {
    nombre: 'MAT — Manejo y Administración del Tiempo',
    descripcion: 'Evalúa la gestión del tiempo del candidato a través de 8 factores que determinan sus fortalezas y áreas de oportunidad.',
    tipo: 'laborales',
    instrucciones: 'Indique con qué frecuencia presenta los siguientes comportamientos en su vida laboral.',
    tiempo_limite: 20,
    total_items: 24,
    escala_tipo: 'likert5',
    categoria: 'laborales',
  });

  const dims = [
    { nombre: 'Planificación', codigo: 'PLA', alta: 'Excelente capacidad de planificación anticipada', baja: 'Poca tendencia a planificar' },
    { nombre: 'Organización', codigo: 'ORG', alta: 'Entorno laboral y tareas muy bien organizados', baja: 'Desorganización frecuente' },
    { nombre: 'Priorización', codigo: 'PRI', alta: 'Alta capacidad para identificar y enfocarse en lo importante', baja: 'Dificultad para priorizar' },
    { nombre: 'Delegación', codigo: 'DEL', alta: 'Delega efectivamente para optimizar su tiempo', baja: 'Dificultad para delegar tareas' },
    { nombre: 'Control de Interrupciones', codigo: 'INT', alta: 'Gestiona efectivamente las interrupciones', baja: 'Las interrupciones afectan su productividad' },
    { nombre: 'Gestión de Reuniones', codigo: 'REU', alta: 'Optimiza el tiempo en reuniones', baja: 'Las reuniones consumen tiempo excesivo' },
    { nombre: 'Procrastinación', codigo: 'PRO', alta: 'Tiende a posponer tareas importantes (negativo)', baja: 'No procrastina, actúa de inmediato' },
    { nombre: 'Equilibrio Vida-Trabajo', codigo: 'EQU', alta: 'Buen balance entre vida personal y laboral', baja: 'Dificultad para desconectarse del trabajo' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    [1,'Planifico mis actividades del día al inicio de la jornada.','PLA',false],
    [2,'Elaboro listas de tareas con plazos definidos.','PLA',false],
    [3,'Mantengo mi escritorio y archivos digitales organizados.','ORG',false],
    [4,'Tengo un sistema claro para gestionar mis documentos y correos.','ORG',false],
    [5,'Distingo claramente entre tareas urgentes e importantes antes de actuar.','PRI',false],
    [6,'Dedico tiempo a tareas de alto impacto antes que a las de bajo impacto.','PRI',false],
    [7,'Delego tareas cuando alguien más puede realizarlas igual o mejor que yo.','DEL',false],
    [8,'Confío en mis colaboradores para ejecutar tareas sin supervisión constante.','DEL',false],
    [9,'Establezco horarios específicos para revisar correos y mensajes.','INT',false],
    [10,'Logro concentrarme en una tarea importante a pesar de las interrupciones.','INT',false],
    [11,'Establezco agenda y objetivos claros antes de convocar una reunión.','REU',false],
    [12,'Termino las reuniones en el tiempo previsto.','REU',false],
    [13,'Pospongo tareas difíciles o que no me gustan.','PRO',true],
    [14,'Me cuesta iniciar proyectos grandes aunque sean importantes.','PRO',true],
    [15,'Logro desconectarme del trabajo al terminar mi jornada laboral.','EQU',false],
    [16,'Mantengo tiempo de calidad para actividades personales y familiares.','EQU',false],
    [17,'Reviso y ajusto mi planificación cuando surgen imprevistos.','PLA',false],
    [18,'Tengo claridad sobre mis objetivos de la semana y el mes.','ORG',false],
    [19,'Digo no a tareas nuevas cuando mi agenda ya está completa.','PRI',false],
    [20,'Identifico qué tareas solo yo puedo hacer versus cuáles pueden hacer otros.','DEL',false],
    [21,'Cuando alguien me interrumpe, retomo rápidamente mi trabajo anterior.','INT',false],
    [22,'Evalúo si una reunión es realmente necesaria antes de asistir o convocarla.','REU',false],
    [23,'Actúo de inmediato en lugar de dejar para después las tareas pendientes.','PRO',true],
    [24,'El trabajo raramente invade mi tiempo personal o de descanso.','EQU',false],
  ];
  for (const [orden, texto, dim, inv] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden, inv);
    await addLikertFrecuencia(client, iid);
  }
}

// ══════════════════════════════════════════════════════════
// 18. RAVEN — Matrices Progresivas (Adaptado Digital)
// ══════════════════════════════════════════════════════════
async function seedRaven(client) {
  console.log('  → Raven Matrices (adaptado)...');
  const pid = await insertPrueba(client, {
    nombre: 'Raven — Matrices Progresivas (Versión Verbal Adaptada)',
    descripcion: 'Versión adaptada para evaluación digital. Mide el razonamiento abstracto y capacidad para identificar patrones lógicos.',
    tipo: 'inteligencia',
    instrucciones: 'En cada problema, identifique el patrón lógico y seleccione la opción que completa correctamente la secuencia.',
    tiempo_limite: 30,
    total_items: 15,
    escala_tipo: 'multiple',
    categoria: 'inteligencia',
  });

  const dims = [
    { nombre: 'Razonamiento Abstracto', codigo: 'RAB', alta: 'Excelente capacidad para identificar patrones y relaciones lógicas', baja: 'Dificultad para el razonamiento abstracto no verbal' },
    { nombre: 'Razonamiento Analógico', codigo: 'ANA', alta: 'Alta capacidad para establecer analogías y relaciones', baja: 'Dificultad para relaciones analógicas' },
    { nombre: 'Razonamiento Serial', codigo: 'SER', alta: 'Excelente capacidad para completar series y progresiones', baja: 'Dificultad para identificar series lógicas' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    [1,'Si en una matriz el patrón es: 2, 4, 8, 16, __ ¿Cuál es el número faltante?','SER',[
      ['24',1],['32',4],['30',2],['18',1],
    ]],
    [2,'Serie: AZ, BY, CX, DW, __ ¿Cuál sigue?','SER',[
      ['EV',4],['FU',1],['EW',2],['DV',1],
    ]],
    [3,'Si CUADRADO es a 4 lados como TRIÁNGULO es a:','ANA',[
      ['2 lados',1],['3 lados',4],['6 lados',1],['5 lados',1],
    ]],
    [4,'Completa: 1, 1, 2, 3, 5, 8, __','SER',[
      ['11',1],['12',1],['13',4],['14',1],
    ]],
    [5,'Grande es a pequeño como rápido es a:','ANA',[
      ['veloz',1],['lento',4],['moderado',2],['alto',1],
    ]],
    [6,'En una matriz 3x3 donde cada fila suma 15 y los números son 1-9, si la primera fila es 2,7,6 y la segunda 9,5,1, ¿cuál es el número central de la tercera fila?','RAB',[
      ['3',1],['4',1],['5',4],['6',1],
    ]],
    [7,'Si todos los A son B, y todos los B son C, entonces:','RAB',[
      ['Todos los C son A',1],['Todos los A son C',4],['Algunos C son A',2],['Ningún A es C',1],
    ]],
    [8,'Patrón: ○□○□○__ ¿Qué sigue?','SER',[
      ['○',1],['□',4],['△',1],['◇',1],
    ]],
    [9,'LIBRO es a LEER como MÚSICA es a:','ANA',[
      ['escuchar',4],['ver',1],['tocar',2],['escribir',1],
    ]],
    [10,'Serie: 100, 50, 25, 12.5, __','SER',[
      ['6',1],['6.25',4],['7',1],['5',1],
    ]],
    [11,'En un grupo de 5 personas, cada una estrecha la mano con todas las demás una sola vez. ¿Cuántos apretones de mano hay en total?','RAB',[
      ['8',1],['10',4],['12',1],['20',1],
    ]],
    [12,'NORTE es a SUR como ESTE es a:','ANA',[
      ['arriba',1],['izquierda',2],['oeste',4],['abajo',1],
    ]],
    [13,'Serie numérica: 3, 6, 12, 24, 48, __','SER',[
      ['72',1],['96',4],['84',1],['60',1],
    ]],
    [14,'Si hoy es martes, ¿qué día será dentro de 100 días?','RAB',[
      ['lunes',1],['martes',1],['miércoles',4],['viernes',1],
    ]],
    [15,'Pez es a agua como pájaro es a:','ANA',[
      ['nido',2],['cielo/aire',4],['árbol',1],['vuelo',1],
    ]],
  ];
  for (const [orden, texto, dim, opciones] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden);
    for (let o = 0; o < opciones.length; o++) {
      await insertOpcion(client, iid, opciones[o][0], opciones[o][1], o + 1);
    }
  }
}

// ══════════════════════════════════════════════════════════
// 19. WONDERLIC — Aptitud Mental (Timed)
// ══════════════════════════════════════════════════════════
async function seedWonderlic(client) {
  console.log('  → Wonderlic...');
  const pid = await insertPrueba(client, {
    nombre: 'Wonderlic — Test de Aptitud Mental',
    descripcion: 'Prueba de inteligencia con tiempo límite. Evalúa habilidad numérica, razonamiento verbal y aprendizaje bajo presión.',
    tipo: 'inteligencia',
    instrucciones: 'Tiene 12 minutos para completar este test. Trabaje rápido y con precisión. No dedique demasiado tiempo a preguntas difíciles.',
    tiempo_limite: 12,
    total_items: 20,
    escala_tipo: 'multiple',
    categoria: 'inteligencia',
  });

  const dims = [
    { nombre: 'Aptitud Verbal', codigo: 'VER', alta: 'Alta comprensión verbal y vocabulario', baja: 'Baja aptitud verbal' },
    { nombre: 'Aptitud Numérica', codigo: 'NUM', alta: 'Alta velocidad y precisión numérica', baja: 'Dificultad con operaciones numéricas' },
    { nombre: 'Razonamiento Lógico', codigo: 'LOG', alta: 'Excelente razonamiento bajo presión de tiempo', baja: 'Dificultad de razonamiento con tiempo limitado' },
    { nombre: 'Aprendizaje de Instrucciones', codigo: 'INS', alta: 'Alta capacidad para entender y aplicar instrucciones nuevas', baja: 'Dificultad para seguir instrucciones complejas' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    [1,'¿Cuánto es 15% de 200?','NUM',[['20',1],['25',1],['30',4],['35',1]]],
    [2,'RÁPIDO es lo opuesto de:','VER',[['veloz',1],['ágil',1],['lento',4],['breve',1]]],
    [3,'Si 3 personas tardan 6 días en hacer un trabajo, ¿cuántos días tardarán 6 personas?','LOG',[['1',1],['2',1],['3',4],['4',1]]],
    [4,'¿Cuánto es 144 ÷ 12?','NUM',[['10',1],['12',4],['14',1],['16',1]]],
    [5,'ANÁLOGO significa algo similar a:','VER',[['contrario',1],['equivalente',4],['diferente',1],['principal',1]]],
    [6,'Una tienda rebaja un artículo de $80 a $60. ¿Qué porcentaje de descuento es?','NUM',[['20%',1],['25%',4],['30%',1],['15%',1]]],
    [7,'Si A > B y B > C, entonces:','LOG',[['C > A',1],['A > C',4],['B > A',1],['C = A',1]]],
    [8,'¿Cuánto es la raíz cuadrada de 169?','NUM',[['11',1],['12',1],['13',4],['14',1]]],
    [9,'PROACTIVO es lo opuesto de:','VER',[['activo',1],['reactivo',4],['preventivo',1],['eficiente',1]]],
    [10,'Un tren viaja a 60 km/h. ¿Cuánto tiempo tarda en recorrer 150 km?','NUM',[['2 h',1],['2.5 h',4],['3 h',1],['1.5 h',1]]],
    [11,'Todos los perros son animales. Algunos animales son domésticos. Por lo tanto:','LOG',[['Todos los perros son domésticos',1],['Algunos perros pueden ser domésticos',4],['Ningún perro es doméstico',1],['Los perros no son animales',1]]],
    [12,'¿Cuánto es 7 × 8 + 6 ÷ 2?','NUM',[['56',1],['59',4],['62',1],['53',1]]],
    [13,'EFÍMERO significa:','VER',[['permanente',1],['pasajero',4],['fuerte',1],['brillante',1]]],
    [14,'Si una empresa tiene ingresos de $500,000 y gastos de $380,000, ¿cuál es su margen de utilidad?','NUM',[['18%',1],['20%',1],['24%',4],['30%',1]]],
    [15,'En una oficina hay 4 equipos. Cada equipo tiene 3 personas. Cada persona maneja 5 cuentas. ¿Cuántas cuentas hay en total?','LOG',[['50',1],['60',4],['70',1],['45',1]]],
    [16,'AMBIGUO significa:','VER',[['claro',1],['de doble interpretación',4],['falso',1],['definitivo',1]]],
    [17,'Si el precio de un producto sube 20% y luego baja 20%, ¿cuál es el resultado neto?','NUM',[['igual al original',1],['4% menos que el original',4],['4% más que el original',1],['20% menos que el original',1]]],
    [18,'¿Cuántos minutos hay en 2.5 horas?','NUM',[['120',1],['140',1],['150',4],['160',1]]],
    [19,'PARADIGMA significa principalmente:','VER',[['problema',1],['modelo o ejemplo',4],['contradicción',1],['solución',1]]],
    [20,'Una empresa produce 1200 unidades en 5 días con 3 máquinas. ¿Cuántas unidades producen en 10 días con 6 máquinas?','LOG',[['2400',1],['3600',1],['4800',4],['2200',1]]],
  ];
  for (const [orden, texto, dim, opciones] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden);
    for (let o = 0; o < opciones.length; o++) {
      await insertOpcion(client, iid, opciones[o][0], opciones[o][1], o + 1);
    }
  }
}

// ══════════════════════════════════════════════════════════
// 20. BARSIT — Test Rápido de Barranquilla
// ══════════════════════════════════════════════════════════
async function seedBarsit(client) {
  console.log('  → BARSIT...');
  const pid = await insertPrueba(client, {
    nombre: 'BARSIT — Test Rápido de Barranquilla',
    descripcion: 'Test de inteligencia para puestos operativos. Evalúa 5 áreas del razonamiento básico con tiempo límite.',
    tipo: 'inteligencia',
    instrucciones: 'Tiene 10 minutos para completar este test. Responda lo más rápido y correctamente posible.',
    tiempo_limite: 10,
    total_items: 20,
    escala_tipo: 'multiple',
    categoria: 'inteligencia',
  });

  const dims = [
    { nombre: 'Conocimientos Generales', codigo: 'COG', alta: 'Alto nivel de cultura general', baja: 'Bajo nivel de conocimientos generales' },
    { nombre: 'Comprensión Verbal', codigo: 'COV', alta: 'Alta comprensión del lenguaje escrito', baja: 'Baja comprensión verbal' },
    { nombre: 'Razonamiento Verbal', codigo: 'RAV', alta: 'Alta capacidad de razonamiento verbal', baja: 'Dificultad con el razonamiento verbal' },
    { nombre: 'Razonamiento Lógico', codigo: 'RAL', alta: 'Buen razonamiento lógico básico', baja: 'Dificultad para el razonamiento lógico' },
    { nombre: 'Razonamiento Numérico', codigo: 'RAN', alta: 'Buena aptitud numérica básica', baja: 'Dificultad con operaciones numéricas básicas' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    [1,'¿Cuál es la capital de la República Dominicana?','COG',[['Santiago',1],['Santo Domingo',4],['San Pedro',1],['La Romana',1]]],
    [2,'¿Cuántos días tiene una semana?','COG',[['5',1],['6',1],['7',4],['8',1]]],
    [3,'¿Cuál de estas palabras significa lo mismo que "grande"?','COV',[['pequeño',1],['amplio',4],['rápido',1],['suave',1]]],
    [4,'Lee y responde: "El trabajador llegó temprano y limpió el área. Luego preparó los materiales." ¿Qué hizo primero?','COV',[['Preparó materiales',1],['Llegó temprano y limpió',4],['Organizó herramientas',1],['Descansó',1]]],
    [5,'ALTO es lo opuesto de:','RAV',[['grande',1],['bajo',4],['largo',1],['ancho',1]]],
    [6,'Manzana es a fruta como rosa es a:','RAV',[['árbol',1],['color',1],['flor',4],['jardín',1]]],
    [7,'Si hay 4 cajas y en cada caja hay 3 objetos, ¿cuántos objetos hay en total?','RAN',[['8',1],['10',1],['12',4],['14',1]]],
    [8,'¿Cuánto es 25 + 37?','RAN',[['52',1],['62',4],['72',1],['42',1]]],
    [9,'Todos los gatos son animales. Pelusa es un gato. Por lo tanto:','RAL',[['Pelusa no es un animal',1],['Pelusa es un animal',4],['Todos los animales son gatos',1],['No se puede saber',1]]],
    [10,'Si A viene antes que B y B viene antes que C, ¿cuál es el orden correcto?','RAL',[['B, A, C',1],['C, B, A',1],['A, B, C',4],['A, C, B',1]]],
    [11,'¿En qué continente está México?','COG',[['Sudamérica',1],['Europa',1],['América del Norte',4],['Centroamérica',1]]],
    [12,'¿Cuál de estas frases está correctamente escrita?','COV',[['El niño fue ayer a escuela',1],['El niño fue ayer a la escuela',4],['El niño fue ayer escuela la',1],['Fue el niño ayer escuela',1]]],
    [13,'FELIZ es lo opuesto de:','RAV',[['contento',1],['alegre',1],['triste',4],['animado',1]]],
    [14,'Zapato es a pie como guante es a:','RAV',[['cabeza',1],['mano',4],['brazo',1],['dedo',1]]],
    [15,'¿Cuánto es 8 × 6?','RAN',[['42',1],['48',4],['54',1],['46',1]]],
    [16,'¿Cuánto es 100 - 37?','RAN',[['53',1],['63',4],['73',1],['43',1]]],
    [17,'Si Lunes, Martes, Miércoles... ¿qué día sigue después de Viernes?','RAL',[['Jueves',1],['Domingo',1],['Sábado',4],['Lunes',1]]],
    [18,'Hay 5 trabajadores. Cada uno trabaja 8 horas al día. ¿Cuántas horas trabajan todos en un día?','RAN',[['35',1],['40',4],['45',1],['30',1]]],
    [19,'¿Cuál es el resultado de 3 + 4 × 2?','RAN',[['14',1],['11',4],['10',1],['8',1]]],
    [20,'Si un trabajador tiene que llegar a las 8:00 am y el viaje dura 45 minutos, ¿a qué hora debe salir?','RAL',[['7:15 am',4],['7:30 am',1],['7:00 am',1],['7:45 am',1]]],
  ];
  for (const [orden, texto, dim, opciones] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden);
    for (let o = 0; o < opciones.length; o++) {
      await insertOpcion(client, iid, opciones[o][0], opciones[o][1], o + 1);
    }
  }
}

// ══════════════════════════════════════════════════════════
// 21. TERMAN MERRIL — Inteligencia Ejecutiva (Timed)
// ══════════════════════════════════════════════════════════
async function seedTerman(client) {
  console.log('  → Terman Merril...');
  const pid = await insertPrueba(client, {
    nombre: 'Terman Merril — Test de Inteligencia Ejecutiva',
    descripcion: 'Test de inteligencia para puestos ejecutivos y gerenciales. Se aplica con cronómetro y evalúa múltiples series cognitivas.',
    tipo: 'inteligencia',
    instrucciones: 'Este test se aplica con tiempo límite por serie. Trabaje rápido pero con precisión. Siga las instrucciones específicas de cada serie.',
    tiempo_limite: 27,
    total_items: 27,
    escala_tipo: 'multiple',
    categoria: 'inteligencia',
  });

  const dims = [
    { nombre: 'Información General', codigo: 'INF', alta: 'Alto nivel de cultura e información general', baja: 'Bajo nivel de información general' },
    { nombre: 'Juicio Práctico', codigo: 'JUP', alta: 'Excelente razonamiento práctico y sentido común', baja: 'Juicio práctico deficiente' },
    { nombre: 'Vocabulario', codigo: 'VOC', alta: 'Riqueza y precisión en el vocabulario', baja: 'Vocabulario limitado' },
    { nombre: 'Síntesis Lógica', codigo: 'SIN', alta: 'Alta capacidad de síntesis y razonamiento', baja: 'Dificultad para síntesis y conclusiones' },
    { nombre: 'Analogías Verbales', codigo: 'ANA', alta: 'Excelente capacidad para establecer relaciones verbales', baja: 'Dificultad con relaciones analógicas verbales' },
    { nombre: 'Razonamiento Aritmético', codigo: 'ARI', alta: 'Alta capacidad de cálculo y razonamiento numérico ejecutivo', baja: 'Dificultad de cálculo en nivel ejecutivo' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const items = [
    // Información General
    [1,'¿Cuántos países forman la Unión Europea actualmente?','INF',[['25',1],['27',4],['30',1],['32',1]]],
    [2,'¿Cuál es la fórmula del agua?','INF',[['CO2',1],['H2O',4],['NaCl',1],['O2',1]]],
    [3,'¿Quién escribió "Cien años de soledad"?','INF',[['Pablo Neruda',1],['Mario Vargas Llosa',1],['Gabriel García Márquez',4],['Julio Cortázar',1]]],
    [4,'¿En qué año llegó el hombre a la Luna?','INF',[['1965',1],['1967',1],['1969',4],['1971',1]]],
    // Juicio Práctico
    [5,'Si un cliente estratégico amenaza con cancelar el contrato por un malentendido, ¿qué hace primero?','JUP',[['Espera a que el cliente se calme solo',1],['Llama al cliente para entender su perspectiva y buscar solución',4],['Acepta todas las condiciones del cliente sin negociar',1],['Reporta el problema a la dirección y no actúa',1]]],
    [6,'Su equipo está rindiendo por debajo de la meta. ¿Cuál es el primer paso?','JUP',[['Implementar medidas disciplinarias de inmediato',1],['Analizar las causas raíz con el equipo antes de actuar',4],['Reducir las metas para que sean más alcanzables',1],['Reemplazar a los miembros del equipo que fallan',1]]],
    [7,'Tiene que tomar una decisión urgente con información incompleta. ¿Qué hace?','JUP',[['Espera hasta tener toda la información',1],['Decide con la información disponible minimizando el riesgo',4],['Delega la decisión completamente',1],['No decide y deja que el problema se resuelva solo',1]]],
    [8,'Un colega le comparte una idea que podría mejorar el proceso. Usted:','JUP',[['La descarta porque no es de su área',1],['La escucha, evalúa y la eleva si tiene mérito',4],['La implementa sin validarla con el equipo',1],['La apropia como propia sin crédito al colega',1]]],
    // Vocabulario
    [9,'DILUCIDACIÓN significa:','VOC',[['confusión',1],['aclaración o explicación',4],['contradicción',1],['suposición',1]]],
    [10,'VEROSÍMIL significa:','VOC',[['falso',1],['creíble o probable',4],['extraño',1],['inexacto',1]]],
    [11,'PRAGMÁTICO significa:','VOC',[['teórico',1],['práctico y orientado a la realidad',4],['filosófico',1],['abstracto',1]]],
    [12,'DISRUPTIVO en contexto empresarial significa:','VOC',[['destructivo',1],['que rompe con lo establecido e innova radicalmente',4],['conflictivo',1],['irregular',1]]],
    // Síntesis Lógica
    [13,'Todos los gerentes de la empresa asistieron a la capacitación. Juan no asistió. Por lo tanto:','SIN',[['Juan es gerente',1],['Juan no es gerente',4],['Algunos gerentes no asistieron',1],['No se puede concluir nada',1]]],
    [14,'La empresa A tiene mayor ROI que B. B tiene mayor ROI que C. ¿Cuál tiene el menor ROI?','SIN',[['A',1],['B',1],['C',4],['No se puede saber',1]]],
    [15,'Si el precio sube cuando la demanda supera la oferta, y la demanda actualmente supera la oferta, entonces:','SIN',[['El precio bajará',1],['El precio subirá',4],['El precio se mantendrá igual',1],['La demanda bajará automáticamente',1]]],
    // Analogías Verbales
    [16,'EMPRESA es a DIRECTIVO como PAÍS es a:','ANA',[['ciudadano',1],['gobierno/presidente',4],['constitución',1],['territorio',1]]],
    [17,'INNOVACIÓN es a STAGNACIÓN como DESARROLLO es a:','ANA',[['crecimiento',1],['progreso',1],['retroceso',4],['inversión',1]]],
    [18,'ESTRATEGIA es a TÁCTICA como OBJETIVO es a:','ANA',[['misión',1],['visión',1],['acción',4],['plan',1]]],
    [19,'INVERSIÓN es a RENDIMIENTO como EDUCACIÓN es a:','ANA',[['costo',1],['tiempo',1],['conocimiento',4],['universidad',1]]],
    // Razonamiento Aritmético
    [20,'Una empresa factura $2,400,000 al año. ¿Cuánto factura mensualmente en promedio?','ARI',[['$180,000',1],['$200,000',4],['$240,000',1],['$150,000',1]]],
    [21,'Si la productividad de un equipo aumenta 15% y pasan de 200 a ___ unidades diarias:','ARI',[['215',1],['220',1],['230',4],['225',1]]],
    [22,'Un proyecto tiene 5 etapas. Las primeras 3 tomaron 40% del tiempo total de 100 días. ¿Cuántos días promedio por etapa quedan para las últimas 2?','ARI',[['25',1],['30',4],['35',1],['20',1]]],
    [23,'Si hay 3 gerentes y cada uno gestiona 8 proyectos con 4 colaboradores cada uno, ¿cuántos colaboradores en total?','ARI',[['88',1],['96',4],['104',1],['80',1]]],
    [24,'Un presupuesto de $50,000 se distribuye en proporción 2:3:5. ¿Cuánto recibe la parte mayor?','ARI',[['$20,000',1],['$25,000',4],['$30,000',1],['$15,000',1]]],
    [25,'Si una inversión de $10,000 genera 8% de interés anual simple, ¿cuánto habrá al cabo de 3 años?','ARI',[['$11,800',1],['$12,400',4],['$12,000',1],['$11,000',1]]],
    [26,'Un equipo de 6 personas completa un reporte en 4 días. ¿Cuántos días tardarían 4 personas?','ARI',[['5',1],['6',4],['7',1],['8',1]]],
    [27,'La rentabilidad fue 12% sobre ventas de $250,000. ¿Cuál fue la utilidad?','ARI',[['$25,000',1],['$30,000',4],['$35,000',1],['$28,000',1]]],
    
  ];
  for (const [orden, texto, dim, opciones] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden);
    for (let o = 0; o < opciones.length; o++) {
      await insertOpcion(client, iid, opciones[o][0], opciones[o][1], o + 1);
    }
  }
}

// ══════════════════════════════════════════════════════════
// 22. 16PF — 16 Factores de Personalidad
// ══════════════════════════════════════════════════════════
async function seed16PF(client) {
  console.log('  → 16PF...');
  const pid = await insertPrueba(client, {
    nombre: '16PF — 16 Factores de Personalidad',
    descripcion: 'Evalúa un amplio espectro de factores de personalidad para puestos medios, gerencias y dirección.',
    tipo: 'personalidad',
    instrucciones: 'Seleccione la opción que mejor lo describe. Hay tres posibilidades: A (sí/de acuerdo), B (a veces/neutro), C (no/en desacuerdo). Responda honestamente.',
    tiempo_limite: 40,
    total_items: 32,
    escala_tipo: 'multiple',
    categoria: 'personalidad',
  });

  const dims = [
    { nombre: 'Afabilidad (A)', codigo: 'A', alta: 'Afectuoso, participativo y empático', baja: 'Reservado, crítico y distante' },
    { nombre: 'Razonamiento (B)', codigo: 'B', alta: 'Alta capacidad intelectual y razonamiento abstracto', baja: 'Razonamiento más concreto y práctico' },
    { nombre: 'Estabilidad Emocional (C)', codigo: 'C', alta: 'Maduro emocionalmente, tranquilo y estable', baja: 'Afectado por sentimientos, inestable' },
    { nombre: 'Dominancia (E)', codigo: 'E', alta: 'Asertivo, dominante y competitivo', baja: 'Deferente, cooperativo y evita conflictos' },
    { nombre: 'Animación (F)', codigo: 'F', alta: 'Entusiasta, espontáneo y expresivo', baja: 'Serio, inhibido y reflexivo' },
    { nombre: 'Atención a Normas (G)', codigo: 'G', alta: 'Consciente de las reglas, persistente y responsable', baja: 'Inconformista, flexible con las normas' },
    { nombre: 'Atrevimiento (H)', codigo: 'H', alta: 'Atrevido, socialmente activo y poco inhibido', baja: 'Tímido, sensible a las amenazas' },
    { nombre: 'Sensibilidad (I)', codigo: 'I', alta: 'Sensible, estético e intuitivo', baja: 'Objetivo, práctico y autosuficiente' },
    { nombre: 'Vigilancia (L)', codigo: 'L', alta: 'Vigilante, desconfiado y centrado en sí mismo', baja: 'Confiado, empático y fácil de tratar' },
    { nombre: 'Abstracción (M)', codigo: 'M', alta: 'Imaginativo, orientado a ideas y abstracciones', baja: 'Práctico, orientado a hechos y soluciones' },
    { nombre: 'Privacidad (N)', codigo: 'N', alta: 'Privado, diplomático y agudo socialmente', baja: 'Franco, genuino y espontáneo' },
    { nombre: 'Aprensión (O)', codigo: 'O', alta: 'Aprensivo, preocupado y autoinculpante', baja: 'Seguro, satisfecho y resistente' },
    { nombre: 'Apertura al Cambio (Q1)', codigo: 'Q1', alta: 'Abierto al cambio, experimentador', baja: 'Tradicional, apegado a lo familiar' },
    { nombre: 'Autosuficiencia (Q2)', codigo: 'Q2', alta: 'Autosuficiente, prefiere trabajar solo', baja: 'Orientado al grupo, buscador de apoyo' },
    { nombre: 'Perfeccionismo (Q3)', codigo: 'Q3', alta: 'Perfeccionista, organizado y con autocontrol', baja: 'Flexible en sus estándares, poco disciplinado' },
    { nombre: 'Tensión (Q4)', codigo: 'Q4', alta: 'Tenso, impaciente y frustrado con frecuencia', baja: 'Relajado, tranquilo y paciente' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const addTres = async (itemId) => {
    await insertOpcion(client, itemId, 'A — Sí / De acuerdo', 5, 1);
    await insertOpcion(client, itemId, 'B — A veces / Término medio', 3, 2);
    await insertOpcion(client, itemId, 'C — No / En desacuerdo', 1, 3);
  };

  const items = [
    [1,'Disfruto charlar con personas en fiestas o reuniones.','A'],
    [2,'Prefiero estar con personas que estar solo/a.','A'],
    [3,'Se me dan bien los problemas abstractos y los acertijos.','B'],
    [4,'Aprendo rápidamente cuando me enseñan algo nuevo.','B'],
    [5,'Raramente me siento nervioso/a o ansioso/a.','C'],
    [6,'Me recupero fácilmente de situaciones que me alteran.','C'],
    [7,'No me importa confrontar a alguien si sé que tengo razón.','E'],
    [8,'Tiendo a imponerme en las discusiones.','E'],
    [9,'Soy una persona animada y expresiva.','F'],
    [10,'Me entusiasmo fácilmente con planes nuevos.','F'],
    [11,'Siempre trato de cumplir las reglas aunque me parezcan injustas.','G'],
    [12,'Soy una persona muy confiable y responsable.','G'],
    [13,'Me arriesgo sin pensarlo mucho cuando hay una oportunidad.','H'],
    [14,'Hablo con personas desconocidas sin dificultad.','H'],
    [15,'Me afectan mucho las escenas emotivas en películas o libros.','I'],
    [16,'Las cuestiones estéticas y artísticas me importan mucho.','I'],
    [17,'Desconfío de las personas hasta que demuestran ser confiables.','L'],
    [18,'Creo que las personas actúan principalmente por interés propio.','L'],
    [19,'A menudo me pierdo en mis propios pensamientos e ideas.','M'],
    [20,'Prefiero las ideas teóricas a las soluciones prácticas.','M'],
    [21,'Soy muy selectivo/a sobre lo que comparto de mi vida personal.','N'],
    [22,'Soy una persona discreta y diplomática en mis relaciones.','N'],
    [23,'A menudo me preocupo de que no estoy haciendo las cosas bien.','O'],
    [24,'Me siento culpable cuando algo sale mal, aunque no sea mi culpa.','O'],
    [25,'Me atraen las nuevas ideas y formas de hacer las cosas.','Q1'],
    [26,'Disfruto explorar enfoques diferentes a los tradicionales.','Q1'],
    [27,'Prefiero trabajar de manera independiente antes que en equipo.','Q2'],
    [28,'Me siento más productivo/a cuando trabajo solo/a.','Q2'],
    [29,'Soy muy organizado/a y meticuloso/a en todo lo que hago.','Q3'],
    [30,'Tengo altos estándares para mi propia conducta y trabajo.','Q3'],
    [31,'Con frecuencia me siento impaciente cuando las cosas van despacio.','Q4'],
    [32,'Me noto tenso/a o con dificultad para relajarme.','Q4'],
  ];
  for (const [orden, texto, dim] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden);
    await addTres(iid);
  }
}

// ══════════════════════════════════════════════════════════
// 23. ENGLISH TEST — Básico / Intermedio / Avanzado
// ══════════════════════════════════════════════════════════
async function seedEnglish(client) {
  console.log('  → English Test...');

  const niveles = [
    {
      nombre: 'English Test — Nivel Básico',
      tiempo_limite: 10,
      items: [
        [1,'Select the correct form: "She ___ to work every day."','GRA',[['go',1],['goes',4],['going',1],['gone',1]]],
        [2,'What is the plural of "child"?','VOC',[['childs',1],['childen',1],['children',4],['childre',1]]],
        [3,'Choose the correct answer: "I ___ happy right now."','GRA',[['am',4],['is',1],['are',1],['be',1]]],
        [4,'"Big" means the same as:','VOC',[['small',1],['large',4],['short',1],['fast',1]]],
        [5,'Read and answer: "Maria is a teacher. She works at a school." What is Maria\'s job?','COM',[['student',1],['doctor',1],['teacher',4],['nurse',1]]],
        [6,'Select the correct option: "There ___ two cats in the garden."','GRA',[['is',1],['am',1],['are',4],['be',1]]],
        [7,'"Cold" is the opposite of:','VOC',[['cool',1],['warm/hot',4],['dark',1],['heavy',1]]],
        [8,'What does "breakfast" mean?','VOC',[['lunch',1],['dinner',1],['desayuno',4],['snack',1]]],
        [9,'Choose: "Yesterday I ___ to the store."','GRA',[['go',1],['goes',1],['went',4],['going',1]]],
        [10,'Complete: "She doesn\'t ___ English very well."','GRA',[['speak',4],['speaks',1],['spoke',1],['speaking',1]]],
      ],
    },
    {
      nombre: 'English Test — Nivel Intermedio',
      tiempo_limite: 10,
      items: [
        [1,'Choose the correct tense: "By the time he arrived, we ___ for two hours."','GRA',[['waited',1],['have waited',1],['had been waiting',4],['were waiting',1]]],
        [2,'"Eloquent" means:','VOC',[['silent',1],['aggressive',1],['well-spoken and persuasive',4],['confused',1]]],
        [3,'Select: "She suggested ___ early to avoid traffic."','GRA',[['to leave',1],['leaving',4],['left',1],['leave',1]]],
        [4,'Read: "Despite the difficulties, the team managed to complete the project on time." What does "despite" indicate?','COM',[['reason',1],['contrast/concession',4],['result',1],['addition',1]]],
        [5,'"Procurement" in business refers to:','VOC',[['sales process',1],['purchasing/acquiring goods',4],['accounting method',1],['marketing strategy',1]]],
        [6,'Choose: "If I ___ more money, I would travel more."','GRA',[['have',1],['had',4],['will have',1],['has',1]]],
        [7,'"Stakeholder" means:','VOC',[['a type of food',1],['person with interest in a project/company',4],['financial report',1],['business competitor',1]]],
        [8,'Select the passive voice: "The report ___ by the manager yesterday."','GRA',[['wrote',1],['was written',4],['had written',1],['has been wrote',1]]],
        [9,'"Benchmark" in business means:','VOC',[['financial loss',1],['standard for comparison',4],['employee evaluation',1],['marketing campaign',1]]],
        [10,'Choose the correct form: "She ___ working here since 2019."','GRA',[['is',1],['was',1],['has been',4],['had',1]]],
      ],
    },
    {
      nombre: 'English Test — Nivel Avanzado',
      tiempo_limite: 10,
      items: [
        [1,'"Exacerbate" most nearly means:','VOC',[['to alleviate',1],['to worsen',4],['to explain',1],['to control',1]]],
        [2,'Choose: "Had she known about the problem, she ___ it sooner."','GRA',[['would solve',1],['would have solved',4],['will have solved',1],['had solved',1]]],
        [3,'Read: "The CEO\'s laconic response left the board uncertain of the company\'s direction." "Laconic" most likely means:','COM',[['enthusiastic',1],['detailed',1],['brief and unclear',4],['optimistic',1]]],
        [4,'"Synergy" in a business context refers to:','VOC',[['competition between departments',1],['combined effect greater than individual parts',4],['financial merger only',1],['conflict resolution',1]]],
        [5,'Select: "The proposal, along with several attachments, ___ submitted yesterday."','GRA',[['were',1],['was',4],['have been',1],['are',1]]],
        [6,'"Commensurate" means:','VOC',[['unrelated',1],['proportionate/corresponding',4],['excessive',1],['insufficient',1]]],
        [7,'Choose the most formal way to decline an invitation in a business email:','COM',[
          ['"No, I can\'t go."',1],
          ['"I regret to inform you that I will be unable to attend due to a prior commitment."',4],
          ['"Sorry, busy that day."',1],
          ['"I don\'t want to come."',1],
        ]],
        [8,'"Leverage" as a verb in business means:','VOC',[['to reduce',1],['to use strategically to gain advantage',4],['to eliminate',1],['to negotiate',1]]],
        [9,'Choose the correct form: "Not only ___ the project late, but it also exceeded the budget."','GRA',[['delivered',1],['was the project delivered',4],['the project was delivered',1],['delivering',1]]],
        [10,'The phrase "to hit the ground running" means:','COM',[['to start slowly',1],['to begin immediately with full energy',4],['to fail at the start',1],['to run in meetings',1]]],
      ],
    },
  ];

  for (const nivel of niveles) {
    const dimCodes = {
      GRA: { nombre: 'Gramática', codigo: 'GRA', alta: 'Alto dominio de la gramática en inglés', baja: 'Errores gramaticales frecuentes' },
      VOC: { nombre: 'Vocabulario', codigo: 'VOC', alta: 'Vocabulario amplio y preciso', baja: 'Vocabulario limitado' },
      COM: { nombre: 'Comprensión Lectora', codigo: 'COM', alta: 'Alta comprensión de textos en inglés', baja: 'Dificultad para comprender textos' },
    };

    const pid = await insertPrueba(client, {
      nombre: nivel.nombre,
      descripcion: 'Evalúa gramática, vocabulario y comprensión lectora en inglés.',
      tipo: 'tecnica',
      instrucciones: 'Select the best answer for each question. Work quickly and accurately.',
      tiempo_limite: nivel.tiempo_limite,
      total_items: 10,
      escala_tipo: 'multiple',
      categoria: 'tecnica',
    });

    const dimIds = {};
    let o = 1;
    for (const d of Object.values(dimCodes)) {
      dimIds[d.codigo] = await insertDim(client, pid, d, o++);
    }

    for (const [orden, texto, dim, opciones] of nivel.items) {
      const iid = await insertItem(client, pid, dimIds[dim], texto, orden);
      for (let k = 0; k < opciones.length; k++) {
        await insertOpcion(client, iid, opciones[k][0], opciones[k][1], k + 1);
      }
    }
  }
}

// ══════════════════════════════════════════════════════════
// 24. CPI — Inventario Psicológico de California (subset)
// ══════════════════════════════════════════════════════════
async function seedCPI(client) {
  console.log('  → CPI...');
  const pid = await insertPrueba(client, {
    nombre: 'CPI — Inventario Psicológico de California',
    descripcion: 'Evalúa características favorables de personalidad orientadas a la adaptación social efectiva y selección de cargos directivos.',
    tipo: 'personalidad',
    instrucciones: 'Indique si cada afirmación es Verdadera (V) o Falsa (F) con respecto a usted.',
    tiempo_limite: 40,
    total_items: 30,
    escala_tipo: 'multiple',
    categoria: 'personalidad',
  });

  const dims = [
    { nombre: 'Dominio Social', codigo: 'DOM', alta: 'Alta capacidad para liderar e influir en grupos', baja: 'Poca iniciativa y dominio social' },
    { nombre: 'Sociabilidad', codigo: 'SY', alta: 'Muy sociable, participativo y extrovertido', baja: 'Introvertido y reservado' },
    { nombre: 'Presencia Social', codigo: 'SP', alta: 'Confiado, verbalmente fluido e impresionante', baja: 'Baja presencia social' },
    { nombre: 'Autoaceptación', codigo: 'SA', alta: 'Alta autoestima y aceptación personal', baja: 'Baja autoestima e inseguridad' },
    { nombre: 'Responsabilidad', codigo: 'RE', alta: 'Confiable, responsable y honesto', baja: 'Irresponsable o poco confiable' },
    { nombre: 'Socialización', codigo: 'SO', alta: 'Bien adaptado socialmente, íntegro', boja: 'Poca adaptación social' },
  ];
  const dimIds = {};
  for (let i = 0; i < dims.length; i++) {
    dimIds[dims[i].codigo] = await insertDim(client, pid, dims[i], i + 1);
  }

  const addVF = async (itemId, valorV, valorF) => {
    await insertOpcion(client, itemId, 'Verdadero', valorV, 1);
    await insertOpcion(client, itemId, 'Falso', valorF, 2);
  };

  const items = [
    [1,'Me gusta organizar actividades y ser el líder de grupos.','DOM',5,1],
    [2,'Cuando hay que tomar decisiones en un grupo, suelo ser yo quien propone el camino.','DOM',5,1],
    [3,'Prefiero dejar que otros tomen la iniciativa en situaciones nuevas.','DOM',1,5],
    [4,'Tengo mucha confianza en mí mismo/a en situaciones sociales.','DOM',5,1],
    [5,'Disfruto estar con mucha gente en eventos y fiestas.','SY',5,1],
    [6,'Tengo muchos amigos y conocidos.','SY',5,1],
    [7,'Me resulta fácil acercarme a personas que no conozco.','SY',5,1],
    [8,'Generalmente me siento cómodo/a en situaciones sociales nuevas.','SY',5,1],
    [9,'La gente generalmente me percibe como seguro/a y elocuente.','SP',5,1],
    [10,'Me expreso bien tanto en conversación como por escrito.','SP',5,1],
    [11,'Sé cómo causar una buena impresión en personas nuevas.','SP',5,1],
    [12,'Rara vez me pongo nervioso/a al hablar en público.','SP',5,1],
    [13,'Me acepto tal como soy, incluyendo mis limitaciones.','SA',5,1],
    [14,'Tengo una imagen positiva de mí mismo/a.','SA',5,1],
    [15,'No necesito aprobación constante de otros para sentirme bien.','SA',5,1],
    [16,'Me siento satisfecho/a con lo que he logrado hasta ahora.','SA',5,1],
    [17,'Siempre cumplo con mis compromisos, incluso cuando es difícil.','RE',5,1],
    [18,'Me siento culpable cuando no cumplo con mis obligaciones.','RE',5,1],
    [19,'La honestidad es una de mis principales características.','RE',5,1],
    [20,'Nunca miento aunque la verdad sea difícil.','RE',5,1],
    [21,'Rara vez me meto en problemas con figuras de autoridad.','SO',5,1],
    [22,'Respeto las reglas aunque no esté completamente de acuerdo con ellas.','SO',5,1],
    [23,'No tengo tendencia a hacer cosas impulsivas de las que luego me arrepiento.','SO',5,1],
    [24,'Mi comportamiento social ha sido generalmente aceptable y apropiado.','SO',5,1],
    [25,'Me gusta estar al frente en situaciones de grupo.','DOM',5,1],
    [26,'La gente me busca para pedir consejos o guía.','DOM',5,1],
    [27,'Puedo influir fácilmente en otros para que adopten mi punto de vista.','SP',5,1],
    [28,'Soy una persona muy organizada y metódica.','RE',5,1],
    [29,'Generalmente confío en la gente hasta que me demuestran que no debo.','SO',5,1],
    [30,'Me siento a gusto en mi propio cuerpo y con mi apariencia.','SA',5,1],
  ];
  for (const [orden, texto, dim, vV, vF] of items) {
    const iid = await insertItem(client, pid, dimIds[dim], texto, orden);
    await addVF(iid, vV, vF);
  }
}

// ══════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════
async function main() {
  const client = await pool.connect();
  try {
    console.log('\n🚀 Iniciando seed — Banco de Pruebas Aptia...\n');
    await client.query('BEGIN');

    await seedTMMS(client);
    await seedBigFive(client);
    await seedGordon(client);
    await seedAllport(client);
    await seedMoss(client);
    await seedZavic(client);
    await seedLuscher(client);
    await seedKostick(client);
    await seedLifo(client);
    await seedCompeGeneral(client);
    await seedCompeAvanzado(client);
    await seedCompeSAC(client);
    await seedCompeVentas(client);
    await seedCompeVentasGerencial(client);
    await seedIPV(client);
    await seedKuder(client);
    await seedMAT(client);
    await seedRaven(client);
    await seedWonderlic(client);
    await seedBarsit(client);
    await seedTerman(client);
    await seed16PF(client);
    await seedEnglish(client);
    await seedCPI(client);

    await client.query('COMMIT');

    console.log('\n✅ Seed completado exitosamente.');
    console.log('   24 pruebas insertadas con dimensiones, items y opciones.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error en seed, rollback ejecutado:', err.message);
    throw err;
  } finally {
    client.release();
    // No cerramos el pool ya que es el pool compartido del proyecto
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
