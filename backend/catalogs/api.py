from django.conf import settings
from edpop_explorer import ReaderError
from edpop_explorer.readers.utils import get_record_by_uri
from typing import Optional

from rdf.renderers import TurtleRenderer, JsonLdRenderer
from rest_framework import views
from rdf.views import RDFView
from rdflib import Graph, URIRef
from rest_framework.exceptions import ParseError
from rest_framework.renderers import JSONRenderer

from triplestore.constants import EDPOPREC, AS
from .graphs import SearchGraphBuilder, get_catalogs_graph, get_reader_by_uriref
from .triplestore import get_single_record, save_to_triplestore, remove_from_triplestore

JSON_LD_CONTEXT = {
    "edpoprec": str(EDPOPREC),
    "as": str(AS),
}


class RecordView(RDFView):
    """Get a single record."""
    renderer_classes = (JsonLdRenderer,)
    json_ld_context = JSON_LD_CONTEXT

    def get_graph(self, request: views.Request, **kwargs) -> Graph:
        force_reload = False
        if request.headers.get("Force-Reload") == "true":
            force_reload = True
        reader = kwargs.get("reader")
        record_id = kwargs.get("record")
        record_uri = "https://edpop.hum.uu.nl/readers/" + reader + "/" + record_id
        record_uriref = URIRef(record_uri)

        if not force_reload:
            # First check if it is already in the triplestore
            graph = get_single_record(record_uriref)
            if (record_uriref, None, None) in graph:
                # Record exists in triplestore; return it
                return graph

        try:
            record = get_record_by_uri(record_uri, settings.CATALOG_READERS)
        except ReaderError as e:
            raise ParseError("Could not fetch record: " + str(e))
        if record is not None:
            graph = record.to_graph()
            if force_reload:
                # In case of force reload, the record might already be in the
                # triplestore. Remove it to avoid duplications.
                remove_from_triplestore([record])
            save_to_triplestore(graph, [record_uriref])
            return graph
        raise ParseError(f"Could not fetch record")


class SearchView(RDFView):
    """Search in a given external catalog according to a query."""
    renderer_classes = (JsonLdRenderer,)
    json_ld_context = JSON_LD_CONTEXT

    def get_graph(self, request: views.Request, **kwargs) -> Graph:
        try:
            source = request.query_params["source"]
            query = request.query_params["query"]
            start = request.query_params.get("start", "0")
            end = request.query_params.get("end", None)
        except KeyError as err:
            raise ParseError(f"Query parameter missing: {err}")
        assert isinstance(source, str)
        assert isinstance(query, str)
        assert isinstance(start, str)
        assert end is None or isinstance(end, str)
        catalog_uriref = URIRef(source)
        start = int(start)
        if end is not None:
            end = int(end)

        try:
            readerclass = get_reader_by_uriref(catalog_uriref)
        except KeyError:
            raise ParseError(f"Requested catalog does not exist: {catalog_uriref}")
        builder = SearchGraphBuilder(readerclass)
        try:
            builder.set_query(query, start, end)
            builder.perform_fetch()
        except ReaderError as e:
            raise ParseError(str(e))
        return builder.get_result_graph()


class CatalogsView(RDFView):
    """Return a graph containing all activated catalogs."""
    renderer_classes = (JsonLdRenderer,)
    json_ld_context = {
        "edpoprec": str(EDPOPREC),
        "schema": "https://schema.org/",
        "name": "schema:name",
        "description": "schema:description",
        "identifier": "schema:identifier",
    }

    def get_graph(self, request: views.Request, **kwargs) -> Graph:
        graph = get_catalogs_graph()
        return graph
