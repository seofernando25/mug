import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST({ request }) {
    try {
        const formData = await request.formData();
        const songData = formData.get('songData') as Blob;
        const audioFile = formData.get('audioFile') as Blob;
        const songDir = formData.get('songDir') as string;

        if (!songData || !audioFile || !songDir) {
            return new Response('Missing required data', { status: 400 });
        }

        // Create the songs directory if it doesn't exist
        const songsDir = join(process.cwd(), 'static', 'songs');
        const songPath = join(songsDir, songDir);

        try {
            await mkdir(songPath, { recursive: true });
        } catch (error) {
            console.error('Error creating directory:', error);
            return new Response('Failed to create song directory', { status: 500 });
        }

        // Write the song.json file
        const songJsonPath = join(songPath, 'song.json');
        const songJsonBuffer = Buffer.from(await songData.arrayBuffer());
        await writeFile(songJsonPath, songJsonBuffer);

        // Write the audio file
        const audioPath = join(songPath, audioFile.name);
        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
        await writeFile(audioPath, audioBuffer);

        return new Response('Song installed successfully', { status: 200 });
    } catch (error) {
        console.error('Error installing song:', error);
        return new Response('Failed to install song', { status: 500 });
    }
} 