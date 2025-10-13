from rdflib import Graph, IdentifiedNode
from typing import Iterable
from django.conf import settings

from triplestore.constants import AS, EDPOPCOL
from triplestore.rdf_model import RDFModel
from triplestore.rdf_field import RDFUniquePropertyField, RDFQuadField
from triplestore.utils import Quads


class CollectionsField(RDFQuadField):
    '''
    Field containing the collections within a project.

    Collections are linked to projects through `as:context`. The context of a collection
    is stored in the graph of the collection, not the graph of the project.
    '''
    
    def get(self, instance: RDFModel):
        return [
            s
            for (s, p, o, g) in self._stored_quads(instance)
        ]

    def _stored_quads(self, instance: RDFModel) -> Quads:
        store = settings.RDFLIB_STORE
        results = store.query(f'''
        SELECT ?col WHERE {{                              
                ?col a edpopcol:Collection ;
                as:context <{instance.uri}> .
        }}
        ''', initNs={'as': AS, 'edpopcol': EDPOPCOL})

        return [
            (result, AS.context, instance.uri, Graph(store, result))
            for (result, ) in results
        ]

    def _quads_to_store(self, instance: RDFModel, value: Iterable[IdentifiedNode]) -> Quads:
        return [
            (uri, AS.context, instance.uri, uri)
            for uri in value
        ]


class RDFProject(RDFModel):
    '''
    RDF representation of a project.
    '''
    
    rdf_class = EDPOPCOL.Project

    name = RDFUniquePropertyField(AS.name)
    summary = RDFUniquePropertyField(AS.summary)

    collections = CollectionsField()
