function check(condition, message) { if (!condition) throw new Error(message); }
const source = readFile('app.js');
const makeMember = new Function(source.slice(source.indexOf('const defaultMember'), source.indexOf('const state')) + '; return defaultMember;')();
const member = makeMember(3);
Object.assign(member, { alias: '<img src=x onerror=alert(1)>', relationship: 'hermana', fatherId: '01', motherId: '02', birthYear: '1980', vitalStatus: 'vivo', phenotype: 'Hallazgo', skinFindings: 'presente', prophylaxis: 'Cirugía', smoking: 'nunca' });
member.tumors = [{ site: 'C50.9 · Mama', diagnosisYear: '2020', ageAtDiagnosis: '40', nature: 'primario_unico', laterality: 'izquierda', verification: 'informe_clinico', organCheck: 'Dato' }];
member.genetics = [{ purpose: 'cascada', result: 'positivo', gene: 'BRCA1', hgvsC: 'c.123A>G', classification: 'clase_5_patogenica' }];
const state = { members: [member], familyCode: 'PRUEBA', visitDate: '2026-10-28', consent: 'diagnostico', notes: 'Notas' };
const collect = new Function('state', 'saveRepeatEntries', 'internalId', source.slice(source.indexOf('function collectData()'), source.indexOf('function updateReview()')) + '; return collectData();');
const exported = collect(state, () => {}, m => `FAM_PRUEBA_${m.id}`);
const result = parseFamilyImport(JSON.stringify(exported), makeMember);
for (const key of ['alias', 'relationship', 'fatherId', 'motherId', 'birthYear', 'vitalStatus', 'phenotype', 'skinFindings', 'prophylaxis', 'smoking']) check(result.members[0][key] === member[key], 'Recuperar ' + key);
check(result.members[0].tumors[0].diagnosisYear === '2020', 'Año numérico recuperado');
check(result.members[0].genetics[0].gene === 'BRCA1' && result.notes === 'Notas', 'Genética y gestión');
const again = collect(result, () => {}, m => `FAM_PRUEBA_${m.id}`);
delete exported.generated_at; delete again.generated_at;
function canonical(value) { if (Array.isArray(value)) return value.map(canonical); if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])); return value; }
check(JSON.stringify(canonical(again)) === JSON.stringify(canonical(exported)), 'Exportar e importar conserva todos los datos');
exported.schema_version = '0.2.0';
exported.miembros_familia[0].neoplasias[0].diagnosisDate = '2020-05-15';
delete exported.miembros_familia[0].neoplasias[0].diagnosisYear;
check(parseFamilyImport(JSON.stringify(exported), makeMember).members[0].tumors[0].diagnosisYear === '2020', 'Migrar fecha antigua al año');
function rejects(value) { try { parseFamilyImport(typeof value === 'string' ? value : JSON.stringify(value), makeMember); return false; } catch { return true; } }
check(rejects('{') && rejects(null) && rejects([]), 'Rechazar JSON inválido');
check(rejects({ ...exported, schema_version: '9.0.0' }), 'Versión incompatible');
check(rejects({ ...exported, miembros_familia: [exported.miembros_familia[0], exported.miembros_familia[0]] }), 'IDs duplicados');
check(rejects({ ...exported, miembros_familia: [{ id_familiar: '01', neoplasias: {} }] }), 'Lista incorrecta');
check(rejects({ ...exported, miembros_familia: [{ id_familiar: '01', alias_referencia: {} }] }), 'Tipo incorrecto');
check(parseFamilyImport('\uFEFF' + JSON.stringify(exported), makeMember).members.length === 1, 'BOM');
print('OK: importar y exportar sin pérdidas, fechas antiguas y archivos inválidos');
