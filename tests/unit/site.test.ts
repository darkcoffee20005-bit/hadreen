import { describe, expect, it } from 'vitest';
import { copy } from '@/site/copy';
import { TEMPLATES } from '@/templates';

describe('marketing copy', () => {
  const text = JSON.stringify(copy);

  it('never offers a phone or WhatsApp number', () => {
    expect(text).not.toMatch(/whatsapp|واتساب|واتس|tel:|\+964|07\d{2}/i);
    expect(text).not.toMatch(/[0-9٠-٩]{6,}/);
  });

  it('states the one plan in Eastern Arabic numerals', () => {
    expect(copy.price.amount).toBe('٤٩ ألف دينار');
    expect(text).not.toMatch(/49|٤٩٬٠٠٠/);
  });

  it('makes no claims we cannot prove', () => {
    expect(text).not.toMatch(/الأول|أول منصة|الأفضل|تقييم|عميل|زبون سعيد|نجوم/);
  });

  it('has a label for every style tag a template uses', () => {
    for (const t of TEMPLATES) for (const tag of t.styleTags) expect(copy.tags[tag]).toBeTruthy();
  });
});
