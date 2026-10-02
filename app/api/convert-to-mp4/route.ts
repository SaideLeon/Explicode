import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  let tempInputDir = '';
  try {
    const formData = await req.formData();
    const videoFile = formData.get('video') as File | null;
    const filename = (formData.get('filename') as string) || 'codigo-explicado';

    if (!videoFile) {
      return NextResponse.json({ error: 'Nenhum arquivo de vídeo foi enviado.' }, { status: 400 });
    }

    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create unique temporary directory in os tmp
    const uniqueId = crypto.randomBytes(8).toString('hex');
    tempInputDir = path.join(os.tmpdir(), `video_convert_${uniqueId}`);
    await fs.mkdir(tempInputDir, { recursive: true });

    const inputPath = path.join(tempInputDir, 'input.webm');
    const outputPath = path.join(tempInputDir, 'output.mp4');

    await fs.writeFile(inputPath, buffer);

    // Run ffmpeg with memory-safe threads (-threads 2) and -preset veryfast + -tune animation
    // -tune animation preserves vector graphics, crisp code text edges and moving arrows,
    // while -preset veryfast delivers significantly higher quality than ultrafast with safe memory usage.
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('/usr/bin/ffmpeg', [
        '-y',
        '-threads',
        '2',
        '-i',
        inputPath,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-tune',
        'animation',
        '-crf',
        '17',
        '-threads',
        '2',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-movflags',
        '+faststart',
        outputPath,
      ]);

      let stderrData = '';
      ffmpeg.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg error (code ${code}): ${stderrData.slice(-500)}`));
        }
      });

      ffmpeg.on('error', (err) => {
        reject(err);
      });
    });

    const mp4Buffer = await fs.readFile(outputPath);

    // Clean up temp files
    try {
      await fs.unlink(inputPath);
      await fs.unlink(outputPath);
      await fs.rmdir(tempInputDir);
    } catch {
      // Ignore cleanup error
    }

    const cleanFilename = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;

    return new NextResponse(mp4Buffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${cleanFilename}"`,
        'Content-Length': mp4Buffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    // Attempt cleanup on failure
    if (tempInputDir) {
      try {
        await fs.rm(tempInputDir, { recursive: true, force: true });
      } catch {
        // Ignore
      }
    }
    const message = error instanceof Error ? error.message : 'Falha na conversão para MP4';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
