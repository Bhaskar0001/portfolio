const archiver = require('archiver');
const { PassThrough } = require('stream');
const logger = require('../utils/logger');

class ZipService {
    /**
     * Create a ZIP stream from multiple file buffers/streams
     * @param {Array<{name: string, content: Buffer|Stream}>} files 
     */
    async createZipBuffer(files) {
        return new Promise((resolve, reject) => {
            const bufs = [];
            const archive = archiver('zip', { zlib: { level: 9 } });
            const stream = new PassThrough();

            stream.on('data', (d) => bufs.push(d));
            stream.on('end', () => resolve(Buffer.concat(bufs)));
            stream.on('error', reject);

            archive.pipe(stream);

            for (const file of files) {
                archive.append(file.content, { name: file.name });
            }

            archive.finalize();
        });
    }
}

module.exports = new ZipService();
