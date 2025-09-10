# EDPOP

[![DOI](https://zenodo.org/badge/103948690.svg)](https://doi.org/10.5281/zenodo.17093901)


This web application provides a virtual research environment (VRE) that lets you collect, align and annotate bibliographical and biographical records from several online catalogs.

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

## Without Docker

1. Make sure you have taken all preparation steps in the READMEs of both applications. Consult the `docker-compose.yml` and the `Dockerfile`s for recommended software versions.
2. Open a new terminal in the `frontend` directory and run `npm run watch`.
3. Open a new terminal in the `backend` directory and run `python manage.py runserver`.
4. Open `localhost:8000`.
5. Manually refresh the browser to see code changes reflected.

Tests of both applications can be run at any time, independently from each other.
