import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OtherTools } from './other-tools';
import { describe, it, expect, beforeEach } from 'vitest';

describe('OtherTools', () => {
  let component: OtherTools;
  let fixture: ComponentFixture<OtherTools>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OtherTools],
    }).compileComponents();

    fixture = TestBed.createComponent(OtherTools);
    component = fixture.componentInstance;
    component.instanceId = 'test-instance';
    fixture.detectChanges();
  });

  it('should create and load all external tools', () => {
    expect(component).toBeTruthy();
    expect(component.tools.length).toBeGreaterThanOrEqual(48);
    expect(component.categories.length).toBe(14); // 'all' + 13 categories
  });

  it('filters tools when selecting a specific category', () => {
    component.selectCategory('generators');
    expect(component.activeCategory()).toBe('generators');

    const filtered = component.filteredTools();
    expect(filtered.length).toBe(8);
    expect(filtered.every((t) => t.category === 'generators')).toBe(true);
  });

  it('filters tools when searching by name, description, or url', () => {
    component.searchQuery.set('tinypng');
    const filtered = component.filteredTools();
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toContain('TinyPNG');

    component.searchQuery.set('diff');
    const diffFiltered = component.filteredTools();
    expect(diffFiltered.some((t) => t.name.includes('Diff Checker'))).toBe(true);
  });

  it('clears search and resets category when clearSearch is called', () => {
    component.searchQuery.set('custom query');
    component.selectCategory('generators');
    component.clearSearch();

    expect(component.searchQuery()).toBe('');
    expect(component.activeCategory()).toBe('all');
    expect(component.filteredTools().length).toBe(component.tools.length);
  });

  it('toggles favorite status and updates starredTools', () => {
    const testUrl = 'https://tinypng.com/';
    expect(component.isFavorite(testUrl)).toBe(false);

    component.toggleFavorite(testUrl);
    expect(component.isFavorite(testUrl)).toBe(true);
    expect(component.starredTools().some((t) => t.url === testUrl)).toBe(true);

    component.toggleFavorite(testUrl);
    expect(component.isFavorite(testUrl)).toBe(false);
  });

  it('updates copiedUrl state when copyUrl is called', async () => {
    const testUrl = 'https://mockaroo.com/';
    await component.copyUrl(testUrl);
    expect(component.copiedUrl()).toBe(testUrl);
  });

  it('computes correct category counts and domain names', () => {
    expect(component.getCategoryCount('generators')).toBe(8);
    expect(component.getCategoryCount('speed-test')).toBe(2);
    expect(component.getDomain('https://www.diffchecker.com')).toBe('diffchecker.com');
  });
});
