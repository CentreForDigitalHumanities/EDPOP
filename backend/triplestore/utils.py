from typing import Iterator, Tuple, Callable, Dict, Any, Iterable
from rdflib import Graph, URIRef, RDF
from functools import reduce
from operator import methodcaller

from rdflib.term import Node, BNode

Triple = tuple[Node, Node, Node]
Triples = Iterable[Triple]
Quad = tuple[Node, Node, Node, Graph]
Quads = Iterable[Quad]

def triple_exists(graph: Graph, triple: Tuple[URIRef]) -> bool:
    '''
    Check whether a triple exists in a graph.
    '''
    return any(graph.triples(triple))

def all_triples(graph: Graph) -> Iterable[Any]:
    return graph.triples((None, None, None))

def replace_blank_node(node: Node) -> Node:
    """Replace a blank node by a node with a URIRef node based on the
    unique identifier inside a ``Graph``."""
    if isinstance(node, BNode):
        return URIRef(f"bnode:{node}")
    else:
        return node


def replace_blank_nodes_in_triples(triples: Triples) -> Triples:
    """Replace blank nodes in all triples using the ``replace_blank_node()``
    function. This function assumes that all triples come from the same
    graph."""
    return ((
        replace_blank_node(s),
        replace_blank_node(p),
        replace_blank_node(o),
    ) for s, p, o in triples)


def replace_node(triples: Triples, old: Node, new: Node) -> Triples:
    """Deep copy triples with all occurrences of old replaced by new."""

    def apply_to_node(node: Node) -> Node:
        if node == old:
            return new
        return node

    def apply_to_triple(triple: Triple) -> Triple:
        return tuple(map(apply_to_node, triple))

    return map(apply_to_triple, triples)


def triples_to_quads(triples: Triples, graph: Graph) -> Quads:
    """Convert all triples to quads according to a given named graph."""
    return ((s, p, o, graph) for s, p, o in triples)


def replace_triples(graph: Graph, stored_triples: Triples, triples_to_store: Triples):
    '''
    Replace one set of triples with another.
    '''

    to_delete = set(stored_triples).difference(triples_to_store)
    to_add = set(triples_to_store).difference(stored_triples)

    for triple in to_delete:
        graph.remove(triple)

    quads = triples_to_quads(to_add, graph)
    graph.addN(quads)

def replace_quads(stored_quads: Quads, quads_to_store: Quads):
    '''
    Replace one set of quads with another
    '''
    to_delete = set(stored_quads).difference(quads_to_store)
    to_add = set(quads_to_store).difference(stored_quads)

    for s, p, o, g in to_delete:
        g.remove((s, p, o))

    for s, p, o, g in to_add:
        g.add((s, p, o))


n3 = methodcaller('n3')

def sparql_multivalues(values: Iterable[Node]) -> str:
    """Format a bunch of values for insertion as x in VALUES ?v { x }."""
    return ' '.join(map(n3, values))
