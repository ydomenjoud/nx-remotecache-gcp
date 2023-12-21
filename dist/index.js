"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("@google-cloud/storage");
const nx_remotecache_custom_1 = require("nx-remotecache-custom");
exports.default = (0, nx_remotecache_custom_1.createCustomRunner)(async (options) => {
    // initialize environment variables from dotfile
    (0, nx_remotecache_custom_1.initEnv)(options);
    const storage = new GCPStorage(options);
    return {
        name: storage.name,
        fileExists: (filename) => storage.fileExists(filename),
        storeFile: (filename, data) => storage.storeFile(filename, data),
        retrieveFile: (filename) => storage.retrieveFile(filename)
    };
});
class GCPStorage {
    constructor(options) {
        this.name = 'GCP Storage';
        const projectId = options.project_id || process.env.NXCACHE_GOOGLE_STORAGE_PROJECT_ID;
        const clientEmail = options.client_email || process.env.NXCACHE_GOOGLE_STORAGE_CLIENT_EMAIL;
        const privateKey = options.private_key || process.env.NXCACHE_GOOGLE_STORAGE_PRIVATE_KEY;
        const bucketName = options.bucket || process.env.NXCACHE_GOOGLE_STORAGE_BUCKET;
        if (!bucketName) {
            throw new Error('no bucket specified');
        }
        const storage = new storage_1.Storage({
            projectId,
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
            credentials: {
                client_email: clientEmail,
                private_key: privateKey
            }
        });
        this.bucket = storage.bucket(bucketName);
    }
    async fileExists(filename) {
        try {
            const file = this.bucket.file(filename);
            const result = await file.exists();
            return result[0];
        }
        catch (e) {
            throw new Error(e.errors[0]?.message);
        }
    }
    async retrieveFile(filename) {
        try {
            const file = this.bucket.file(filename);
            return file.createReadStream();
        }
        catch (e) {
            throw new Error(e.errors[0]?.message);
        }
    }
    storeFile(filename, data) {
        try {
            const file = this.bucket.file(filename);
            return new Promise((resolve) => {
                const stream = file.createWriteStream({ resumable: false });
                data.pipe(stream);
                stream.on('finish', () => resolve());
            });
        }
        catch (e) {
            throw new Error(e.errors[0]?.message);
        }
    }
}
