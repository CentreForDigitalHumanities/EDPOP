from rdflib import RDFS, IdentifiedNode, URIRef, Graph, RDF, Literal
from typing import Iterable

from triplestore.utils import Triples, replace_blank_nodes_in_triples
from triplestore.constants import EDPOPCOL, AS
from triplestore.rdf_model import RDFModel
from triplestore.rdf_field import RDFField, RDFUniquePropertyField
from collect.graphs import (
    list_from_graph_collection, list_to_graph_collection, collection_triples
)

class CollectionMembersField(RDFField):
    def get(self, instance: RDFModel):
        g = self.get_graph(instance)
        items = next(g.objects(instance.uri, AS.items), None)
        if items:
            return list_from_graph_collection(g, items)
        return []


    def _stored_triples(self,instance: RDFModel) -> Triples:
        g = self.get_graph(instance)
        subgraph = Graph()
        subgraph += g.triples((instance.uri, RDF.type, AS.Collection))
        subgraph += g.triples((instance.uri, AS.totalItems, None))
        subgraph += g.triples((instance.uri, AS.items, None))

        item_collections = g.objects(instance.uri, AS.items)
        for collection in item_collections:
            subgraph += collection_triples(g, collection)

        return list(subgraph.triples((None, None, None)))


    def _triples_to_store(self, instance: RDFModel, value: Iterable[IdentifiedNode]) -> Triples:
        g = Graph()
        g.add((instance.uri, RDF.type, AS.Collection))
        g.add((instance.uri, AS.totalItems, Literal(len(value))))

        items_node = self._items_uri(instance)
        g += list_to_graph_collection(value, items_node)
        g.add((instance.uri, AS.items, items_node))

        return list(replace_blank_nodes_in_triples(g.triples((None, None, None))))


    def _items_uri(self, instance: RDFModel):
        return URIRef(str(instance.uri) + '/items')


class EDPOPCollection(RDFModel):
    '''
    RDF model for EDPOP collections.
    '''
    rdf_class = EDPOPCOL.Collection

    name = RDFUniquePropertyField(AS.name)
    summary = RDFUniquePropertyField(AS.summary)
    project = RDFUniquePropertyField(AS.context)
    records = CollectionMembersField()
