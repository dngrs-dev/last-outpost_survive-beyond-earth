import { describe, expect, it } from 'vitest';
import { projectSite, surfaceLabels, INITIAL_VIEW } from '../components/moonProjection';
import { moonArchive } from './fixtures/backend';

describe('Moon geographic projection', () => {
  it('puts the prime meridian at the center and east-positive longitude to the right', () => {
    const view = { longitude: 0, latitude: 0, zoom: 1 };
    expect(projectSite(0, 0, view)).toEqual({ x: 0, y: 0, z: 1 });
    expect(projectSite(0, 30, view).x).toBeGreaterThan(0);
    expect(projectSite(0, -30, view).x).toBeLessThan(0);
    expect(projectSite(0, 180, view).z).toBeLessThan(0);
  });

  it('centers every selected site, including signed southern and western coordinates', () => {
    for (const site of moonArchive.sites) {
      const point = projectSite(site.latitude, site.longitude, { ...INITIAL_VIEW, ...site });
      expect(point.x).toBeCloseTo(0);
      expect(point.y).toBeCloseTo(0);
      expect(point.z).toBeCloseTo(1);
    }
  });

  it('keeps close Apollo 12 and 14 callouts separated and inside a mobile viewport', () => {
    const labels = surfaceLabels(moonArchive.sites, INITIAL_VIEW, 320);
    const apollo12 = labels.find((point) => point.site.id === 'apollo-12')!;
    const apollo14 = labels.find((point) => point.site.id === 'apollo-14')!;
    expect(Math.abs(apollo12.labelY - apollo14.labelY)).toBeGreaterThanOrEqual(44);
    for (const label of labels) {
      expect(label.labelY).toBeGreaterThanOrEqual(24);
      expect(label.labelY).toBeLessThanOrEqual(320 - 24);
    }
  });

  it('does not show historical points through the far side of the sphere', () => {
    expect(surfaceLabels(moonArchive.sites, { longitude: 180, latitude: 0, zoom: 1 }, 500)).toEqual([]);
  });

  it('keeps callouts accessible on narrow screens throughout a rotation', () => {
    for (let longitude = -180; longitude <= 180; longitude += 10) {
      const labels = surfaceLabels(moonArchive.sites, { ...INITIAL_VIEW, longitude }, 280);
      for (const x of new Set(labels.map((point) => point.labelX))) {
        const column = labels.filter((point) => point.labelX === x).sort((a, b) => a.labelY - b.labelY);
        for (let index = 1; index < column.length; index++) {
          expect(column[index].labelY - column[index - 1].labelY).toBeGreaterThanOrEqual(44 - 1e-8);
        }
      }
    }
  });
});
