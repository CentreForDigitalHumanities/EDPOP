from rdflib import BNode, Graph, URIRef, Literal
from rdflib.namespace import RDF

from .utils import union_graphs, replace_blank_node, \
    replace_blank_nodes_in_triples, triples_to_quads, sparql_multivalues


def blank_triple():
    return (BNode(), BNode(), BNode())

def test_union_graphs():
    g1 = Graph()
    g1.add(blank_triple())

    g2 = Graph()
    g2.add(blank_triple())

    g3 = Graph()
    g3.add(blank_triple())

    result = union_graphs([g1, g2, g3])
    expected = g1 + g2 + g3

    assert set(result) == set(expected)

def test_union_graph_empty():
    union = union_graphs([])
    assert set(union) == set()


def test_replace_blank_node_non_blank_equal():
    node = URIRef("http://example.com/uri")
    assert replace_blank_node(node) == node


def test_replace_blank_node():
    graph = Graph()
    bnode = BNode()
    graph.add((bnode, RDF.type, Literal("test")))
    retrieved_bnode, _, _ = next(graph.triples((None, RDF.type, Literal("test"))))
    bnode_converted = replace_blank_node(bnode)
    retrieved_bnode_converted = replace_blank_node(retrieved_bnode)
    assert bnode_converted == retrieved_bnode_converted


def test_replace_blank_nodes_in_triples():
    # Create a graph where one triple has a blank node as its object and
    # another triple where the blank node is the subject. Then convert, and
    # check if the blank node has been consistently converted.
    graph = Graph()
    bnode = BNode()
    uriref = URIRef("http://example.com/uri")
    literal = Literal("test")
    graph.add((uriref, RDF.type, bnode))
    graph.add((bnode, RDF.type, literal))
    triples = graph.triples((None, None, None))
    new_triples = replace_blank_nodes_in_triples(triples)
    new_graph = Graph()
    for triple in new_triples:
        new_graph.add(triple)
    first_converted_bnode = next(new_graph.objects(uriref, RDF.type))
    second_converted_bnode = next(new_graph.subjects(RDF.type, literal))
    assert isinstance(first_converted_bnode, URIRef)
    assert isinstance(second_converted_bnode, URIRef)
    assert first_converted_bnode == second_converted_bnode


def test_replace_blank_nodes_in_triples_empty():
    triples = []
    result = replace_blank_nodes_in_triples(triples)
    assert list(result) == []


def test_triples_to_quads():
    identifier = URIRef("http://example.com/uri")
    graph = Graph(identifier=identifier)
    graph.add((BNode(), URIRef("http://example.com/name"), Literal("test")))
    graph.add((BNode(), URIRef("http://example.com/name"), Literal("test2")))
    triples = graph.triples((None, None, None))
    quads = triples_to_quads(triples, graph)
    for quad in quads:
        assert isinstance(quad, tuple)
        assert len(quad) == 4
        assert isinstance(quad[0], BNode)
        assert quad[1] == URIRef("http://example.com/name")
        assert quad[2] in [Literal("test"), Literal("test2")]
        assert isinstance(quad[3], Graph)


def test_sparql_multivalues():
    values = [
        URIRef('http://example.com/uri'),
        URIRef('https://example.com/name'),
        Literal('banana'),
    ]
    formatted = sparql_multivalues(values)
    expected = '<http://example.com/uri> <https://example.com/name> "banana"'
    assert formatted == expected
