import type { LibraryScene } from '../types';
import parabolaRise from './parabola-rise';
import permutationsVsCombinations from './permutations-vs-combinations';

const scenes = [parabolaRise, permutationsVsCombinations] as const;

const bySlug = new Map<string, LibraryScene>(
  scenes.map((scene) => [scene.slug, scene])
);

if (bySlug.size !== scenes.length) {
  throw new Error('Duplicate library scene slug');
}

export const libraryScenes: readonly LibraryScene[] = scenes;

export const publicLibraryScenes = libraryScenes.filter(
  (scene) => scene.publication === 'public'
);

export function getLibraryScene(slug: string): LibraryScene | undefined {
  const scene = bySlug.get(slug);
  return scene?.publication === 'public' ? scene : undefined;
}
