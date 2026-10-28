// Only inferred links are refreshed. Explicit edits, including empty values, persist.
const inferredParents = new WeakMap();
const manualParents = new WeakMap();
function setManualParent(member, key) {
  if (!manualParents.has(member)) manualParents.set(member, new Set());
  manualParents.get(member).add(key);
  inferredParents.get(member)?.delete(key);
}
function synchronizeFamilyLinks(members) {
  const siblings = members.filter(member => ['hermano', 'hermana'].includes(member.relationship));
  const parentRoles = {
    hermano: ['padre', 'madre'], hermana: ['padre', 'madre'],
    madre: ['abuelo_materno', 'abuela_materna'],
    padre: ['abuelo_paterno', 'abuela_paterna']
  };
  // Clear prior suggestions first so that changing a relationship removes stale links.
  members.forEach(member => {
    inferredParents.get(member)?.forEach(key => { member[key] = ''; });
    inferredParents.set(member, new Set());
  });
  const proposals = [];
  members.forEach(member => {
    const roles = parentRoles[member.relationship];
    if (!roles) return;
    ['fatherId', 'motherId'].forEach((key, index) => {
      if (member[key] || manualParents.get(member)?.has(key)) return;
      const candidates = members.filter(other => other !== member && other.relationship === roles[index]).map(other => other.id);
      if (siblings.includes(member)) {
        siblings.forEach(other => { if (other !== member && other[key]) candidates.push(other[key]); });
      }
      const unique = [...new Set(candidates)];
      if (unique.length === 1 && unique[0] !== member.id) proposals.push({ member, key, id: unique[0] });
    });
  });
  function reaches(startId, targetId, visited = new Set()) {
    if (startId === targetId) return true;
    if (visited.has(startId)) return false;
    visited.add(startId);
    const start = members.find(member => member.id === startId);
    return start ? [start.fatherId, start.motherId].filter(Boolean).some(id => reaches(id, targetId, visited)) : false;
  }
  proposals.forEach(({ member, key, id }) => {
    if (!reaches(id, member.id)) {
      member[key] = id;
      inferredParents.get(member).add(key);
    }
  });
}
