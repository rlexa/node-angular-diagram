var http = require('http');
var fs = require('fs');

// TODO proxy shite...
const downloadFromTo = (url, path) => new Promise((ack, nak) => {
  try {
    const writeStream = fs.createWriteStream(path);
    http.get(url, response => {
      response.pipe(writeStream);
      writeStream.once('finish', () => ack());
    });
  } catch (ex) {
    try { fs.unlinkSync(path); } catch (ex) { }
    nak(ex);
  }
});

module.exports = { downloadFromTo };
