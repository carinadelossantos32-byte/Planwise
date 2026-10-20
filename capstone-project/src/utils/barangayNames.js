export const normalizeBarangayName = (name) =>
  (name ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // drops accents (ñ -> n)
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ') // drops "(Pob.)" and similar
    .replace(/\bsto\b\.?/g, 'santo')
    .replace(/\bsta\b\.?/g, 'santa')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
