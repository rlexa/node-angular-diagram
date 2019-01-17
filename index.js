const fs = require('fs');
const path = require('path');

const fsRead = path => new Promise((ack, nak) => fs.readFile(path, 'utf8', (err, data) => err ? nak(err) : ack(data)));
const fsScan = directory => new Promise((ack, nak) => fs.readdir(directory, (err, files) => err ? nak(err) : ack(files)));
const fsStat = path => new Promise((ack, nak) => fs.stat(path, (err, stats) => err ? nak(err) : ack(stats)));
const fsWrite = (path, text) => new Promise((ack, nak) => fs.writeFile(path, text, 'utf8', err => err ? nak(err) : ack()));

async function scanDirectoryInto(directory, into, suffixes) {
  try {
    const files = await fsScan(directory);
    for (const file of files) {
      const filepath = path.join(directory, file);
      const stats = await fsStat(filepath);
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

function findConstructorArgs(text, iClassO) {
  const deps = [];
  let iClassOpen = text.indexOf('{', iClassO);
  if (iClassOpen > iClassO) {
    iClassOpen += '{'.length;
    const iClassClose = text.indexOf('}', iClassOpen);
    if (iClassClose > iClassOpen) {
      let iConstructor = text.indexOf('constructor(', iClassOpen);
      if (iConstructor > iClassOpen && iConstructor < iClassClose) {
        iConstructor += 'constructor('.length;
        let iConstructorEnd = text.indexOf('{', iConstructor);
        if (iConstructorEnd > iConstructor && iConstructorEnd < iClassClose) {
          const constructor = text.substring(iConstructor, iConstructorEnd);
          const lines = constructor
            .split(',')
            .map(_ => _.indexOf('//') >= 0 ? _.substring(0, _.indexOf('//')) : _)
            .filter(_ => _.length >= 3);
          lines.forEach(line => {
            const tokens = line.split(' ').filter(_ => _.length);
            for (let ii = 0; ii < tokens.length - 1; ++ii) {
              if (tokens[ii].endsWith(':')) {
                deps.push(tokens[ii + 1].replace(/\)/g, '').trim());
                break;
              }
            }
          });
        }
      }
    }
  }
  return deps;
}

async function findClassesInFile(file, decorator, into) {
  try {
    const text = (await fsRead(file)) + '';
    let iDeco = -1;
    do {
      iDeco = text.indexOf(decorator, iDeco);
      if (iDeco >= 0) {
        iDeco += decorator.length;
        const PREFIX_CLASS = 'export class ';
        let iClassA = text.indexOf(PREFIX_CLASS, iDeco);
        if (iClassA > iDeco) {
          iClassA += PREFIX_CLASS.length;
          const iClassO = text.indexOf(' ', iClassA);
          if (iClassO > iClassA) {
            const clazz = text.substring(iClassA, iClassO);
            into[clazz] = { file, deps: findConstructorArgs(text, iClassO), exports: [] };

            const PREFIX_EXPORTS = 'exports: [';
            let iExportsA = text.indexOf(PREFIX_EXPORTS, iDeco);
            if (iExportsA > iDeco && iExportsA < iClassA) {
              iExportsA += PREFIX_EXPORTS.length;
              const iExportsO = text.indexOf(']', iExportsA);
              if (iExportsO > iExportsA) {
                into[clazz].exports = text.substring(iExportsA, iExportsO).split(',').map(_ => _.trim()).filter(_ => _.length > 1);
              }
            }
          }
        }
      }
    } while (iDeco >= 0);
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

async function writeResult(path, text) {
  try {
    await fsWrite(path, text);
  } catch (ex) {
    console.error(`Error while writing to "${path}"`, ex);
  }
}

function toPuml(components, directives, injectables, modules, { doPackageExternals = false, doPackageModules = false } = {}) {
  let randomSeed = 1;
  function random() {
    const x = Math.sin(randomSeed++) * 10000;
    return x - Math.floor(x);
  }

  let text = '@startuml';

  text += `
    skinparam class {
      BackgroundColor Pink
      BackgroundColor<<injectable>> Aqua
      BackgroundColor<<component>> PaleGreen
      BackgroundColor<<directive>> GreenYellow
      BackgroundColor<<module>> Thistle
    }`;

  const keysInjectables = Object.keys(injectables);
  const keysComponents = Object.keys(components);
  const keysDirectives = Object.keys(directives);

  if (doPackageExternals) {
    const keysInternal = new Set([injectables, directives, components, modules].reduce((acc, pack) => [...acc, ...Object.keys(pack)], []));
    const keysExternal = new Set([injectables, directives, components, modules].reduce((acc, pack) => [...acc, ...Object.values(pack).map(_ => _.deps)
      .reduce((acc2, deps) => [...acc2, ...deps.filter(dep => !keysInternal.has(dep))], [])], []));
    text += `\npackage "ProbablyExternal" {`;
    keysExternal.forEach(key => {
      text += `\nclass "${key}"`;
    });
    text += `\n}`;
  }

  const keysInModules = new Set();
  if (doPackageModules) {
    Object.keys(modules).forEach(key => {
      text += `\npackage "${key}" {`;
      modules[key].exports.forEach(exp => {
        keysInModules.add(exp);
        text += `\nclass "${exp}" ${keysInjectables.includes(exp) ? '<<injectable>>' : keysDirectives.includes(exp) ? '<<directive>>' : keysComponents.includes(exp) ? '<<component>>' : ''}`;
      });
      text += `\n}`;
    });
  }

  keysInjectables.filter(key => !keysInModules.has(key)).forEach(key => {
    text += `\nclass "${key}" <<injectable>>`;
  });

  keysDirectives.filter(key => !keysInModules.has(key)).forEach(key => {
    text += `\nclass "${key}" <<directive>>`;
  });

  keysComponents.filter(key => !keysInModules.has(key)).forEach(key => {
    text += `\nclass "${key}" <<component>>`;
  });

  [injectables, directives, components, modules].forEach(pack =>
    Object.keys(pack).forEach(key => pack[key].deps
      .forEach(dep => text += `\n"${key}" -${['up', 'right', 'down', 'left'][Math.floor(random() * 4)]}-* "${dep}"`)));

  text += '\n@enduml';
  return text;
}

async function main(directory, pathOutput) {
  let ms = Date.now();
  try {
    console.log(`.scanning directory "${directory}"`);
    const endsWiths = ['.ts'];
    const filepaths = await scanDirectory(directory, endsWiths);
    console.log(`..found ${filepaths.length} ${endsWiths.join('+')} files (${Date.now() - ms}ms)`);
    ms = Date.now();

    const injectables = await findClassesInFiles(filepaths, '@Injectable');
    console.log(`...found ${Object.keys(injectables).length} @Injectable classes (${Date.now() - ms}ms)`);
    ms = Date.now();

    const directives = await findClassesInFiles(filepaths, '@Directive');
    console.log(`...found ${Object.keys(directives).length} @Directive classes (${Date.now() - ms}ms)`);
    ms = Date.now();

    const components = await findClassesInFiles(filepaths, '@Component');
    console.log(`...found ${Object.keys(components).length} @Component classes (${Date.now() - ms}ms)`);
    ms = Date.now();

    const modules = await findClassesInFiles(filepaths, '@NgModule');
    console.log(`...found ${Object.keys(modules).length} @NgModule classes (${Date.now() - ms}ms)`);
    ms = Date.now();

    const puml = toPuml(components, directives, injectables, modules);

    await writeResult(pathOutput, puml);
    console.log(`.write to ${pathOutput} (${Date.now() - ms}ms)`);
    ms = Date.now();
  } catch (ex) {
    console.error('General error', ex);
  }
}

const getLinearValueOfKey = (array, key) => Array.isArray(array) && array.includes(key) ? array[array.indexOf(key) + 1] || null : null;
const getArgvOfKey = (key) => getLinearValueOfKey(process.argv, key);

let argvDirectory = getArgvOfKey('--sourcedir');
let argvOutput = getArgvOfKey('--output') || 'output.plantuml';
if (!argvDirectory) {
  console.error('Need --sourcedir parameter.');
  process.exit(1);
} else {
  main(argvDirectory, argvOutput);
}
