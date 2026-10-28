function check(condition, message) { if (!condition) throw new Error(message); }
const source = readFile('app.js');
const makeMember = new Function(source.slice(source.indexOf('const defaultMember'), source.indexOf('const state')) + '; return defaultMember;')();
const fixture = { schema_version: '0.2.0', familia: { codigo: 'PEGADO' }, miembros_familia: [{ id_familiar: '01', neoplasias: [{ diagnosisDate: '1990-02-22', ageAtDiagnosis: '0' }] }] };
const text = JSON.stringify(fixture);
check(parseFamilyImport('```json\n' + text + '\n```', makeMember).familyCode === 'PEGADO', 'Bloque de código JSON');
check(parseFamilyImport('```\n' + text + '\n```', makeMember).members.length === 1, 'Bloque sin etiqueta');
const controls = {};
function control(key) { return controls[key] ||= { value: '', disabled: false, textContent: '', addEventListener(event, fn) { this[event] = fn; } }; }
const start = source.indexOf('let pendingImport =');
const end = source.indexOf("$('#import-json').addEventListener", start);
class TestBlob { constructor(parts) { this.size = parts.join('').length; } }
const controller = new Function('$', 'defaultMember', 'parseFamilyImport', 'approvedGene', 'Blob', source.slice(start, end) + '; return { get pending() { return pendingImport; } };')(control, makeMember, parseFamilyImport, value => value, TestBlob);
const input = control('#import-json-text');
input.value = text; input.input({ target: input });
check(controller.pending.familyCode === 'PEGADO' && !control('#import-json').disabled, 'Preparar desde texto');
input.value = '{'; input.input({ target: input });
check(controller.pending === null && control('#import-json').disabled && control('#import-status').textContent.includes('válido'), 'Invalidar preparación anterior al editar');
input.value = ''; input.input({ target: input });
check(!control('#import-status').textContent && !controller.pending, 'Vaciar texto');
input.value = ' '.repeat(5 * 1024 * 1024) + text; input.input({ target: input });
check(control('#import-status').textContent.includes('5 MB') && !controller.pending, 'Límite para texto pegado');
let resolveRead;
const file = { size: text.length, text: () => new Promise(resolve => { resolveRead = resolve; }) };
const loading = control('#import-json-file').change({ target: { files: [file] } });
input.value = text.replace('PEGADO', 'ULTIMO'); input.input({ target: input });
resolveRead(text);
loading.then(() => {
 check(controller.pending.familyCode === 'ULTIMO', 'El archivo lento no reemplaza el texto más reciente');
 print('OK: pegar JSON, bloques de código, errores, tamaño y cambio de fuente');
});
