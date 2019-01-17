# node-angular-diagram

Playground code for simple angular project file crawler.

## HowTo

In VsCode open the `launch.json` and adjust the parameter for your Angular project `/src` folder then hit F5 in `index.js`. The file `output.plantuml` can then be used to generate a diagram e.g. at [plantuml.com](http://www.plantuml.com/plantuml/uml) (keep in mind that the resulting diagram could be too big for PNG so try generating SVG instead).

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