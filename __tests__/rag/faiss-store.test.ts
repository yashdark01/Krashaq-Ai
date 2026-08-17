import fs from 'fs';
import os from 'os';
import path from 'path';
import { IndexFlatIP } from 'faiss-node';

describe('FAISS index round-trip', () => {
  it('writes and reads an index with inner-product search', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'krashaq-faiss-'));
    const indexPath = path.join(tmpDir, 'test.index');

    const dimension = 4;
    const index = new IndexFlatIP(dimension);

    const vectors = [
      [1, 0, 0, 0],
      [0.9, 0.1, 0, 0],
      [0, 1, 0, 0],
    ].flat();

    index.add(vectors);
    index.write(indexPath);

    const loaded = IndexFlatIP.read(indexPath);
    expect(loaded.ntotal()).toBe(3);
    expect(loaded.getDimension()).toBe(4);

    const query = [1, 0, 0, 0];
    const { labels, distances } = loaded.search(query, 2);

    expect(labels[0]).toBe(0);
    expect(distances[0]).toBeCloseTo(1, 5);
    expect(labels[1]).toBe(1);
    expect(distances[1]).toBeCloseTo(0.9, 1);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
