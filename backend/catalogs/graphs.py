from typing import Optional
from operator import attrgetter

from django.conf import settings
from django.core.cache import cache
import hashlib

from edpop_explorer import Reader, Record, EDPOPREC
from rdf.utils import prune_triples_cascade, prune_triples
from rdflib import BNode, URIRef, Graph, RDF, Namespace, Literal, Dataset, ConjunctiveGraph

from catalogs.triplestore import remove_from_triplestore, save_to_triplestore
from triplestore.utils import replace_blank_node
from triplestore.constants import AS

# Cache timeout in seconds for readers that fetch all results at once
CACHE_TIMEOUT = 60 * 60


def _hash(input_str: str) -> str:
    """Return a hashed (hex digest) version of the input string."""
    return hashlib.sha224(input_str.encode()).hexdigest()


def _get_activated_readers() -> list[type[Reader]]:
    """Get a list of all activated readers."""
    # Currently simply return all registered readers in settings.py, but
    # we may want to dynamically register and deregister readers in the
    # future (e.g., to deactivate when a server is failing).
    return settings.CATALOG_READERS


def _get_reader_dict() -> dict[URIRef, type[Reader]]:
    """Return a dict allowing access to reader classes by URI."""
    # URIRefs are defined as a subclassed string, and can thus be used as keys
    return {x.CATALOG_URIREF: x for x in settings.CATALOG_READERS
            if x.CATALOG_URIREF}


def refresh_readers() -> None:
    """Refresh the list of loaded readers. Currently only used
    for unit tests."""
    global READERS_BY_URIREF
    READERS_BY_URIREF = _get_reader_dict()


READERS_BY_URIREF = _get_reader_dict()


def get_reader_by_uriref(uriref: URIRef) -> type[Reader]:
    """Return the reader class according to its URIRef. Raise KeyError
    if reader does not exist."""
    return READERS_BY_URIREF[uriref]


def get_catalogs_graph() -> Graph:
    """Get a graph containing information about all catalogs."""
    graphs = [x.catalog_to_graph() for x in _get_activated_readers()]
    graph = sum(graphs, Graph())  # Addition means union for graphs
    return graph


def range_available_in_reader(reader: Reader, r: range) -> bool:
    """Return True if all of the range of records to fetch is already available
    in the reader, else False. Return also True if parts of range are not
    available but if these are out of range of the total number of results
    for the query (e.g., requested range is (10, 20) and only records 10 through
    14 are available but there are only 15 results, so they are all there)."""
    if reader.number_of_results is not None:
        rmax = min(r.stop, reader.number_of_results)
    else:
        rmax = r.stop
    r = range(r.start, rmax)
    # Check for all numbers in the range if reader.records contains this number
    # as a key (reader.records is a dictionary)
    return all(i in reader.records for i in r)


class SearchGraphBuilder:
    """Prepare and perform queries and build graphs from the results."""
    reader: Reader
    records: list[Record]
    cache_used: bool = False
    """True after retrieving results if cache was used instead of fetching
    from external database."""
    _start: int
    _end: int
    _available_range: Optional[range] = None

    def __init__(self, readerclass: type[Reader]):
        self.reader = readerclass()

    def query_to_graph(
            self,
            query: str,
            start: int = 0,
            end: Optional[int] = None
    ) -> Graph:
        """Convenience method that subsequently calls the ``set_query``,
        ``perform_fetch`` and ``get_result_graph`` methods."""
        self.set_query(query, start, end)
        self.perform_fetch()
        return self.get_result_graph()

    def set_query(
            self,
            query: str,
            start: int = 0,
            end: Optional[int] = None
    ):
        """Set the query. Should be called before calling
        ``perform_fetch()``."""
        self._start = start
        self._end = end if end is not None else start + 50
        self.reader.prepare_query(query)

    def perform_fetch(self):
        """Perform the fetch. This method is supposed to be called just
        once. After fetching, the requested records (and only those)
        are available in the ``records`` attribute, and ``get_result_graph()``
        can be called to create the accompanying graph.

        During the fetch, a ReaderError may be raised that can be the
        result of an unavailable service or a problem with the query.
        The message of this exception may be passed to the end user."""
        # Reader objects are cached for a limited period of time because
        # certain queries may be expensive.
        # To identify caches, the `generate_identifier()` method of a reader
        # is used, but this is hashed because this identifier may be too
        # long and complicated to be used as a cache key. Two hashes may
        # theoretically be used for the same identifier, so check if the
        # reader from the cache is indeed appropriate.
        identifier = _hash(self.reader.generate_identifier())
        cached_reader = cache.get(identifier)
        if (cached_reader is not None and
                cached_reader.prepared_query == self.reader.prepared_query
                and type(cached_reader) is type(self.reader)):
            # Only use cache if types and queries are identical
            self.reader = cached_reader

        # Fetch records, if they are not already available from cache
        range_to_fetch = range(self._start, self._end)
        if range_available_in_reader(self.reader, range_to_fetch):
            self.cache_used = True
        else:
            self.cache_used = False
            self.reader.fetch_range(range_to_fetch)
            # Save reader in cache
            cache.set(identifier, self.reader, CACHE_TIMEOUT)

        self.records = self._get_partial_results()

    def _get_partial_results(self) -> list[Record]:
        start = self._start
        end = min(self._end, self.reader.number_of_results)
        results = [self.reader.records[x] for x in range(start, end)]
        return results  # type: ignore

    def _get_content_graph(self) -> Graph:
        """Return a graph containing the information of all requested
        records."""
        results = self.records
        record_nodes = map(attrgetter('subject_node'), results)
        graphs = [x.to_graph() for x in results if isinstance(x, Record)]
        content_graph = Graph()
        quads = [(s, p, o, content_graph) for g in graphs for (s, p, o) in g.triples((None, None, None))]
        content_graph.addN(quads)
        remove_from_triplestore(results)
        save_to_triplestore(content_graph, record_nodes)
        return content_graph

    def _get_collection_graph(self) -> Graph:
        """Return a graph with an ActivityStreams Collection containing
        references to the requested records in the right order."""
        graph = Graph()
        subject_node = BNode()
        graph.add((subject_node, RDF.type, AS.OrderedCollection))
        collection_node = BNode()
        collection = graph.collection(collection_node)
        graph.add((subject_node, AS.orderedItems, collection_node))
        for record in self.records:
            if record.iri is not None:
                collection.append(URIRef(record.iri))
        graph.add((
            subject_node,
            AS.totalItems,
            Literal(self.reader.number_of_results)
        ))
        return graph

    def get_result_graph(self) -> Graph:
        """Represent the fetched records in a graph with an ActivityStreams
        collection."""
        return self._get_collection_graph() + self._get_content_graph()
