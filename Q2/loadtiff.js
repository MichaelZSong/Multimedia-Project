jQuery(function ($) {
    // Make button trigger input
    $('#openimg').click(function () {
        $("#chooseFile").click();
    });

    $('#chooseFile').change(function (event) {
        var file = event.target.files[0];
        if (!file) {
            return;
        }

        if (file) {
            console.log('File:', file.name);

            var reader = new FileReader();
            reader.onload = function (e) {
                try {
                    var tiff = new Tiff({ buffer: e.target.result });
                    var canvas = tiff.toCanvas();

                    const container = $('#tiff');
                    container.empty();
                    container.addClass('p-2').append(canvas);
                } catch (error) {
                    alert('Failed to read the file.');
                }

            };

            reader.readAsArrayBuffer(file);
        }

    });
});