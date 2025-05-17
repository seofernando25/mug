import { json } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
    try {
        const songsDir = join(process.cwd(), 'static', 'songs');
        const songDirs = await readdir(songsDir, { withFileTypes: true });
        
        const songs = [];
        
        for (const dirent of songDirs) {
            if (dirent.isDirectory()) {
                try {
                    const songJsonPath = join(songsDir, dirent.name, 'song.json');
                    const songJson = await readFile(songJsonPath, 'utf-8');
                    const songData = JSON.parse(songJson);
                    
                    songs.push({
                        id: dirent.name,
                        title: songData.metadata.title,
                        artist: songData.metadata.artist,
                        difficulties: songData.charts.map((chart: any) => chart.difficultyName)
                    });
                } catch (error) {
                    console.error(`Error reading song data for ${dirent.name}:`, error);
                }
            }
        }
        
        return json(songs);
    } catch (error) {
        console.error('Error listing songs:', error);
        return new Response('Failed to list songs', { status: 500 });
    }
} 