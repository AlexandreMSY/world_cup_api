import {
  makeUniqueSlug,
  matchSlug,
  playerSlug,
  slugify,
  tournamentSlug,
} from '../src/common/slugs/slug-utils.js';

describe('public slug utilities', () => {
  it('normalizes accents, punctuation, whitespace, and repeated hyphens', () => {
    expect(slugify('  Ronaldo Nazário!  ')).toBe('ronaldo-nazario');
    expect(slugify("Côte d'Ivoire -- 2006")).toBe('cote-divoire-2006');
  });

  it('creates deterministic collision-safe player and tournament slugs', () => {
    const usedSlugs = new Set<string>();
    expect(tournamentSlug('FIFA World Cup', 2002)).toBe('world-cup-2002');
    expect(playerSlug('Ronaldo', 'brazil', usedSlugs)).toBe('ronaldo');
    expect(playerSlug('Ronaldo', 'portugal', usedSlugs)).toBe(
      'ronaldo-portugal',
    );
    expect(playerSlug('Ronaldo', 'portugal', usedSlugs)).toBe(
      'ronaldo-portugal-2',
    );
  });

  it('keeps a meaningful match slug and adds stable collision detail', () => {
    const usedSlugs = new Set<string>();
    const match = {
      year: 2002,
      homeTeamSlug: 'brazil',
      awayTeamSlug: 'germany',
      round: 'Final',
      matchDate: '2002-06-30',
      kickoffTime: '20:00:00',
    };
    expect(matchSlug(match, usedSlugs)).toBe('2002-brazil-germany-final');
    expect(matchSlug(match, usedSlugs)).toBe(
      '2002-brazil-germany-final-20020630-2000',
    );
    expect(makeUniqueSlug('brazil', usedSlugs)).toBe('brazil');
  });
});
