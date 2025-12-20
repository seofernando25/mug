import { type } from 'arktype';

export const uploadJobSchema = type({
	jobId: 'string>0',
	userId: 'string>0',
	s3Key: 'string>0'
});

export type UploadJob = typeof uploadJobSchema.infer;
export const assertUploadJob = uploadJobSchema.assert;
