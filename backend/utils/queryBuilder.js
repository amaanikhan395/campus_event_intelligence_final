function toPositiveInt(value, fallback, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function buildEventFilters(query) {
  const conditions = [];
  const params = [];

  if (query.search) {
    conditions.push('(event_name LIKE ? OR description LIKE ? OR organization_name LIKE ? OR building_name LIKE ? OR room_name LIKE ?)');
    const term = `%${query.search.trim()}%`;
    params.push(term, term, term, term, term);
  }
  if (query.category) {
    conditions.push('event_category = ?');
    params.push(query.category);
  }
  if (query.organizationId) {
    conditions.push('organization_id = ?');
    params.push(Number(query.organizationId));
  }
  if (query.zone) {
    conditions.push('campus_zone = ?');
    params.push(query.zone);
  }
  if (query.status) {
    conditions.push('status = ?');
    params.push(query.status);
  }
  if (query.from) {
    conditions.push('event_date >= ?');
    params.push(query.from);
  }
  if (query.to) {
    conditions.push('event_date <= ?');
    params.push(query.to);
  }

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

module.exports = { toPositiveInt, buildEventFilters };
