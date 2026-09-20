/**
 * Converts display text into the stable URL-safe portion of a public slug.
 * This stays in JavaScript so both Nest and the standalone importer use exactly
 * the same normalization rule.
 *
 * @param {string} value
 * @returns {string}
 */
export function slugify(value) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug) {
    throw new Error('A public slug cannot be empty');
  }

  return slug;
}

/**
 * @param {string} baseSlug
 * @param {Set<string>} usedSlugs
 * @returns {string}
 */
export function makeUniqueSlug(baseSlug, usedSlugs) {
  let slug = baseSlug;
  let suffix = 2;

  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  usedSlugs.add(slug);
  return slug;
}

/**
 * @param {string} name
 * @param {number} year
 * @returns {string}
 */
export function tournamentSlug(name, year) {
  return `${slugify(name).replace(/^fifa-/, '')}-${year}`;
}

/**
 * @param {string} name
 * @param {string} teamSlug
 * @param {Set<string>} usedSlugs
 * @returns {string}
 */
export function playerSlug(name, teamSlug, usedSlugs) {
  const baseSlug = slugify(name);

  return makeUniqueSlug(
    usedSlugs.has(baseSlug) ? `${baseSlug}-${teamSlug}` : baseSlug,
    usedSlugs,
  );
}

/**
 * @param {{ year: number, homeTeamSlug: string, awayTeamSlug: string, round: string, matchDate: string, kickoffTime: string | null }} match
 * @param {Set<string>} usedSlugs
 * @returns {string}
 */
export function matchSlug(match, usedSlugs) {
  const baseSlug = `${match.year}-${match.homeTeamSlug}-${match.awayTeamSlug}-${slugify(match.round)}`;

  if (!usedSlugs.has(baseSlug)) {
    return makeUniqueSlug(baseSlug, usedSlugs);
  }

  const dateSlug = match.matchDate.replace(/-/g, '');
  const kickoffSlug = match.kickoffTime
    ? match.kickoffTime.replace(/:/g, '').slice(0, 4)
    : null;
  const collisionSlug = kickoffSlug
    ? `${baseSlug}-${dateSlug}-${kickoffSlug}`
    : `${baseSlug}-${dateSlug}`;

  return makeUniqueSlug(collisionSlug, usedSlugs);
}
