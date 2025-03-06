from rdflib import RDFS, IdentifiedNode, RDF
from typing import Iterable

from triplestore.utils import Triples
from triplestore.constants import EDPOPCOL, AS
from triplestore.rdf_model import RDFModel
from triplestore.rdf_field import RDFField, RDFUniquePropertyField


class CollectionMembersField(RDFField):
    '''
    Field for the records that are contained in an EDPOP collection.
    '''

    def get(self, instance: RDFModel):
        g = self.get_graph(instance)
        return list(g.objects(instance.uri, RDFS.member))


    def _stored_triples(self, instance: RDFModel) -> Triples:
        g = self.get_graph(instance)
        return list(g.triples((instance.uri, RDFS.member, None)))


    def _triples_to_store(self, instance: RDFModel, value: Iterable[IdentifiedNode]) -> Triples:
        return [(instance.uri, RDFS.member, item) for item in value]


class EDPOPCollection(RDFModel):
    '''
    RDF model for EDPOP collections.
    '''
    rdf_class = EDPOPCOL.Collection

    name = RDFUniquePropertyField(AS.name)
    summary = RDFUniquePropertyField(AS.summary)
    project = RDFUniquePropertyField(AS.context)
    records = CollectionMembersField()
