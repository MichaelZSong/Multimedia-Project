function AudioFileRequest(file, async) {
    this.file = file;
    if (typeof async == 'undefined' || async == null) {
        async = true;
    }
    this.async = async;

    this.extension = this.getFileExtension(file.name);
}

AudioFileRequest.prototype.getFileExtension = function (filename) {
    var splitName = filename.split('.');
    return splitName[splitName.length - 1].toLowerCase();
}

AudioFileRequest.prototype.onSuccess = function (decoded) {
};

AudioFileRequest.prototype.onFailure = function () {
    alert('Failed to read the file.');
};

AudioFileRequest.prototype.send = function () {
    if (this.extension != 'wav') {
        this.onFailure();
        return;
    }

    var reader = new FileReader();
    reader.onload = function (event) {
        this.handleResponse(event.target.result);
    }.bind(this);
    reader.onerror = function () {
        this.onFailure();
    }.bind(this);

    reader.readAsBinaryString(this.file);
};

AudioFileRequest.prototype.handleResponse = function (data) {
    var decoder, decoded;
    if (this.extension == 'wav') {
        decoder = new WAVDecoder();
        decoded = decoder.decode(data);
    }
    this.onSuccess(decoded);
};

function Decoder() {
}

Decoder.prototype.readString = function (data, offset, length) {
    return data.slice(offset, offset + length);
};

Decoder.prototype.readIntL = function (data, offset, length) {
    var value = 0;
    for (var i = 0; i < length; i++) {
        value = value + ((data.charCodeAt(offset + i) & 0xFF) *
            Math.pow(2, 8 * i));
    }
    return value;
};

Decoder.prototype.readChunkHeaderL = function (data, offset) {
    var chunk = {};
    chunk.name = this.readString(data, offset, 4);
    chunk.length = this.readIntL(data, offset + 4, 4);
    return chunk;
};

Decoder.prototype.readIntB = function (data, offset, length) {
    var value = 0;
    for (var i = 0; i < length; i++) {
        value = value + ((data.charCodeAt(offset + i) & 0xFF) *
            Math.pow(2, 8 * (length - i - 1)));
    }
    return value;
};

Decoder.prototype.readChunkHeaderB = function (data, offset) {
    var chunk = {};
    chunk.name = this.readString(data, offset, 4);
    chunk.length = this.readIntB(data, offset + 4, 4);
    return chunk;
};

Decoder.prototype.readFloatB = function (data, offset) {
    var expon = this.readIntB(data, offset, 2);
    var range = 1 << 16 - 1;
    if (expon >= range) {
        expon |= ~(range - 1);
    }

    var sign = 1;
    if (expon < 0) {
        sign = -1;
        expon += range;
    }

    var himant = this.readIntB(data, offset + 2, 4);
    var lomant = this.readIntB(data, offset + 6, 4);
    var value;
    if (expon == himant == lomant == 0) {
        value = 0;
    }
    else if (expon == 0x7FFF) {
        value = Number.MAX_VALUE;
    }
    else {
        expon -= 16383;
        value = (himant * 0x100000000 + lomant) * Math.pow(2, expon - 63);
    }
    return sign * value;
};

function WAVDecoder(data) {
}

WAVDecoder.prototype.__proto__ = Decoder.prototype;

WAVDecoder.prototype.decode = function (data) {
    var decoded = {};
    var offset = 0;
    // Header
    var chunk = this.readChunkHeaderL(data, offset);
    offset += 8;
    if (chunk.name != 'RIFF') {
        console.error('File is not a WAV');
        return null;
    }

    var fileLength = chunk.length;
    fileLength += 8;

    var wave = this.readString(data, offset, 4);
    offset += 4;
    if (wave != 'WAVE') {
        console.error('File is not a WAV');
        return null;
    }

    while (offset < fileLength) {
        var chunk = this.readChunkHeaderL(data, offset);
        offset += 8;
        if (chunk.name == 'fmt ') {
            // File encoding
            var encoding = this.readIntL(data, offset, 2);
            offset += 2;

            if (encoding != 0x0001) {
                // Only support PCM
                console.error('Cannot decode non-PCM encoded WAV file');
                return null;
            }

            // Number of channels
            var numberOfChannels = this.readIntL(data, offset, 2);
            offset += 2;

            // Sample rate
            var sampleRate = this.readIntL(data, offset, 4);
            offset += 4;

            // Ignore bytes/sec - 4 bytes
            offset += 4;

            // Ignore block align - 2 bytes
            offset += 2;

            // Bit depth
            var bitDepth = this.readIntL(data, offset, 2);
            var bytesPerSample = bitDepth / 8;
            offset += 2;
        } else if (chunk.name == 'data') {
            // Data must come after fmt, so we are okay to use its variables here
            var length = chunk.length / (bytesPerSample * numberOfChannels);
            var channels = [];
            for (var i = 0; i < numberOfChannels; i++) {
                channels.push(new Float32Array(length));
            }

            for (var i = 0; i < numberOfChannels; i++) {
                var channel = channels[i];
                for (var j = 0; j < length; j++) {
                    var index = offset;
                    index += (j * numberOfChannels + i) * bytesPerSample;
                    // Sample
                    var value = this.readIntL(data, index, bytesPerSample);
                    // Scale range from 0 to 2**bitDepth -> -2**(bitDepth-1) to 2**(bitDepth-1)
                    var range = 1 << (bitDepth - 1);
                    if (value >= range) {
                        value |= ~(range - 1);
                    }
                    // Scale range to -1 to 1
                    channel[j] = value / range;
                }
            }
            offset += chunk.length;
        } else {
            offset += chunk.length;
        }
    }
    decoded.sampleRate = sampleRate;
    decoded.bitDepth = bitDepth;
    decoded.channels = channels;
    decoded.length = length;
    return decoded;
};
