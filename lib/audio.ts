/**
 * Utility to convert raw PCM 16-bit 24kHz audio from Gemini TTS into a standard WAV blob/base64.
 * If the input buffer already contains a valid RIFF/WAVE header, it is returned untouched.
 */
export function pcmToWavBuffer(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1): Buffer {
  // Check if buffer already starts with RIFF....WAVE
  if (
    pcmBuffer.length >= 12 &&
    pcmBuffer[0] === 0x52 && // 'R'
    pcmBuffer[1] === 0x49 && // 'I'
    pcmBuffer[2] === 0x46 && // 'F'
    pcmBuffer[3] === 0x46 && // 'F'
    pcmBuffer[8] === 0x57 && // 'W'
    pcmBuffer[9] === 0x41 && // 'A'
    pcmBuffer[10] === 0x56 && // 'V'
    pcmBuffer[11] === 0x45    // 'E'
  ) {
    return pcmBuffer;
  }

  const byteRate = sampleRate * numChannels * 2; // 16-bit = 2 bytes
  const blockAlign = numChannels * 2;
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const wavHeader = Buffer.alloc(headerSize);

  // RIFF chunk descriptor
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(totalSize - 8, 4);
  wavHeader.write('WAVE', 8);

  // "fmt " sub-chunk
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  wavHeader.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  wavHeader.writeUInt16LE(numChannels, 22); // NumChannels
  wavHeader.writeUInt32LE(sampleRate, 24); // SampleRate
  wavHeader.writeUInt32LE(byteRate, 28); // ByteRate
  wavHeader.writeUInt16LE(blockAlign, 32); // BlockAlign
  wavHeader.writeUInt16LE(16, 34); // BitsPerSample (16 bits)

  // "data" sub-chunk
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(dataSize, 40);

  return Buffer.concat([wavHeader, pcmBuffer]);
}
