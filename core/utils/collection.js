export function uniqueBy(items, key = 'id') {
  if (!Array.isArray(items)) return [];
  const getKey = typeof key === 'function' ? key : (item) => item?.[key];
  const map = new Map();
  items.forEach((item) => {
    const value = getKey(item);
    if (value === undefined || value === null) return;
    if (!map.has(value)) map.set(value, item);
  });
  return Array.from(map.values());
}
