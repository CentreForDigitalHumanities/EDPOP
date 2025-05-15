"""Special settings meant for unit tests only. These settings are automatically
selected by pytest using pytest.ini."""

from .settings import *

TRIPLESTORE_NAMESPACE = "edpop_testing"
TRIPLESTORE_BASE_URL = os.getenv('EDPOP_TRIPLESTORE_BASE_URL', 'http://localhost:9999/blazegraph')
TRIPLESTORE_SPARQL_ENDPOINT = f'{TRIPLESTORE_BASE_URL}/namespace/{TRIPLESTORE_NAMESPACE}/sparql'
RDFLIB_STORE = SPARQLUpdateStore(
    query_endpoint=TRIPLESTORE_SPARQL_ENDPOINT,
    update_endpoint=TRIPLESTORE_SPARQL_ENDPOINT,
    autocommit=False,
)

# Disable debug toolbar during testing.
def not_toolbar(name):
    return 'debug_toolbar' not in name

INSTALLED_APPS = list(filter(not_toolbar, INSTALLED_APPS))
MIDDLEWARE = list(filter(not_toolbar, MIDDLEWARE))
TESTING = True
