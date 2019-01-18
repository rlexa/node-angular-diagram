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

module.exports = { toPuml };
