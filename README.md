# EDPOP

[![DOI](https://zenodo.org/badge/103948690.svg)](https://doi.org/10.5281/zenodo.17093901)

This [web application provides a virtual research environment (VRE)](https://edpop.wp.hum.uu.nl/virtual-research-environment-vre) that lets you collect, align and annotate bibliographical and biographical records from several online catalogs.

The VRE consists of separate backend and frontend applications. They are documented in more detail in their respective directories. To run them jointly during development, take the following steps:

## With Docker (recommended)

When running with Docker for the first time, you need to take the following steps:

1. Run `docker-compose up -d blazegraph`.
2. Visit the [Blazegraph web interface](http://localhost:9999/bigdata) and create the `edpop` and `edpop_testing` namespaces, as explained in more detail in the backend README. Note that the URL of the web interface ends in `/bigdata` when running Docker.

From then on, running the application is just a single command:

``` shell
docker-compose up -d
```

You can then access the application at `localhost:8000`. Manually refresh the browser to see code changes reflected.

You can still run all the other commands that are discussed in the backend and frontend READMEs. You just have to prefix them with `docker-compose exec $SERVICE` in order to execute them within the right container. The services are listed in the `docker-compose.yml`. For example, to create a Django superuser, run this:

``` shell
docker-compose exec backend python manage.py createsuperuser
```

### Stepping the backend with a debugger

The backend can be stepped from your editor by leveraging the [Debug Adapter Protocol (DAP)](https://microsoft.github.io/debug-adapter-protocol/). Most likely, this requires installing a DAP plugin in your editor and adding a little bit of configuration that you keep private to your local clone. The exact appearance of the configuration will depend on your editor and DAP plugin, but it likely needs to contain roughly the following values:

``` json
{
    "request": "attach",
    "host": "localhost",
    "port": 5778,
    "type": "python",
    "pathMappings": {
        "localRoot": "/wherever/you/have/EDPOP/backend",
        "remoteRoot": "/usr/src/app/backend"
    }
}
```

You may optionally also set `"django": true` in order to step through Django templates and `"justMyCode": false` in order to inspect what is happening in third-party packages such as `rdflib`. For a complete overview of available options of the adapter, see [the `debugpy` documentation](https://github.com/microsoft/debugpy/wiki/Debug-configuration-settings).

Once you have this configuration set up, you need to start the backend in a slightly different way so that it will listen for DAP connections. There are two easy ways to do this. If you did not already start the application, simply add `--profile debug` when calling `docker-compose up`:

``` shell
docker-compose --profile debug up -d
```

If you did already start the application, it suffices to restart the backend in the alternative mode:

``` shell
docker-compose down backend
docker-compose up -d backend-debug
```

These two options are equivalent. Running the backend with debugging enabled has the side effect that it runs single-threaded and does not automatically pick up code changes. If you make code changes and want to continue debugging afterwards, run `docker-compose up -d backend-debug` again and tell the editor to reconnect (step 1 of the workflow below).

With your host machine and the backend container both ready for debugging, the workflow is as follows:

1. Tell your editor to start debugging. Again, how to do this depends on your editor and DAP plugin.
2. Set a breakpoint on a line of code of interest. With some luck, this is a matter of opening the file with the line and clicking in the left margin.
3. In your browser, make a request that triggers the breakpoint.
4. Inspect and step away in your editor. There might be GUI buttons at your disposal and/or you might be able to use `pdb`'s familar `s`/`n`/`b`/`c` commands, again depending on the editor and the DAP plugin.

You can also debug the backend tests in this way. We do not have a separate port for this (although that could be done), so you need to stop the backend first, then run the tests with DAP enabled:

``` shell
docker-compose down backend-debug # or just backend
docker-compose run --rm --service-ports backend-debug debugpy --listen 0.0.0.0:5778 --wait-for-client -m pytest
```

Set at least one breakpoint and then tell the editor to start debugging. Making requests with the browser is not necessary. The container will automatically stop when you reach the end of the tests. To run the tests again, repeat the `docker-compose run` command. You can pass additional arguments to `pytest` as usual. Otherwise, the workflow is the same as with the application.

## Without Docker

1. Make sure you have taken all preparation steps in the READMEs of both applications. Consult the `docker-compose.yml` and the `Dockerfile`s for recommended software versions.
2. Open a new terminal in the `frontend` directory and run `npm run watch`.
3. Open a new terminal in the `backend` directory and run `python manage.py runserver`.
4. Open `localhost:8000`.
5. Manually refresh the browser to see code changes reflected.

Tests of both applications can be run at any time, independently from each other.
