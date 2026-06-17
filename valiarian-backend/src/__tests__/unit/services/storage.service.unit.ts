import {expect} from '@loopback/testlab';
import * as fs from 'fs';
import * as path from 'path';
import {promisify} from 'util';
import {LocalStorageService} from '../../../services/storage.service';

const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

describe('LocalStorageService (unit)', () => {
  let storageService: LocalStorageService;
  const testBuffer = Buffer.from('test file content');
  const testFilename = 'test-file.txt';

  before(() => {
    storageService = new LocalStorageService();
  });

  after(async () => {
    // Clean up test files
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      // Note: This is a simple cleanup, in production you'd want more robust cleanup
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('uploadFile', () => {
    it('uploads a file and returns relative path', async () => {
      const relativePath = await storageService.uploadFile(
        testBuffer,
        testFilename,
        'images',
      );

      expect(relativePath).to.be.String();
      expect(relativePath).to.match(/media\/images\/\d{4}\/\d{2}\//);
      expect(relativePath).to.containEql(testFilename);
    });

    it('creates organized path with year/month structure', async () => {
      const relativePath = await storageService.uploadFile(
        testBuffer,
        'organized-test.txt',
        'images',
      );

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');

      expect(relativePath).to.containEql(`${year}/${month}`);
    });
  });

  describe('getFileUrl', () => {
    it('generates full URL from relative path', () => {
      const relativePath = 'media/images/2024/01/test.jpg';
      const url = storageService.getFileUrl(relativePath);

      expect(url).to.be.String();
      expect(url).to.containEql(relativePath);
      expect(url).to.match(/^http/);
    });

    it('handles paths with leading slash', () => {
      const relativePath = '/media/images/2024/01/test.jpg';
      const url = storageService.getFileUrl(relativePath);

      expect(url).to.be.String();
      expect(url).to.containEql('media/images/2024/01/test.jpg');
    });
  });

  describe('uploadFiles', () => {
    it('uploads multiple files', async () => {
      const files = [
        {buffer: testBuffer, filename: 'file1.txt', folder: 'images'},
        {buffer: testBuffer, filename: 'file2.txt', folder: 'images'},
        {buffer: testBuffer, filename: 'file3.txt', folder: 'videos'},
      ];

      const paths = await storageService.uploadFiles(files);

      expect(paths).to.have.length(3);
      expect(paths[0]).to.containEql('file1.txt');
      expect(paths[1]).to.containEql('file2.txt');
      expect(paths[2]).to.containEql('file3.txt');
      expect(paths[2]).to.containEql('videos');
    });
  });

  describe('fileExists', () => {
    it('returns true for existing file', async () => {
      // Upload a file first
      const relativePath = await storageService.uploadFile(
        testBuffer,
        'exists-test.txt',
        'images',
      );

      const url = storageService.getFileUrl(relativePath);
      const exists = await storageService.fileExists(url);

      expect(exists).to.be.true();
    });

    it('returns false for non-existing file', async () => {
      const url = storageService.getFileUrl('media/images/2024/01/nonexistent.txt');
      const exists = await storageService.fileExists(url);

      expect(exists).to.be.false();
    });
  });

  describe('deleteFile', () => {
    it('deletes an existing file', async () => {
      // Upload a file first
      const relativePath = await storageService.uploadFile(
        testBuffer,
        'delete-test.txt',
        'images',
      );

      const url = storageService.getFileUrl(relativePath);

      // Verify file exists
      let exists = await storageService.fileExists(url);
      expect(exists).to.be.true();

      // Delete file
      const deleted = await storageService.deleteFile(url);
      expect(deleted).to.be.true();

      // Verify file no longer exists
      exists = await storageService.fileExists(url);
      expect(exists).to.be.false();
    });

    it('returns true for non-existing file (idempotent)', async () => {
      const url = storageService.getFileUrl('media/images/2024/01/nonexistent.txt');
      const deleted = await storageService.deleteFile(url);

      expect(deleted).to.be.true();
    });
  });

  describe('deleteFiles', () => {
    it('deletes multiple files', async () => {
      // Upload files first
      const paths = await storageService.uploadFiles([
        {buffer: testBuffer, filename: 'multi-delete-1.txt', folder: 'images'},
        {buffer: testBuffer, filename: 'multi-delete-2.txt', folder: 'images'},
        {buffer: testBuffer, filename: 'multi-delete-3.txt', folder: 'images'},
      ]);

      const urls = paths.map(p => storageService.getFileUrl(p));

      // Delete all files
      const deletedCount = await storageService.deleteFiles(urls);

      expect(deletedCount).to.equal(3);

      // Verify files no longer exist
      for (const url of urls) {
        const exists = await storageService.fileExists(url);
        expect(exists).to.be.false();
      }
    });
  });
});
