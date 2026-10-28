function check(condition, message) { if (!condition) throw new Error(message); }
const source = readFile('app.js');
const makeMember = new Function(source.slice(source.indexOf('const defaultMember'), source.indexOf('const state')) + '; return defaultMember;')();
const fixture = { schema_version: '0.2.0', familia: { codigo: 'TEST', fecha_visita: '2026-10-28' }, miembros_familia: [
 { id_familiar: '01', demografia: { nacimiento: { year: 1950 }, estado_vital_codigo: 'vivo' }, neoplasias: [{ diagnosisDate: '1990-02-22', ageAtDiagnosis: '0' }] },
 { id_familiar: '02', padre_id: '01', demografia: { nacimiento: { year: 1980 } }, genetica: [{ gene: 'BRCA5' }] }
] };
const history = parseFamilyImport(JSON.stringify(fixture), makeMember);
history.members[0].tumors[0].ageAtDiagnosis = '0';
history.members[1].genetics[0].gene = 'BRCA5';
const rules = { member: {}, tumor: {}, genetic: {}, consent: ['desconocido', 'diagnostico'] };
let issues = historyIssues(history, rules, '2026-10-28', geneError);
check(issues.some(i => i.memberId === '01' && i.key === 'ageAtDiagnosis' && i.index === 0), 'Marcar edad cero incompatible');
check(!issues.some(i => i.memberId === '01' && i.key === 'diagnosisYear'), 'No marcar año correcto');
check(issues.some(i => i.memberId === '02' && i.key === 'gene'), 'Marcar BRCA5 sin impedir importar');
history.members[0].tumors[0].ageAtDiagnosis = '40';
history.members[1].genetics[0].gene = 'BRCA1';
check(!historyIssues(history, rules, '2026-10-28', geneError).length, 'Corregir elimina incidencias');
history.members[1].birthYear = '1940';
issues = historyIssues(history, rules, '2026-10-28', geneError);
check(issues.some(i => i.memberId === '01' && i.key === 'birthYear') && issues.some(i => i.memberId === '02' && i.key === 'birthYear'), 'Marcar ambos nacimientos incompatibles');
const raw = JSON.parse(JSON.stringify(fixture));
raw.miembros_familia[0].demografia.nacimiento.year = 'desconocido';
raw.miembros_familia[0].demografia.sexo_asignado_codigo = 'valor_antiguo';
raw.miembros_familia[0].neoplasias[0].diagnosisDate = 'fecha incorrecta';
raw.miembros_familia[0].neoplasias[0].ageAtDiagnosis = '-5';
raw.familia.fecha_visita = 'sin fecha';
raw.familia.consentimiento_codigo = 'antiguo';
const imported = parseFamilyImport(JSON.stringify(raw), makeMember);
check(imported.members[0].birthYear === 'desconocido' && imported.members[0].tumors[0].diagnosisYear === 'fecha incorrecta', 'Conservar valores incorrectos para editar');
rules.member.sex = { step: 2, options: ['masculino', 'femenino', 'desconocido'] };
issues = historyIssues(imported, rules, '2026-10-28', geneError);
for (const key of ['birthYear', 'diagnosisYear', 'ageAtDiagnosis', 'sex', 'visitDate', 'consent']) check(issues.some(i => i.key === key), 'Marcar campo ' + key);
// Execute the actual navigation handlers. Navigation must never invoke save validation.
const buttons = {};
function button(key) { return buttons[key] ||= { dataset: { step: '2' }, addEventListener(event, fn) { this[event] = fn; } }; }
const navState = { currentStep: 3 };
const start = source.indexOf("$$('.step').forEach(button => button.addEventListener");
const end = source.indexOf('ensurePatientCodeField();', start);
let saved = 0, validated = 0;
new Function('state', '$', '$$', 'saveRepeatEntries', 'showStep', 'activeMember', 'validateStep', 'refreshFormValidation', source.slice(start, end))(
 navState, button, () => [button('tab')], () => saved++, step => { navState.currentStep = step; }, () => ({}), () => { validated++; return false; }, () => []);
button('tab').click(); check(navState.currentStep === 2 && validated === 0, 'Cambiar de pestaña con errores');
button('#next').click(); check(navState.currentStep === 3 && validated === 0, 'Continuar con errores');
button('#previous').click(); check(navState.currentStep === 2 && validated === 0, 'Volver con errores');
navState.currentStep = 8; button('#next').click();
check(validated === 1 && saved === 3, 'Validación estricta solo al guardar');
print('OK: JSON de prueba, campos incorrectos, corrección y navegación sin bloqueos');
