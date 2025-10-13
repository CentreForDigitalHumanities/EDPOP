from urllib.request import urlopen
from rdflib import Graph

URL = 'https://raw.githubusercontent.com/UUDigitalHumanitieslab/edpop-record-ontology/develop/edpop-record-ontology.ttl'

def import_ontology():
    raw = download_ontology()
    g = Graph()
    g.parse(raw)
    return g

def download_ontology():
    response = urlopen(URL)
    return response.read()