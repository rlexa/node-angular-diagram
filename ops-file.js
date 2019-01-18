const fs = require('fs');

const fsRead = path => new Promise((ack, nak) => fs.readFile(path, 'utf8', (err, data) => err ? nak(err) : ack(data)));
const fsScan = directory => new Promise((ack, nak) => fs.readdir(directory, (err, files) => err ? nak(err) : ack(files)));
const fsStat = path => new Promise((ack, nak) => fs.stat(path, (err, stats) => err ? nak(err) : ack(stats)));
const fsWrite = (path, text) => new Promise((ack, nak) => fs.writeFile(path, text, 'utf8', err => err ? nak(err) : ack()));

module.exports = { fsRead, fsScan, fsStat, fsWrite };
