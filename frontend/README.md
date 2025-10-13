# EDPOP: frontend

This is a [Backbone][backbone] application. It uses [Wontache][wontache] for its templates. Data is exchanged with the backend in [JSON-LD][jsonld].

[backbone]: https://backbonejs.org
[wontache]: https://www.npmjs.com/package/wontache
[jsonld]: https://json-ld.org/

## Development

Install the dependencies of the frontend via npm install.

```bash
npm install
```

Then, use Rollup to package the modules into a bundle.

```bash
# bundle once
npm run build
# OR bundle again on every change
npm run watch
```

It is necessary to refresh the browser every time.

The frontend currently has no independent webserver, so it relies on another application to serve the contents of the `vre` directory. The backend application can be used for this, which this application also depends on for all data.

For deployment, copy the stable bundle.js in the `vre` directory.

Run the frontend tests by invoking `npm run test` and opening http://localhost:9876/ in a browser.
