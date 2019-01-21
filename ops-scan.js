'use strict';

const path = require('path');
const opsFile = require('./ops-file');
const opsParse = require('./ops-parse');

async function scanDirectoryInto(directory, into, suffixes) {
  try {
    const files = await opsFile.fsScan(directory);
    for (const file of files) {
      const filepath = path.join(directory, file);
      const stats = await opsFile.fsStat(filepath);
      if (stats.isFile() && (!suffixes || suffixes.some(suffix => filepath.endsWith(suffix)))) {
        into.push(filepath);
      } else if (stats.isDirectory()) {
        await scanDirectoryInto(filepath, into, suffixes);
      }
    }
  } catch (ex) {
    console.error(`Error while scanning "${directory}"`, ex);
  }
}

async function scanDirectory(directory, onlyEndsWiths) {
  const paths = [];
  try {
    await scanDirectoryInto(directory, paths, onlyEndsWiths);
  } catch (ex) {
    console.error(`Error while scanning "${directory}"`, ex);
  }
  return paths;
}

async function findClassesInFile(file, decorator, into) {
  try {
    const text = (await opsFile.fsRead(file)) + '';
    opsParse.findClasses(text, decorator, into);
  } catch (ex) {
    console.error(`Error while searching for classes decorated with "${decorator}" in "${file}"`, ex);
  }
}

async function findClassesInFiles(files, decorator) {
  const classToFilepath = {};
  try {
    for (const file of files) {
      await findClassesInFile(file, decorator, classToFilepath);
    }
  } catch (ex) {
    console.error(`Error while searching for classes decorated with "${decorator}"`, ex);
  }
  return classToFilepath;
}

module.exports = { scanDirectory, findClassesInFiles };
