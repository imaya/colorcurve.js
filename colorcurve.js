/**
 * Canvas Filter using GIMP Color Curve File
 *
 * The MIT License
 *
 * Copyright (c) 2012 imaya
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * @fileoverview Canvas Filter using GIMP Color Curve File.
 */
(function(global) {

global.ColorCurve = ColorCurve;

function ColorCurve() {
  this.curve = {
    value: new Array(256),
    red: new Array(256),
    green: new Array(256),
    blue: new Array(256),
    alpha: new Array(256)
  };

  this.points = {
    value: new Array(17),
    red: new Array(17),
    green: new Array(17),
    blue: new Array(17),
    alpha: new Array(17)
  };
}

/**
 * GIMP Curves File Signature.
 * @type {string}
 */
ColorCurve.Signature = "# GIMP Curves File\n";

/**
 * channel index to channel name table.
 * @type {!Array.<string>}
 */
ColorCurve.ChannelToName = ['value', 'red', 'green', 'blue', 'alpha'];

/**
 * Load GIMP Curves File string.
 * @param {string} str GIMP Curves File string.
 */
ColorCurve.loadFromString = function(str) {
  var object = new ColorCurve(),
      buffer, bufferSize = 0xFFFF,
      pos = 0, length,
      lines, line = '', currentLine = 0,
      channel = ColorCurve.ChannelToName,
      matches, iv,
      i, j;

  // signature check
  if (ColorCurve.Signature !== str.substr(0, ColorCurve.Signature.length)) {
    throw new Error('invalid signature');
  }
  pos += ColorCurve.Signature.length;

  buffer = str.substr(pos, bufferSize);
  pos += line.length + buffer.length;

  // 行単位の処理
  lines = (line.length > 0 ? line + buffer : buffer).split("\n");
  for (i = 0, l = lines.length; i < l; i++) {
    matches = lines[i].match(/(?:-?\d+\s+){2}/g);
    if (matches.length !== 17) {
      throw new Error('invalid curves file');
    }

    // points
    for (j = 0; j < 17; j++) {
      iv = matches[j].split(/\s+/);
      object.points[channel[currentLine]][j] = {
        index: iv[0] | 0,
        value: iv[1] | 0
      };
    }

    // curves
    object.calcCurves(currentLine);

    currentLine++;
  }

  return object;
};

/**
 * calculate curve values.
 * @param {number} channel channel number.
 */
ColorCurve.prototype.calcCurves = function(channel) {
  var channelName = ColorCurve.ChannelToName[channel],
      points = this.points[channelName],
      indexes = [], length, head, last,
      i;

  // 有効な index を取得
  for (i = 0; i < 17; i++) {
    if (points[i].index !== -1) {
      indexes.push(i);
    }
  }
  length = indexes.length;
  head = indexes[0];
  last = indexes[length - 1];

  // 最初と最後をまず埋めておく
  if (indexes.length > 0) {
    // 0 ... first index
    for (i = 0; i < points[head].index; i++) {
      this.curve[channelName][i] = points[head].value;
    }
    // last index ... 256
    for (i = points[last].index; i < 256; i++) 
      this.curve[channelName][i] = points[last].value;
  }

  for (i = 0; i < length - 1; i++) {
    this.plotCurve(
      channel,
      (i === 0) ? indexes[i] : indexes[i - 1],
      indexes[i],
      indexes[i + 1],
      (i === length - 2) ? indexes[length - 1] : indexes[i + 2]
    );
  }
};

/**
 * plot curve value.
 * @param {number} channel channel number.
 * @param {number} p1 point index 1.
 * @param {number} p2 point index 2.
 * @param {number} p3 point index 3.
 * @param {number} p4 point index 4.
 */
ColorCurve.prototype.plotCurve = function(channel, p1, p2, p3, p4) {
  var channelName = ColorCurve.ChannelToName[channel],
      points = this.points[channelName],
      geometry, tmp, basis, deltas,
      d1, d2, d3,
      x, dx1, dx2, dx3,
      y, dy1, dy2, dy3,
      lastX, lastY, newX, newY,
      i;

  geometry = [
    [points[p1].index, points[p1].value, 0, 0],
    [points[p2].index, points[p2].value, 0, 0],
    [points[p3].index, points[p3].value, 0, 0],
    [points[p4].index, points[p4].value, 0, 0]
  ];

  d1 = 0.001;
  d2 = d1 * d1;
  d3 = d2 * d1;

  tmp = [
    [     0,      0,  0,  1],
    [    d3,     d2, d1,  0],
    [6 * d3, 2 * d2,  0,  0],
    [6 * d3,      0,  0,  0]
  ];

  basis = [
    [-0.5,  1.5, -1.5,  0.5],
    [ 1.0, -2.5,  2.0, -0.5],
    [-0.5,  0.0,  0.5,  0.0],
    [ 0.0,  1.0,  0.0,  0.0]
  ];

  deltas = this.compose_(tmp, this.compose_(basis, geometry));

  // x, y とその差分の決定
  x   = deltas[0][0];
  dx1 = deltas[1][0];
  dx2 = deltas[2][0];
  dx3 = deltas[3][0];
  y   = deltas[0][1];
  dy1 = deltas[1][1];
  dy2 = deltas[2][1];
  dy3 = deltas[3][1];

  // a を b と c の間に収まるようにして返す
  function clamp(a, b, c) {
    return a < b ? b :
           a > c ? c :
           a;
  }

  lastX = clamp(deltas[0][0], 0, 255);
  lastY = clamp(deltas[0][1], 0, 255);

  this.curve[channelName][lastX] = lastY;

  for (i = 0; i < 1000; i++) {
    // x, y とその差分の更新
    x   += dx1;
    dx1 += dx2;
    dx2 += dx3;
    y   += dy1;
    dy1 += dy2;
    dy2 += dy3;

    newX = clamp((x + 0.5 | 0), 0, 255);
    newY = clamp((y + 0.5 | 0), 0, 255);

    if (lastX !== newX || lastY !== newY) {
      this.curve[channelName][newX] = newY;
    }

    lastX = newX;
    lastY = newY;
  }
};

/**
 * compose matrix.
 * @param {!Object} a matrix a.
 * @param {!Object} b matrix b.
 * @return composed matrix.
 */
ColorCurve.prototype.compose_ = function(a, b) {
  var i, j, ab = [];

  for (i = 0; i < 4; i++) {
    ab[i] = [];
    for (j = 0; j < 4; j++) {
      ab[i][j] =
        a[i][0] * b[0][j] +
        a[i][1] * b[1][j] +
        a[i][2] * b[2][j] +
        a[i][3] * b[3][j];
    }
  }

  return ab;
};

/**
 * RGBA to filtered color array.
 * @param {number} red red channel value (0-255).
 * @param {number} green green channel value (0-255).
 * @param {number} blue blue value channel (0-255).
 * @param {number} alpha alpha channel value (0-255).
 * @return {Array.<number>} filtered color array.
 */
ColorCurve.prototype.fromRGBA = function(red, green, blue, alpha) {
  red    = this.curve.value[this.curve.red[red]];
  green  = this.curve.value[this.curve.green[green]];
  blue   = this.curve.value[this.curve.blue[blue]];
  alpha  = this.curve.alpha[alpha];

  return [red, green, blue, alpha];
}


})(this);

/* vim:set expandtab ts=2 sw=2 tw=80: */
