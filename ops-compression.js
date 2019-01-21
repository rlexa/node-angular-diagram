'use strict';

const pako = require('pako');

const deflate = text => pako.deflate(text, { to: 'string' });

function encode6bit(bb) {
  if (bb < 10) {
    return String.fromCharCode(48 + bb);
  }
  bb -= 10;
  if (bb < 26) {
    return String.fromCharCode(65 + bb);
  }
  bb -= 26;
  if (bb < 26) {
    return String.fromCharCode(97 + bb);
  }
  bb -= 26;
  if (bb == 0) {
    return '-';
  }
  if (bb == 1) {
    return '_';
  }
  return '?';
}

function append3bytes(b1, b2, b3) {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3F;
  let ret = '';
  ret += encode6bit(c1 & 0x3F);
  ret += encode6bit(c2 & 0x3F);
  ret += encode6bit(c3 & 0x3F);
  ret += encode6bit(c4 & 0x3F);
  return ret;
}

function encode64(data) {
  let ret = '';
  for (let ii = 0; ii < data.length; ii += 3) {
    if (ii + 2 == data.length) {
      ret += append3bytes(data.charCodeAt(ii), data.charCodeAt(ii + 1), 0);
    } else if (ii + 1 == data.length) {
      ret += append3bytes(data.charCodeAt(ii), 0, 0);
    } else {
      ret += append3bytes(data.charCodeAt(ii), data.charCodeAt(ii + 1),
        data.charCodeAt(ii + 2));
    }
  }
  return ret;
}

const compress = text => encode64(deflate(unescape(encodeURIComponent(text))));

module.exports = { compress };
