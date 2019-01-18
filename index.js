const opsFile = require('./ops-file');
const opsPlantuml = require('./ops-plantuml');
const opsScan = require('./ops-scan');

async function writeResult(path, text) {
  try {
    await opsFile.fsWrite(path, text);
  } catch (ex) {
    console.error(`Error while writing to "${path}"`, ex);
  }
}

async function main(directory, pathOutput) {
  const msStart = Date.now();
  let ms = msStart;
  try {
    console.log(`.scanning directory "${directory}"`);
    const endsWiths = ['.ts'];
    const filepaths = await opsScan.scanDirectory(directory, endsWiths);
    console.log(`..found ${filepaths.length} ${endsWiths.join('+')} files (${Date.now() - ms}ms)`);
    ms = Date.now();

    const injectables = await opsScan.findClassesInFiles(filepaths, '@Injectable');
    console.log(`...found ${Object.keys(injectables).length} @Injectable classes (${Date.now() - ms}ms)`);
    ms = Date.now();

    const directives = await opsScan.findClassesInFiles(filepaths, '@Directive');
    console.log(`...found ${Object.keys(directives).length} @Directive classes (${Date.now() - ms}ms)`);
    ms = Date.now();

    const components = await opsScan.findClassesInFiles(filepaths, '@Component');
    console.log(`...found ${Object.keys(components).length} @Component classes (${Date.now() - ms}ms)`);
    ms = Date.now();

    const modules = await opsScan.findClassesInFiles(filepaths, '@NgModule');
    console.log(`...found ${Object.keys(modules).length} @NgModule classes (${Date.now() - ms}ms)`);
    ms = Date.now();

    const puml = opsPlantuml.toPuml(components, directives, injectables, modules);

    await writeResult(pathOutput, puml);
    console.log(`.write to ${pathOutput} (${Date.now() - ms}ms)`);
    ms = Date.now();

    console.log(`done (${Date.now() - msStart}ms)`);
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
