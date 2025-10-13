from rdflib import URIRef, Literal, Namespace, RDF
from triplestore.rdf_field import RDFUniquePropertyField
from triplestore.rdf_model import RDFModel
from triplestore.utils import triple_exists

Test = Namespace('https://www.test.org/test#')

class Example(RDFModel):
    rdf_class = Test.Example

    name = RDFUniquePropertyField(Test.name)

def test_rdf_model(empty_graph):
    g = empty_graph
    uri = URIRef('example', 'https://example.org/')
    example = Example(g, uri)

    assert example.name == None # no name in the graph

    example.name = Literal('Test')
    example.save()

    assert triple_exists(g, (uri, RDF.type, Test.Example))
    assert triple_exists(g, (uri, Test.name, Literal('Test')))

    example.delete()

    assert not triple_exists(g, (uri, RDF.type, Test.Example))
    assert not triple_exists(g, (uri, Test.name, Literal('Test')))
