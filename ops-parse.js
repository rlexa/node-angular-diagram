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
                let depCandidate = tokens[ii + 1].replace(/\)/g, '').trim();
                let iNested = -1;
                do {
                  iNested = depCandidate.indexOf('<');
                  if (iNested < 0) {
                    deps.push(depCandidate);
                  } else {
                    deps.push(depCandidate.substring(0, iNested));
                    depCandidate = depCandidate.substring(iNested + 1, depCandidate.length - 1);
                  }
                } while (iNested >= 0);
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

function decomment(text) {
  let iCur = -1;
  while ((iCur = text.indexOf('/*')) >= 0) {
    const iEnd = text.indexOf('*/', iCur);
    text = text.substring(0, iCur) + (iEnd < 0 ? '' : text.substring(iEnd + '*/'.length));
  }
  while ((iCur = text.indexOf('//')) >= 0) {
    const iEnd = text.indexOf('\n', iCur);
    text = text.substring(0, iCur) + (iEnd < 0 ? '' : text.substring(iEnd + '\n'.length));
  }
  return text;
}

function findClasses(text, decorator, into) {
  let iDeco = -1;
  do {
    text = decomment(text);
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
          into[clazz] = { deps: new Set(findConstructorArgs(text, iClassO)), exports: [] };

          const PREFIX_EXPORTS = 'exports: [';
          let iExportsA = text.indexOf(PREFIX_EXPORTS, iDeco);
          if (iExportsA > iDeco && iExportsA < iClassA) {
            iExportsA += PREFIX_EXPORTS.length;
            const iExportsO = text.indexOf(']', iExportsA);
            if (iExportsO > iExportsA) {
              into[clazz].exports = new Set(text.substring(iExportsA, iExportsO).split(',').map(_ => _.trim()).filter(_ => _.length > 1));
            }
          }
        }
      }
    }
  } while (iDeco >= 0);
}

module.exports = { findClasses, findConstructorArgs };
