from typing import Iterator, Tuple, Callable, Dict, Any, Iterable
from rdflib import Graph, URIRef, RDF
from functools import reduce

from rdflib.term import Node, BNode

Triple = tuple[Node, Node, Node]
Triples = Iterable[Triple]
Quad = tuple[Node, Node, Node, Graph]
Quads = Iterable[Quad]


def union_graphs(graphs: Iterator[Graph]) -> Graph:
    '''
    Return the union of a collection of graphs

    `union_graphs([g1, g2, g3])` is equivalent to `g1 + g2 + g3` 
    '''
    return reduce(Graph.__iadd__, graphs, Graph())


def triple_exists(graph: Graph, triple: Tuple[URIRef]) -> bool:
    '''
    Check whether a triple exists in a graph.
    '''
    return any(graph.triples(triple))


def find_subject_by_class(graph: Graph, rdf_class: URIRef) -> URIRef:
    '''
    Search a graph and return the first subject with a particular class.

    Returns `None` if no match exists.
    '''
    
    subjects = graph.subjects(RDF.type, rdf_class)
    return next(subjects, None)

ObjectURIs = Dict[int, URIRef]


def objects_to_graph(convert: Callable, to_key: Callable, objects: Iterator[Any]) -> Tuple[ObjectURIs, Graph]:
    '''
    Convert a list of objects to a graph and a dict with URI references.

    Arguments:
    - `convert`: a function that convert an object to a graph. It should return a tuple
    of the subject node for the object, and the graph it has created.
    - `to_id`: a function that transforms an object to a key that can be used to look up its URI in a dict.
    - `objects`: a list of objects to be converted.
    
    Returns:
    A tuple of
    - object URIs: a dict that maps objects to their URI
    - a graph containing the representation of all objects
    '''
    
    objects = list(objects)
    result = map(convert, objects)
    uris, graphs = zip(*result)
    object_uris = {
        to_key(obj): uri
        for obj, uri in zip(objects, uris)
    }
    g = union_graphs(graphs)
    return object_uris, g


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


def triples_to_quads(triples: Triples, graph: Graph) -> Quads:
    """Convert all triples to quads according to a given named graph."""
    return ((s, p, o, graph) for s, p, o in triples)
