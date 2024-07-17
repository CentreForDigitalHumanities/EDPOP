from typing import List
from rdflib import URIRef, BNode, Graph, RDF, Literal

from triplestore.constants import AS

def as_collection_from_records(collection: URIRef, records: List[URIRef]) -> Graph:
    '''
    Wrap a list of records in an ActivityStreams Collection
    '''

    g = Graph()
    g.add((collection, RDF.type, AS.Collection))
    g.add((collection, AS.totalItems, Literal(len(records))))

    items_node = BNode()
    items = g.collection(items_node)
    for record in records:
        items.append(record)
    g.add((collection, AS.items, items_node))
    return g
