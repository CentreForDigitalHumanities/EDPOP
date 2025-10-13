import pytest
import requests

from django.conf import settings
from rdflib.plugins.stores.sparqlstore import SPARQLUpdateStore

from triplestore.blazegraph import verify_namespace_available, NamespaceStatus, \
    verify_blazegraph_connection


def create_test_namespace() -> None:
    # Namespace name is taken from settings, which is set by test_settings.py
    namespace_name = settings.TRIPLESTORE_NAMESPACE
    # See: https://github.com/blazegraph/database/wiki/InferenceAndTruthMaintenance#quads-no-inference
    payload = f"""
com.bigdata.rdf.sail.namespace={namespace_name}
com.bigdata.rdf.store.AbstractTripleStore.quads=true
com.bigdata.rdf.sail.truthMaintenance=false
com.bigdata.rdf.store.AbstractTripleStore.statementIdentifiers=false
com.bigdata.rdf.store.AbstractTripleStore.axiomsClass=com.bigdata.rdf.axioms.NoAxioms
    """
    namespace_url = settings.TRIPLESTORE_BASE_URL + "/namespace"
    headers = {"Content-Type": "text/plain"}
    response = requests.post(url=namespace_url, data=payload, headers=headers)
    assert response.status_code == 201


@pytest.fixture(autouse=True)
def triplestore(settings) -> SPARQLUpdateStore:
    """Get the testing triplestore and make sure that it is empty both
    before and after the test. This fixture is automatically applied,
    but by explicitly adding it to a test it also offers convenient access."""
    store = settings.RDFLIB_STORE
    store.update('CLEAR ALL')
    yield store
    store.update('CLEAR ALL')


def pytest_sessionstart(session):
    # Make sure the test namespace exists
    if not verify_blazegraph_connection():
        pytest.exit("Cannot connect to Blazegraph. Is it running?")
    if verify_namespace_available() != NamespaceStatus.OK:
        create_test_namespace()
    assert verify_namespace_available() == NamespaceStatus.OK
