import path from 'path';
import { promises as fs } from 'fs';
import { TEST_DIR } from './setup.js';
import JsonDatabaseService from '../src/services/json-database.js';

describe('Rich Text and Image Support', () => {
  let dbService;
  let testDbPath;

  beforeEach(async () => {
    const testId = Date.now();
    testDbPath = path.join(TEST_DIR, `pim.test.${testId}.json`);
    dbService = new JsonDatabaseService(testDbPath);
    await dbService.initialize();
  });

  afterEach(async () => {
    if (dbService?.isInitialized()) {
      await dbService.close();
    }
  });

  test('stores markdown content correctly', async () => {
    const content = {
      raw: '# Test Entry\nWith *markdown* content',
      markdown: '# Test Entry\nWith *markdown* content',
      images: []
    };

    const id = await dbService.addEntry({
      raw_content: content.raw,
      markdown: content.markdown,
      content
    });

    const entry = await dbService.getEntry(id);
    expect(entry.content.raw).toBe(content.raw);
    expect(entry.content.markdown).toBe(content.markdown);
  });

  test('handles image uploads', async () => {
    const id = await dbService.addEntry({
      raw_content: 'Entry with image',
      markdown: 'Entry with image',
      content: {
        raw: 'Entry with image',
        markdown: 'Entry with image',
        images: []
      }
    });

    const filename = 'test.png';
    const imageBuffer = Buffer.from('test image data');

    const imageInfo = await dbService.addImage(id, imageBuffer, filename);
    expect(imageInfo.id).toBeDefined();
    expect(imageInfo.filename).toBe(filename);
    expect(imageInfo.path).toContain(filename);

    const entry = await dbService.getEntry(id);
    expect(entry.content.images).toHaveLength(1);
    expect(entry.content.images[0].filename).toBe(filename);

    const imagePath = entry.content.images[0].path;
    const imageExists = await fs.access(imagePath).then(() => true).catch(() => false);
    expect(imageExists).toBe(true);

    // Verify markdown was updated
    expect(entry.content.markdown).toContain(`![${filename}](${path.basename(imagePath)})`);
  });

  test('deletes images when entry is deleted', async () => {
    const id = await dbService.addEntry({
      raw_content: 'Entry with image',
      markdown: 'Entry with image',
      content: {
        raw: 'Entry with image',
        markdown: 'Entry with image',
        images: []
      }
    });

    const filename = 'test.png';
    await dbService.addImage(id, Buffer.from('test image'), filename);

    // Get image path
    const entry = await dbService.getEntry(id);
    const imagePath = path.join(path.dirname(testDbPath), entry.content.images[0].path);

    // Delete entry
    await dbService.deleteEntry(id);

    // Verify image was deleted
    const imageExists = await fs.access(imagePath).then(() => true).catch(() => false);
    expect(imageExists).toBe(false);
  });

  test('backs up images with database', async () => {
    const id = await dbService.addEntry({
      raw_content: 'Entry with image',
      markdown: 'Entry with image',
      content: {
        raw: 'Entry with image',
        markdown: 'Entry with image',
        images: []
      }
    });

    const filename = 'test.png';
    await dbService.addImage(id, Buffer.from('test image'), filename);

    // Create backup
    const backupPath = path.join(TEST_DIR, 'backup.json');
    await dbService.backup(backupPath);

    // Verify backup includes images
    const entry = await dbService.getEntry(id);
    const originalImagePath = entry.content.images[0].path;
    const backupImagePath = path.join(path.dirname(backupPath), 'media', path.basename(originalImagePath));

    const backupImageExists = await fs.access(backupImagePath).then(() => true).catch(() => false);
    expect(backupImageExists).toBe(true);

    // Verify backup image content matches
    const originalImage = await fs.readFile(originalImagePath);
    const backupImage = await fs.readFile(backupImagePath);
    expect(backupImage).toEqual(originalImage);
  });
});
