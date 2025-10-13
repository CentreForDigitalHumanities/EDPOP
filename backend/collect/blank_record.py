import uuid

from edpop_explorer import Reader, BIBLIOGRAPHICAL, Record, BibliographicalRecord
from rdflib import URIRef


class BlankRecordReader(Reader):
    READERTYPE = BIBLIOGRAPHICAL
    CATALOG_URIREF = URIRef("https://edpop.hum.uu.nl/readers/blank-records")
    IRI_PREFIX = URIRef("https://edpop.hum.uu.nl/readers/blank-records/")
    SHORT_NAME = "Blank record"


def create_blank_record() -> Record:
    record = BibliographicalRecord(from_reader=BlankRecordReader)
    record.identifier = str(uuid.uuid4())
    return record
