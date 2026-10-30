/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { dashboardHtml } from '../dashboard';

// dashboard.ts is one template literal: test the RENDERED page, which is what the browser runs.
describe('dashboard time-of-day analytics page (rendered)', () => {
  const html = String(dashboardHtml('csrf', 'nonce'));

  it('renders the nav link and the page container', () => {
    expect(html).toContain('data-page="analytics-time"');
    expect(html).toContain('id="analytics-time-page"');
    expect(html).toContain('id="analytics-time-filters"');
    expect(html).toContain('id="analytics-time-content"');
  });

  it('routes the page to its loader and hides the domain selector there', () => {
    expect(html).toContain("else if (pageName === 'analytics-time') loadAnalyticsTimeOfDay();");
    expect(html).toContain("'analytics-time',");
  });

  it('asks the API with the viewer timezone and escapes API warnings', () => {
    expect(html).toContain("/analytics/breakdown/time-of-day?");
    expect(html).toContain('-new Date().getTimezoneOffset()');
    expect(html).toContain("escapeHtml(w)");
  });

  it('keeps the whole inline dashboard script syntactically valid', () => {
    const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.includes('loadAnalyticsTimeOfDay'));
    expect(scripts.length).toBeGreaterThan(0);
    for (const s of scripts) expect(() => new Function(s)).not.toThrow();
  });
});
