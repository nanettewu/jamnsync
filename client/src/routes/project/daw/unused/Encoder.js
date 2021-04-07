import { Mp3Encoder } from "lamejs";

class Encoder {
  constructor(config) {
    this.config = {
      sampleRate: 44100,
      bitRate: 128,
    };

    Object.assign(this.config, config);

    this.mp3Encoder = new Mp3Encoder(
      1, // # channels
      this.config.sampleRate,
      this.config.bitRate
    );

    // Audio is processed by frames of 1152 samples per audio channel
    // http://lame.sourceforge.net/tech-FAQ.txt
    this.maxSamples = 1152;

    this.samplesMono = null;
    this.clearBuffer();
  }

  /**
   * Append new audio buffer to current active buffer
   * @param {Buffer} buffer
   */
  appendToBuffer(buffer) {
    this.dataBuffer.push(new Int8Array(buffer));
  }

  /**
   * Float current data to 16 bits PCM
   * @param {Float32Array} input
   * @param {Int16Array} output
   */
  floatTo16BitPCM(input, output) {
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
  }

  /**
   * Convert buffer to proper format
   * @param {Array} arrayBuffer
   */
  convertBuffer(arrayBuffer) {
    const data = new Float32Array(arrayBuffer);
    const out = new Int16Array(arrayBuffer.length);
    this.floatTo16BitPCM(data, out);

    return out;
  }

  audioBufferToWav(aBuffer) {
    let numOfChan = aBuffer.numberOfChannels,
      btwLength = aBuffer.length * numOfChan * 2 + 44,
      btwArrBuff = new ArrayBuffer(btwLength),
      btwView = new DataView(btwArrBuff),
      btwChnls = [],
      btwIndex,
      btwSample,
      btwOffset = 0,
      btwPos = 0;
    setUint32(0x46464952); // "RIFF"
    setUint32(btwLength - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(aBuffer.sampleRate);
    setUint32(aBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(btwLength - btwPos - 4); // chunk length

    for (btwIndex = 0; btwIndex < aBuffer.numberOfChannels; btwIndex++)
      btwChnls.push(aBuffer.getChannelData(btwIndex));

    while (btwPos < btwLength) {
      for (btwIndex = 0; btwIndex < numOfChan; btwIndex++) {
        // interleave btwChnls
        btwSample = Math.max(-1, Math.min(1, btwChnls[btwIndex][btwOffset])); // clamp
        btwSample =
          (0.5 + btwSample < 0 ? btwSample * 32768 : btwSample * 32767) | 0; // scale to 16-bit signed int
        btwView.setInt16(btwPos, btwSample, true); // write 16-bit sample
        btwPos += 2;
      }
      btwOffset++; // next source sample
    }

    let wavHdr = lamejs.WavHeader.readHeader(new DataView(btwArrBuff));
    let wavSamples = new Int16Array(
      btwArrBuff,
      wavHdr.dataOffset,
      wavHdr.dataLen / 2
    );

    wavToMp3(wavHdr.channels, wavHdr.sampleRate, wavSamples);

    function setUint16(data) {
      btwView.setUint16(btwPos, data, true);
      btwPos += 2;
    }

    function setUint32(data) {
      btwView.setUint32(btwPos, data, true);
      btwPos += 4;
    }
  }

  wavToMp3(channels, sampleRate, samples) {
    var buffer = [];
    var mp3enc = new lamejs.Mp3Encoder(channels, sampleRate, 128);
    var remaining = samples.length;
    var samplesPerFrame = 1152;
    for (var i = 0; remaining >= samplesPerFrame; i += samplesPerFrame) {
      var mono = samples.subarray(i, i + samplesPerFrame);
      var mp3buf = mp3enc.encodeBuffer(mono);
      if (mp3buf.length > 0) {
        buffer.push(new Int8Array(mp3buf));
      }
      remaining -= samplesPerFrame;
    }
    var d = mp3enc.flush();
    if (d.length > 0) {
      buffer.push(new Int8Array(d));
    }

    var mp3Blob = new Blob(buffer, { type: "audio/mp3" });
    var bUrl = window.URL.createObjectURL(mp3Blob);

    // send the download link to the console
    console.log("mp3 download:", bUrl);
  }

  // ACTUAL RELEVANT API USED IN MICRECORDER

  /**
   * Clear active buffer
   */
  clearBuffer() {
    this.dataBuffer = [];
  }

  /**
   * Encode and append current buffer to dataBuffer
   * @param {Array} arrayBuffer
   */
  encode(arrayBuffer) {
    this.samplesMono = this.convertBuffer(arrayBuffer);
    let remaining = this.samplesMono.length;

    for (let i = 0; remaining >= 0; i += this.maxSamples) {
      const left = this.samplesMono.subarray(i, i + this.maxSamples);
      const mp3buffer = this.mp3Encoder.encodeBuffer(left);
      this.appendToBuffer(mp3buffer);
      remaining -= this.maxSamples;
    }
  }

  /**
   * Return full dataBuffer
   */
  finish() {
    var mp3buf = this.mp3Encoder.flush();
    if (mp3buf.length > 0) {
      this.appendToBuffer(this.mp3Encoder.flush());
    }

    return this.dataBuffer;
  }
}

export default Encoder;
