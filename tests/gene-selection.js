function check(condition, message) { if (!condition) throw new Error(message); }
check(HGNC_GENES.length > 40000, 'Catálogo completo de símbolos aprobados');
check(new Set(HGNC_GENES.map(g => g[0])).size === HGNC_GENES.length, 'Sin duplicados');
for (const symbol of ['BRCA1', 'BRCA2', 'TP53', 'APC', 'MLH1', 'MSH2', 'PALB2', 'CHEK2']) check(approvedGene(symbol) === symbol, 'Gen conocido ' + symbol);
check(approvedGene(' brca1 ') === 'BRCA1', 'Normalización oficial');
check(!geneError('') && !geneError('  '), 'Campo opcional');
check(geneError('NO_EXISTE_123'), 'Rechazar símbolos desconocidos');
check(searchGenes('brca1')[0][0] === 'BRCA1', 'Coincidencia exacta primero');
check(searchGenes('BRCA').some(g => g[0] === 'BRCA2'), 'Buscar prefijo');
check(searchGenes('tumor protein p53').some(g => g[0] === 'TP53'), 'Buscar nombre completo');
check(searchGenes('').length === 50 && searchGenes('a').length <= 50, 'Sugerencias limitadas');
check(searchGenes('NO_EXISTE_123').length === 0, 'Búsqueda sin resultados');
// Two studies must have separate list IDs and preserve unfamiliar imported symbols.
const listeners = [];
function entry(value) {
  const field = { value, attributes: {}, setAttribute(k, v) { this.attributes[k] = v; }, setCustomValidity(v) { this.error = v; }, addEventListener(event, fn) { listeners.push([this, event, fn]); } };
  const list = { replaceChildren(...items) { this.items = items; } };
  const warning = {};
  return { field, list, warning, querySelector(selector) { return selector === '[data-field="gene"]' ? field : selector === '.gene-options' ? list : warning; } };
}
const document = { createElement() { return {}; } };
const first = entry('brca1'), second = entry('ANTIGUO_123');
bindGeneSelection(first); bindGeneSelection(second);
check(first.field.value === 'BRCA1' && !first.field.error && first.warning.hidden, 'Normalizar al cargar');
check(first.list.id !== second.list.id && first.field.attributes.list === first.list.id, 'Listas independientes');
check(second.field.value === 'ANTIGUO_123' && second.field.error && !second.warning.hidden, 'Importación no reconocida visible sin pérdidas');
second.field.value = 'tp53';
listeners.filter(([field, event]) => field === second.field && event === 'change').forEach(([, , fn]) => fn());
check(second.field.value === 'TP53' && !second.field.error, 'Corregir símbolo');
print('OK: catálogo HGNC, búsqueda, selección opcional, validación e importación anterior');
