from django.conf import settings
from rdflib import URIRef, RDF

from triplestore.constants import EDPOPREC


def record_exists(uri: URIRef):
    store = settings.RDFLIB_STORE
    triples_bio = store.triples((uri, RDF.type, EDPOPREC.BiographicalRecord))
    triples_biblio = store.triples((uri, RDF.type, EDPOPREC.BibliographicalRecord))
    return any(triples_bio) or any(triples_biblio)
