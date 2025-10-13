'''
Base class for Django-esque management of RDF data.
'''

from rdflib import URIRef, Graph, RDF
from typing import Dict, Optional
from django.conf import settings
from abc import ABC

from triplestore.rdf_field import RDFField
from triplestore.utils import triples_to_quads, Triples

class RDFModel(ABC):
    '''
    Abstract class for RDF data models

    Create subclasses to model a data class.

    In most cases, a model class will correspond to an RDF class; this class can be set
    in the `rdf_class` attribute.
    '''

    store = settings.RDFLIB_STORE
    '''Triplestore to which data is saved'''

    rdf_class: Optional[URIRef] = None
    '''
    RDF class that is being modelled. If this is filled in, an instance identified as `x`
    will include a triple `(x, RDF.type, rdf_class)` in its graph representation.
    '''

    def __init__(self, graph: Graph, uri: URIRef):
        self.graph = graph
        self.uri = uri

        self.refresh_from_store()


    def save(self) -> None:
        '''
        Store the data of this instance in the graph
        '''

        self.graph.addN(triples_to_quads(self._class_triples(), self.graph))

        for name, field in self._fields().items():
            field.set(self, getattr(self, name))

        self.store.commit()


    def delete(self) -> None:
        '''
        Delete this instance from the graph
        '''
        for triple in self._class_triples():
            self.graph.remove(triple)

        for field in self._fields().values(): 
            field.clear(self)
        
        self.store.commit()


    def refresh_from_store(self):
        '''
        Refresh the model state based on the graph.

        Updates field values by reading them from the graph. This method is called when
        the model is first initialised; you can call it manually if the graph was
        updated since then.
        '''
        for name, field in self._fields().items():
            value = field.get(self)
            self.__setattr__(name, value)


    def _class_triples(self) -> Triples:
        '''
        A set of triples that is common to all instances of the model.

        The default implementation will add a single triple with the `rdf_class` of the
        model class (if one is configured). You can override this class to use other data.
        '''

        if self.__class__.rdf_class:
            return [(self.uri, RDF.type, self.__class__.rdf_class)]

        return []

    def _fields(self) -> Dict[str, RDFField]:
        '''
        Lists RDFFields of this model.
        '''
        attributes = self.__class__.__dict__
        return {
            attr: item
            for (attr, item) in attributes.items()
            if isinstance(item, RDFField)
        }
