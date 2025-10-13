from typing import List
from rdflib import Graph, RDF, IdentifiedNode
from rdflib.term import Node

from triplestore.utils import Triples

def list_from_graph_collection(graph: Graph, list_node: IdentifiedNode) -> List[Node]:
    '''
    Extract a list of nodes from an RDF collection in a graph
    '''

    items = list(graph.objects(list_node, RDF.first))
    rest_nodes = graph.objects(list_node, RDF.rest)
    for rest in rest_nodes:
        items += list_from_graph_collection(graph, rest)
    return items


def list_to_graph_collection(items: List[Node], items_node: IdentifiedNode) -> Graph:
    '''
    Return a list of items as an RDF collection
    '''
    
    g = Graph()
    collection = g.collection(items_node)
    collection += items # indirectly modifies g
    return g


def collection_triples(graph: Graph, list_node: IdentifiedNode) -> Triples:
    '''
    Select all triples that make up an RDF collection in a graph.
    
    This collects the chain of `rdf:first` / `rdf:rest` relations that make up the
    collection. It collects what is actually stored in the graph, rather than a
    normalised version, so this method should be used to select the current triples in
    a delete or update operation.
    '''
    
    triples = list(graph.triples((list_node, RDF.first, None)))
    triples += list(graph.triples((list_node, RDF.rest, None)))

    for rest in graph.objects(list_node, RDF.rest):
        triples += collection_triples(graph, rest)

    return triples
