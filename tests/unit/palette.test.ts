import { describe, expect, it } from 'vitest';
import { contrastIssues, contrastRatio, readOverrides, resolvePalette } from '@/lib/palette';
import { TEMPLATE_IDS } from '@/lib/invite/types';
import { getTemplate, TEMPLATES } from '@/templates';

describe('palettes', () => {
  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
  });

  it('registers every template id exactly once', () => {
    expect(TEMPLATES.map((t) => t.id).sort()).toEqual([...TEMPLATE_IDS].sort());
  });

  for (const template of TEMPLATES) {
    for (const variant of template.paletteVariants) {
      it(`${template.id} / ${variant.id} passes AA for every text pair`, () => {
        const palette = resolvePalette(template, { variant: variant.id });
        expect(contrastIssues(palette)).toEqual([]);
      });
    }

    it(`${template.id} keeps the intro within 6–9 s and the budget within 2.5 MB`, () => {
      expect(template.intro.duration).toBeGreaterThanOrEqual(6);
      expect(template.intro.duration).toBeLessThanOrEqual(9);
      expect(template.budgetKB).toBeLessThanOrEqual(2560);
    });
  }

  it('applies variant then explicit colours, ignoring junk', () => {
    const t = getTemplate('royal-gold');
    const p = resolvePalette(t, { variant: 'gold', band: '#112233', ink: 'red', extra: 1 });
    expect(p.accent).toBe('#7A5C26');
    expect(p.band).toBe('#112233');
    expect(p.ink).toBe(t.palette.ink);
    expect(readOverrides('nope')).toEqual({});
  });
});
