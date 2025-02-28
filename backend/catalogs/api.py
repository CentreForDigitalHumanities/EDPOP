from edpop_explorer import ReaderError
from typing import Optional

from rdf.renderers import TurtleRenderer, JsonLdRenderer
from rest_framework import views
from rdf.views import RDFView
from rdflib import Graph, URIRef
from rest_framework.exceptions import ParseError
from rest_framework.renderers import JSONRenderer

from triplestore.constants import EDPOPREC, AS
from .graphs import SearchGraphBuilder, get_catalogs_graph, get_reader_by_uriref


class SearchView(RDFView):
    """Search in a given external catalog according to a query."""
    renderer_classes = (JsonLdRenderer,)
    json_ld_context = {
        "edpoprec": str(EDPOPREC),
        "as": str(AS),
    }

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
