const genesBySymbol = new Map(HGNC_GENES.map(gene => [gene[0].toLowerCase(), gene]));
const searchableGenes = HGNC_GENES.map(gene => ({ gene, text: `${gene[0]} ${gene[1]}`.toLowerCase() }));
function approvedGene(value) { return genesBySymbol.get(String(value || '').trim().toLowerCase())?.[0] || ''; }
function geneError(value) {
  return !String(value || '').trim() || approvedGene(value) ? '' : 'Selecciona un símbolo del listado HGNC o deja el gen vacío si se desconoce.';
}
function searchGenes(query, limit = 50) {
  const term = String(query || '').trim().toLowerCase();
  const exact = genesBySymbol.get(term);
  const results = exact ? [exact] : [];
  // Prefer symbol prefixes; names can also be searched without downloading user input.
  for (const { gene } of searchableGenes) {
    if (results.length >= limit) return results;
    if (gene !== exact && gene[0].toLowerCase().startsWith(term)) results.push(gene);
  }
  for (const { gene, text } of searchableGenes) {
    if (results.length >= limit) break;
    if (!gene[0].toLowerCase().startsWith(term) && text.includes(term)) results.push(gene);
  }
  return results;
}
let geneListNumber = 0;
function bindGeneSelection(entry) {
  const field = entry.querySelector('[data-field="gene"]');
  field.value = approvedGene(field.value) || field.value;
  const list = entry.querySelector('.gene-options');
  const warning = entry.querySelector('.gene-warning');
  list.id = `hgnc-genes-${++geneListNumber}`;
  warning.id = `${list.id}-warning`;
  field.setAttribute('list', list.id);
  field.setAttribute('aria-describedby', warning.id);
  const refresh = () => {
    list.replaceChildren(...searchGenes(field.value).map(([symbol, name]) => {
      const option = document.createElement('option');
      option.value = symbol; option.label = `${symbol} · ${name}`;
      return option;
    }));
    const error = geneError(field.value);
    field.setCustomValidity(error); field.setAttribute('aria-invalid', String(Boolean(error)));
    warning.textContent = error; warning.hidden = !error;
  };
  field.addEventListener('input', refresh);
  field.addEventListener('change', () => { field.value = approvedGene(field.value) || field.value.trim(); refresh(); });
  refresh();
}
