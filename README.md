# bundleer

Bundleer is a live website bundling CLI that uses puppeteer to load your live website and detect all the javascript and css files and bundle them in proper sequence into a compact, single, obfuscated file such as bundle.js or bundle.css.

### Background

Typical bundle tools like webkit operate at build time and require you to create special config files, directory structures and other specifics for the bundling tool.
Bundleer is a bit of a different animal. It solves a slightly different use case where you want to bundle a running website based on how the browser contructs the page.

This can be useful for things like legacy or 3rd part applications that you want to bundle but for whatever reason do not have access to the source tree or are not able to change the original project source.

This approach certainly is not meant to replace build time bundlers and will probably only have niche uses.

It can however, be used to bundle a 3rd party app or page for use offline, for example.