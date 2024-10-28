jQuery(function ($) {
    function printInfo(decoded) {
        console.log(decoded.channels.length, 'channels');
        console.log(decoded.length, 'samples');
        console.log('Sample rate:', decoded.sampleRate);
        console.log('Bit depth:', decoded.bitDepth);

        $('#samples').text('Total Samples: ' + decoded.length);
        $('#frequency').text('Sampling Frequency: ' + decoded.sampleRate + ' Hz');

        drawWaveform(decoded);
    }

    function drawWaveform(decoded) {
        const container = $('#waveform');
        container.empty();

        const dpi = window.devicePixelRatio || 1;
        const canvasWidth = container.width() * dpi;
        const canvasHeight = 150 * dpi;

        // Find the maximum sample in the file
        let maxSample = 0;
        decoded.channels.forEach(channelData => {
            channelData.forEach(sample => {
                if (Math.abs(sample) > maxSample) {
                    maxSample = Math.abs(sample);
                }
            });
        });

        decoded.channels.forEach((channelData) => {
            const canvas = $('<canvas style="object-fit:contain;width:100%"></canvas>');
            canvas.attr({ width: canvasWidth, height: canvasHeight });
            container.append(canvas);

            const graph = canvas[0].getContext('2d');
            graph.lineWidth = 2;
            graph.strokeStyle = 'rgb(0, 0, 0)';
            graph.beginPath();

            const verticalCentre = canvasHeight / 2;

            for (let i = 0; i < channelData.length; i++) {
                const sample = channelData[i] / maxSample;  // Normalize sample
                const x = i / channelData.length * canvasWidth;  // Calculate x position based on sample relative position
                const y = (1 - sample) * verticalCentre;  // Convert sample to y position using inverted normalized sample value

                graph.lineTo(x, y);
            }

            graph.stroke();
        });
    }

    // Make button trigger input
    $('#openwav').click(function () {
        $("#chooseFile").click();
    });

    $('#chooseFile').change(function (event) {
        var file = event.target.files[0];
        if (!file) {
            return;
        }

        if (file) {
            $('#dialogModal').modal('hide');  // Close dialog
            console.log('File:', file.name);
            var request = new AudioFileRequest(file);
            request.onSuccess = printInfo;
            request.send();
        }

    });
});