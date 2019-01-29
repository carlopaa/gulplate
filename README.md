# Gulplate

Gulp based build system for developing html templates

## Features
- Sass w/ auto prefixer
- ES6 to ES5 compiler
- Browsersync for live reload and synchronised browser testing.
- Minify css and javascript
- Purgecss to removes unused css rules
- Extracts `package.json` dependencies
- Jade / Pug templating
- Image optimization
- Adds (project, url, author, comment, version) comment header in your css and js files
- Bootstrap 4, PopperJS and jQuery included by default

#### Installation
Use the [gulplate-generator](https://www.npmjs.com/package/gulplate-generator)

```bash
npm install gulplate-generator --global
```

### Usage

##### Creating a new project

```bash
gulplate
```
This will ask some questions (project name, author, version, license, etc). This will be saved on the `package.json`.

#### Development

```bash
npm run dev
```
This will setup a server @ `localhost:3000` and all changes with be watched automatically.

#### Production

```bash
npm run build
```
This will just remove all unused css rules, javascript `console.log`, `alert` and `debugger`

#### Notes

- Running `npm run` `dev` or `build` generates a dist folder where all compiled css, js, images and html are extracted.
- The `css` and `javascript` files will have a comment on top matching the data on the `package.json`. (name, version, author, license and homepage) are used.
- `dist/assets/vendor` folder is an extraction of `npm dependencies` that are specified on the `package.json`.
