import { auth } from '$lib/server/auth.js';
import db from '$lib/server/db';
import { song, chart, chartHitObject } from '$lib/server/db/music-schema.js';
import s3Client from '$lib/server/s3/index.js';
import { error, json } from '@sveltejs/kit';
import { randomUUIDv7 } from 'bun';
import { processFileAndExtractData, type ProcessedSongData, type ConvertedHitObject } from '$lib/server/conversion';
import { createInsertSchema } from 'drizzle-arktype';
import { type } from 'arktype';

// Schema validation
const songInsertSchema = createInsertSchema(song).omit("id", "uploadDate");
const chartInsertSchema = createInsertSchema(chart).omit("id");
const chartHitObjectInsertSchema = createInsertSchema(chartHitObject).omit("id");

export async function POST({ request, locals }) {
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    const userId = session?.user?.id;

    if (!session?.user || !userId) {
        throw error(401, { message: 'Authentication required to upload songs.' });
    }

    const formData = await request.formData();
    const levelFileBlob = formData.get('levelFile');

    if (!levelFileBlob || !(levelFileBlob instanceof Blob)) {
        throw error(400, { message: 'No file uploaded under the key "levelFile".' });
    }

    let processedData: ProcessedSongData;

    try {
        processedData = await processFileAndExtractData(levelFileBlob);
    } catch (err: any) {
        console.error('Error during file processing:', err);
        throw error(400, { message: `Failed to process file: ${err.message}` });
    }

    const songUUID = randomUUIDv7();
    const audioFilename = processedData.metadata.audioFilename;
    const audioContent = processedData.audioContent;
    const audioS3Key = `songs/${songUUID}/audio/${audioFilename}`;
    let audioContentType = 'application/octet-stream';
    if (audioFilename.toLowerCase().endsWith('.mp3')) audioContentType = 'audio/mpeg';
    else if (audioFilename.toLowerCase().endsWith('.wav')) audioContentType = 'audio/wav';
    else if (audioFilename.toLowerCase().endsWith('.ogg')) audioContentType = 'audio/ogg';

    let imageS3Key: string | null = null;
    if (processedData.imageContent && processedData.metadata.imageFilename) {
        const imageFilename = processedData.metadata.imageFilename;
        imageS3Key = `songs/${songUUID}/image/${imageFilename}`;
        let imageContentType = 'application/octet-stream';
        if (imageFilename.toLowerCase().endsWith('.jpg') || imageFilename.toLowerCase().endsWith('.jpeg')) imageContentType = 'image/jpeg';
        else if (imageFilename.toLowerCase().endsWith('.png')) imageContentType = 'image/png';
        else if (imageFilename.toLowerCase().endsWith('.gif')) imageContentType = 'image/gif';

        try {
            await s3Client.write(imageS3Key, processedData.imageContent, { type: imageContentType });
        } catch (s3Err: any) {
            console.error(`Warning: Failed to upload image ${imageS3Key} to S3:`, s3Err);
            imageS3Key = null;
        }
    }

    try {
        await s3Client.write(audioS3Key, audioContent, { type: audioContentType });
    } catch (s3Err: any) {
        console.error(`Fatal Error: Failed to upload audio ${audioS3Key} to S3:`, s3Err);
        throw error(500, { message: `Failed to upload audio file to storage: ${s3Err.message || 'Unknown S3 error'}` });
    }

    const songInsertData = {
        id: songUUID,
        title: processedData.metadata.title,
        artist: processedData.metadata.artist,
        bpm: processedData.metadata.bpm,
        previewStartTime: processedData.metadata.previewStartTime ?? 0,
        audioFilename: audioFilename,
        audioS3Key: audioS3Key,
        imageS3Key: imageS3Key,
        uploaderId: userId,
        uploadDate: new Date(),
    };

    const songValidationResult = songInsertSchema(songInsertData);

    if (songValidationResult instanceof type.errors) {
        console.error('Song schema validation failed:', songValidationResult.issues);
        throw error(400, { message: 'Processed song data is invalid: ' + songValidationResult.issues.map(i => i.message).join(', ') });
    }
    const validatedSongData = songValidationResult;

    try {
        await db.transaction(async (tx) => {
            const newSong = await tx.insert(song).values(validatedSongData).returning({ id: song.id });
            const newSongId = newSong[0].id;

            for (let i = 0; i < processedData.charts.length; i++) {
                const chartData = processedData.charts[i];
                const hitObjectsForChart = processedData.hitObjects[i];

                const chartValidationResult = chartInsertSchema({
                    songId: newSongId,
                    difficultyName: chartData.difficultyName || 'Unknown Difficulty',
                    lanes: chartData.lanes || 4,
                    noteScrollSpeed: chartData.noteScrollSpeed ?? 1.0,
                    lyrics: chartData.lyrics ?? null,
                });

                if (chartValidationResult instanceof type.errors) {
                    console.error(`Chart ${i} schema validation failed:`, chartValidationResult.summary);
                    tx.rollback();
                    throw new Error(`Processed chart data for chart ${i} is invalid: ${chartValidationResult.summary}`);
                }
                const validatedChartData = chartValidationResult;

                const newChart = await tx.insert(chart).values(validatedChartData).returning({ id: chart.id });
                const newChartId = newChart[0].id;

                if (hitObjectsForChart && Array.isArray(hitObjectsForChart) && hitObjectsForChart.length > 0) {
                    const hitObjectInserts = hitObjectsForChart.map((ho: ConvertedHitObject) => {
                        const hoValidationResult = chartHitObjectInsertSchema({
                            chartId: newChartId,
                            time: ho.time,
                            lane: ho.lane,
                            note_type: ho.type,
                            duration: ho.duration ?? null,
                        });

                        if (hoValidationResult instanceof type.errors) {
                            console.error(`Hit object validation failed for chart ${i}, time ${ho.time}:`, hoValidationResult.issues);
                            throw new Error(`Processed hit object data for chart ${i}, time ${ho.time} is invalid.`);
                        }
                        return hoValidationResult;
                    });

                    await tx.insert(chartHitObject).values(hitObjectInserts);
                }
            }
        });

        return json({ success: true, message: `Song "${processedData.metadata.title}" installed successfully!`, title: processedData.metadata.title });

    } catch (err: any) {
        console.error('Error during DB transaction:', err);
        const statusCode = err.message.startsWith('Processed') || err.message.startsWith('Invalid') ? 400 : 500;
        throw error(statusCode, { message: 'Failed to install song: ' + err.message });
    }
}