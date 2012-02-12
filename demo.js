window.onload = (function(){
  setDragAndDropEvent();
})();

function setDragAndDropEvent() {
  var droparea = document;

  droparea.addEventListener('drop', function(e) {
    var file = e.dataTransfer.files[0];
    var reader = new FileReader();
    var i;
    var img = document.getElementById('target');

    var createObjectURL =
      (window.URL && window.URL.createObjectURL)
    ? function(f){ return window.URL.createObjectURL(f); }
    : (window.webkitURL && window.webkitURL.createObjectURL)
    ? function(f){ return window.webkitURL.createObjectURL(f); }
    : undefined;

    if (!createObjectURL) {
      throw new Error('no impl');
    }

    img.addEventListener('load', onImageLoaded);
    img.src = createObjectURL(file);

    e.preventDefault();
  }, false);

  droparea.addEventListener('dragover', function(e) {
    e.preventDefault();
  }, false);
}

function onImageLoaded(ev) {
  var img = this;
  var cc = ColorCurve.loadFromString([
    "# GIMP Curves File",
    "0 0 -1 -1 31 11 -1 -1 63 37 -1 -1 95 80 -1 -1 127 129 -1 -1 159 179 -1 -1 191 222 -1 -1 223 246 -1 -1 255 255 ",
    "0 0 -1 -1 31 33 -1 -1 63 55 -1 -1 95 40 -1 -1 127 79 -1 -1 159 160 -1 -1 191 193 -1 -1 223 225 -1 -1 255 255 ",
    "0 0 -1 -1 31 65 -1 -1 63 57 -1 -1 95 86 -1 -1 127 114 -1 -1 159 99 -1 -1 191 114 -1 -1 223 181 -1 -1 255 255 ",
    "0 0 -1 -1 31 61 -1 -1 63 138 -1 -1 95 118 -1 -1 127 109 -1 -1 159 64 -1 -1 191 38 -1 -1 223 117 -1 -1 255 255 ",
    "0 0 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 255 255 "
  ].join("\n"));

  var result = document.getElementById('result');

  // clear result
  while (result.hasChildNodes()) { result.removeChild(result.firstChild); }

  var width = img.width,
      height = img.height;

  var canvas = document.createElement('canvas');
  canvas.setAttribute('width', width);
  canvas.setAttribute('height', height);
  result.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  var imagedata = ctx.getImageData(0, 0, width, height);
  var pixelarray = imagedata.data;
  var x, y, i;
  var red, green, blue;
  for (y = 0; y < height; y++) {
    for (x = 0; x < width; x++) {
      i = (x + y * width) * 4;
      red   = pixelarray[i + 0];
      green = pixelarray[i + 1];
      blue  = pixelarray[i + 2];

      // grayscale
      if (document.forms['option'].elements['grayscale'].checked) {
        red = green = blue = grayscale(red, green, blue);
      }

      color = cc.fromRGBA(red, green, blue, pixelarray[i + 3]);
      pixelarray[i + 0] = color[0];
      pixelarray[i + 1] = color[1];
      pixelarray[i + 2] = color[2];
      pixelarray[i + 3] = color[3];
    }
  }
  ctx.putImageData(imagedata, 0, 0);
}

// ‹P“x•ÏŠ·
function grayscale(red, green, blue) {
  var RedWeight = 0.29891;
  var GreenWeight = 0.58661;
  var BlueWeight = 0.11448;
  var y = red *  RedWeight + green * GreenWeight + blue * BlueWeight + 0.0001;

  return (y > 255 ? 255 : y) >>> 0;
}

/* vim:set expandtab ts=2 sw=2 tw=80: */
