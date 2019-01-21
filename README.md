# node-angular-diagram

Playground code for simple angular project file crawler.

## Execute

- install
  - `npm i --save-dev dd-angular-graph`
- add script to `package.json` e.g.:
  - `"show_graph": "dd-angular-graph --open-svg"`
- execute in terminal
  - `npm run show_graph`

### Debugging

Clone repository and in VsCode open the `launch.json` and add the `--sourcedir <DIR>` argument for your Angular project `/src` folder then hit F5 in `index.js`. The file `output.plantuml` can then be used to generate a diagram e.g. at [plantuml.com](http://www.plantuml.com/plantuml/uml) (keep in mind that the resulting diagram could be too big for PNG so try generating SVG instead).

### Arguments
- `--sourcedir <DIR>` optional if `angular.json` is in working dir else mandatory path to `/src` dir
- `--output <FILENAME>` standard 'output', used for generating files i.e. `output.plantuml`
- `--download` will try to download SVG diagram
- `--open-svg` will try to open SVG diagram in Chrome without downloading

## Issues & TODOs

The parsing code is very simple and doesn't account for:
- modules importing other modules
- different objects with same name
- class inheritance
- interfaces (will occur as external/unknown dependencies when encountered)

## What For

Creates a plantuml code representation of the Angular project's source files by:
- searching for all `.ts` files
- extracting `@Injectable, @Directive, @Component, @NgModule` classes
  - extracting class constructor parameters as dependencies
- generating `plantuml` by flagging dependencies as composition targets