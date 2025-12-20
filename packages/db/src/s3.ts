import { S3Client } from 'bun';

let _s3: S3Client | null = null;

function getS3Instance() {
	if (!_s3) {
		const { S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION, S3_BUCKET } =
			process.env;

		const missing = [
			!S3_ENDPOINT && 'S3_ENDPOINT',
			!S3_ACCESS_KEY_ID && 'S3_ACCESS_KEY_ID',
			!S3_SECRET_ACCESS_KEY && 'S3_SECRET_ACCESS_KEY',
			!S3_REGION && 'S3_REGION',
			!S3_BUCKET && 'S3_BUCKET'
		].filter(Boolean);

		if (missing.length) {
			throw new Error(`S3 environment variables are missing: ${missing.join(', ')}`);
		}

		_s3 = new S3Client({
			endpoint: S3_ENDPOINT,
			accessKeyId: S3_ACCESS_KEY_ID,
			secretAccessKey: S3_SECRET_ACCESS_KEY,
			region: S3_REGION,
			bucket: S3_BUCKET
		});
	}
	return _s3;
}

// Lazy getter - only initializes when accessed
export const s3 = new Proxy({} as S3Client, {
	get(_target, prop) {
		const instance = getS3Instance();
		const value = instance[prop as keyof typeof instance];
		// Bind methods to the instance to preserve 'this' context
		if (typeof value === 'function') {
			return value.bind(instance);
		}
		return value;
	}
});
