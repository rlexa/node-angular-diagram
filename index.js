const child_process = require('child_process');
const opsFile = require('./ops-file');
const opsPlantuml = require('./ops-plantuml');
const opsScan = require('./ops-scan');
const opsCompress = require('./ops-compression');
const opsHttp = require('./ops-http');

async function writeResult(path, text) {
  try {
    await opsFile.fsWrite(path, text);
  } catch (ex) {
    console.error(`Error while writing to "${path}"`, ex);
  }
}

async function main(directory, pathOutput, { tryDownload = false, openSvg = false } = {}) {
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

    const outputPlantuml = pathOutput + '.plantuml';
    await writeResult(outputPlantuml, puml);
    console.log(`.write to ${outputPlantuml} (${Date.now() - ms}ms)`);
    ms = Date.now();

    const linkSvgPrefix = 'http://www.plantuml.com/plantuml/svg/';
    const linkSvg = linkSvgPrefix + opsCompress.compress(puml);
    console.log('\n');
    console.log(linkSvg);
    console.log('\n');
    if (tryDownload) {
      const outputSvg = pathOutput + '.svg';
      console.log(`.requesting ${linkSvgPrefix}...`);
      await opsHttp.downloadFromTo(linkSvg, outputSvg);
      console.log(`..write to ${outputSvg} (${Date.now() - ms}ms)`);
      ms = Date.now();
    }
    if (openSvg) {
      const gotoUrl = (url) => {
        const start = (process.platform == 'darwin' ? 'open -a "Google Chrome"' : process.platform == 'win32' ? 'start chrome' : 'xdg-open');
        child_process.exec(start + ' ' + url);
      }
      gotoUrl(linkSvg);
    }

    console.log(`done (${Date.now() - msStart}ms)`);
  } catch (ex) {
    console.error('General error', ex);
  }
}

const getLinearValueOfKey = (array, key) => Array.isArray(array) && array.includes(key) ? array[array.indexOf(key) + 1] || null : null;
const getArgvOfKey = (key) => getLinearValueOfKey(process.argv, key);
const hasArgv = (key) => process.argv.includes(key);

const argvDirectory = getArgvOfKey('--sourcedir');
const argvOutput = getArgvOfKey('--output') || 'output';
const argvTryDownload = hasArgv('--download');
const argvOpenSvg = hasArgv('--open-svg');
if (!argvDirectory) {
  console.error('Need --sourcedir parameter.');
  process.exit(1);
} else {
  main(argvDirectory, argvOutput, { tryDownload: argvTryDownload, openSvg: argvOpenSvg });
}
