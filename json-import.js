function parseFamilyImport(text, makeMember) {
  let data;
  try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('El archivo no contiene un JSON válido.'); }
  const object = (value, label) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}: se esperaba un objeto.`);
    return value;
  };
  const scalar = (value, fallback = '') => {
    if (value == null) return fallback;
    if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Hay un campo con un tipo de dato incorrecto.');
    return String(value);
  };
  const list = (value, label) => {
    if (value == null) return [];
    if (!Array.isArray(value)) throw new Error(`${label}: se esperaba una lista.`);
    return value;
  };
  object(data, 'Historia');
  if (!['0.2.0', '0.3.0'].includes(data.schema_version)) throw new Error('Versión de JSON no compatible. Se admiten las versiones 0.2.0 y 0.3.0.');
  const family = object(data.familia, 'Familia');
  if (!Array.isArray(data.miembros_familia) || data.miembros_familia.length > 99) throw new Error('La historia debe contener una lista de hasta 99 familiares.');
  const ids = new Set();
  const members = data.miembros_familia.map(raw => {
    object(raw, 'Familiar');
    const id = scalar(raw.id_familiar);
    if (!/^(0[1-9]|[1-9][0-9])$/.test(id) || ids.has(id)) throw new Error('Los IDs de familiares deben ser únicos, entre 01 y 99.');
    ids.add(id);
    const m = makeMember(Number(id));
    const assign = (source, mapping) => Object.entries(mapping).forEach(([target, key]) => { m[target] = scalar(source[key], m[target]); });
    assign(raw, { alias: 'alias_referencia', relationship: 'parentesco', line: 'linea_familiar', fatherId: 'padre_id', motherId: 'madre_id' });

    const demo = raw.demografia == null ? {} : object(raw.demografia, 'Demografía');
    assign(demo, { sex: 'sexo_asignado_codigo', gender: 'identidad_genero_codigo', vitalStatus: 'estado_vital_codigo', deathCause: 'causa_defuncion_codigo', organs: 'organos_presentes' });
    m.birthYear = demo.nacimiento == null ? '' : scalar(object(demo.nacimiento, 'Nacimiento').year);
    m.deathYear = demo.defuncion == null ? '' : scalar(object(demo.defuncion, 'Defunción').year);
    for (const [section, mapping] of Object.entries({
      fenotipo: { phenotype: 'descripcion', skinFindings: 'estigmas_cutaneos_codigo', benignFindings: 'lesiones_benignas_codigo' },
      profilaxis: { prophylaxis: 'procedimientos', chemoprevention: 'quimioprevencion' },
      expositoma: { smoking: 'tabaco_codigo', alcohol: 'alcohol_codigo', exposures: 'detalle' }
    })) assign(raw[section] == null ? {} : object(raw[section], section), mapping);
    m.tumors = list(raw.neoplasias, 'Neoplasias').map(t => {
      object(t, 'Neoplasia');
      let year = scalar(t.diagnosisYear);
      if (!year && t.diagnosisDate) {
        const date = scalar(t.diagnosisDate);
        const parsed = new Date(`${date}T00:00:00Z`);
        const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
        year = valid ? date.slice(0, 4) : date;
      }
      const tumor = { diagnosisYear: year };
      for (const key of ['site', 'ageAtDiagnosis', 'nature', 'laterality', 'verification', 'organCheck']) tumor[key] = scalar(t[key]);
      return tumor;
    });
    m.genetics = list(raw.genetica, 'Genética').map(g => {
      object(g, 'Estudio genético');
      const study = {};
      for (const key of ['purpose', 'result', 'gene', 'hgvsC', 'classification']) study[key] = scalar(g[key]);
      return study;
    });
    return m;
  });
  return { members, familyCode: scalar(family.codigo), visitDate: scalar(family.fecha_visita), consent: scalar(family.consentimiento_codigo, 'desconocido'), notes: scalar(family.notas) };
}
