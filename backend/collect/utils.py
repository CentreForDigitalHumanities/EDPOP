from django.conf import settings
from rdflib import RDF, URIRef, Graph
import re

from triplestore.constants import EDPOPCOL

def _name_to_slug(name: str) -> str:
    lowered = name.lower()
    cleaned = re.sub(r'[^a-z0-9\-_\s]', '', lowered)
    stripped = re.sub(r'(\W+$|^\W+)', '', cleaned)
    no_spaces = re.sub(r'\s+', '_', stripped)
    return no_spaces


def collection_uri(name: str):
    id = _name_to_slug(name)
    return URIRef(settings.RDF_NAMESPACE_ROOT + 'collections/' + id)


def collection_exists(uri: URIRef):
    store = settings.RDFLIB_STORE
    triples = store.triples((uri, RDF.type, EDPOPCOL.Collection))
    return any(triples)


def collection_graph(uri: URIRef):
    store = settings.RDFLIB_STORE
    return Graph(store=store, identifier=uri)
