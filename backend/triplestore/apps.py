from django.apps import AppConfig
from django.core.checks import register, Error
from django.conf import settings

from triplestore.blazegraph import (
    verify_blazegraph_connection,
    verify_namespace_available,
    NamespaceStatus,
)


def verify_blazegraph(app_configs, **kwargs) -> list:
    """Test if Blazegraph is up and running and if the required namespace has
    been made available in quads mode. This function works according to
    the Django integrity tests framework."""
    errors = []
    bg = verify_blazegraph_connection()
    if bg is True:
        # Connection works; check namespace
        ns = verify_namespace_available()
        namespace_name = settings.TRIPLESTORE_NAMESPACE
        if ns == NamespaceStatus.NO_QUADS:
            errors.append(Error(
                f"Namespace {namespace_name} exists but it does not support "
                "quads. Please recreate it in quads mode."
            ))
        elif ns == NamespaceStatus.ABSENT:
            errors.append(Error(
                f"Namespace {namespace_name} does not exist. Please create it "
                "using the Blazegraph web interface and make sure to use quads "
                "mode."))
    else:
        errors.append(Error(
            f"Cannot connect to Blazegraph on {settings.TRIPLESTORE_BASE_URL}"
        ))
    return errors


class TriplestoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'triplestore'

    def ready(self) -> None:
        register(verify_blazegraph)

