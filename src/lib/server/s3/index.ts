import { S3Client } from 'bun';

const {
	S3_ENDPOINT,
	S3_ACCESS_KEY_ID,
	S3_SECRET_ACCESS_KEY,
	S3_REGION,
	S3_BUCKET,
} = process.env;

if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_REGION || !S3_BUCKET) {
	throw new Error("S3 environment variables are missing");
}

const s3Client = new S3Client({
	endpoint: S3_ENDPOINT,
	accessKeyId: S3_ACCESS_KEY_ID,
	secretAccessKey: S3_SECRET_ACCESS_KEY,
	region: S3_REGION,
	bucket: S3_BUCKET,
});

export default s3Client;