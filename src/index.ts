import { Bucket, Storage } from '@google-cloud/storage';
import {
    createCustomRunner,
    initEnv,
    RemoteCacheImplementation
} from 'nx-remotecache-custom';
import { Readable } from 'stream';

interface GCSRunnerOptions {
    project_id: string;
    bucket: string;
    client_email: string;
    private_key: string;
}

export default createCustomRunner<GCSRunnerOptions>(async (options): Promise<RemoteCacheImplementation> => {
    // initialize environment variables from dotfile
    initEnv(options);
    return new GCPStorage(options);
});

class GCPStorage implements RemoteCacheImplementation {
    readonly name = 'nx-remotecache-gcp';

    private readonly bucket: Bucket;

    constructor(options: GCSRunnerOptions) {

        const projectId = options.project_id || process.env.NXCACHE_GOOGLE_STORAGE_PROJECT_ID;
        const clientEmail = options.client_email || process.env.NXCACHE_GOOGLE_STORAGE_CLIENT_EMAIL;
        const privateKey = options.private_key || process.env.NXCACHE_GOOGLE_STORAGE_PRIVATE_KEY;
        const bucketName = options.bucket || process.env.NXCACHE_GOOGLE_STORAGE_BUCKET;

        if (!bucketName) {
            throw new Error('no bucket specified');
        }

        const storage = new Storage({
            projectId,
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
            credentials: {
                client_email: clientEmail,
                private_key: privateKey
            }
        });
        this.bucket = storage.bucket(bucketName);
    }

    async fileExists(filename: string): Promise<boolean> {
        try {
            const file = this.bucket.file(filename);
            const result = await file.exists();
            return result[0];
        } catch (e: any) {
            throw new Error(e.errors[0]?.message);
        }
    }

    async retrieveFile(filename: string): Promise<NodeJS.ReadableStream> {
        try {
            const file = this.bucket.file(filename);
            return file.createReadStream();
        } catch (e: any) {
            throw new Error(e.errors[0]?.message);
        }
    }

    storeFile(filename: string, data: Readable): Promise<void> {
        try {
            const file = this.bucket.file(filename);
            return new Promise((resolve) => {
                const stream = file.createWriteStream({ resumable: false });
                data.pipe(stream);
                stream.on('finish', () => resolve());
            });
        } catch (e: any) {
            throw new Error(e.errors[0]?.message);
        }
    }

}
