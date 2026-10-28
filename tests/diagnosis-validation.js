function check(condition, message) { if (!condition) throw new Error(message); }
const now = '2026-10-28';
const person = { birthYear: '1980', vitalStatus: 'vivo', deathYear: '' };
function error(date, age, member = person) { return diagnosisError(member, { diagnosisDate: date, ageAtDiagnosis: age }, now); }
check(error('1979-12-31', ''), 'Diagnóstico anterior al nacimiento');
check(error('2026-10-29', ''), 'Diagnóstico futuro');
check(error('2025-02-29', ''), 'Fecha inexistente');
check(!error('2024-02-29', '43'), 'Fecha bisiesta válida');
check(!error('2024-02-29', '44'), 'Edad antes o después del cumpleaños');
check(error('2024-02-29', '42'), 'Edad incompatible con fecha');
check(error('', '47'), 'Edad superior a la posible hoy');
check(error('', '-1') && error('', '1.5'), 'Edad entera no negativa');
check(!error('', '0') && !error('', ''), 'Cero y desconocida');
const deceased = { ...person, vitalStatus: 'fallecido', deathYear: '2000' };
check(error('2001-01-01', '', deceased), 'Diagnóstico posterior al fallecimiento');
check(error('', '21', deceased), 'Edad superior a la alcanzable al fallecer');
check(!error('2000-12-31', '20', deceased), 'Diagnóstico en año de defunción');
check(!error('2026-01-01', '45', { ...person, deathYear: '2000' }), 'Ignorar defunción desactivada');
check(diagnosisLimits(person, now).min === '1980-01-01', 'Límites disponibles sin fecha introducida');
check(error('', '126', { birthYear: '', vitalStatus: 'desconocido' }), 'Límite general sin nacimiento');
print('OK: fechas reales, nacimiento, futuro, defunción y coherencia de edades');
