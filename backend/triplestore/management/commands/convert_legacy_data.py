from django.core.management import BaseCommand
from rdflib import Graph

from triplestore.convert_legacy_data.conversion import convert_all
from vre.models import Annotation, User, Collection, Record


class Command(BaseCommand):
    def handle(self, **options):
        # NOTE: this command only shows the resulting graph for now, because
        # the actual triplestore is not yet implemented in the VRE.
        annotations = Annotation.objects.all()
        users = User.objects.all()
        collections = Collection.objects.all()
        records = Record.objects.all()
        uris, graph = convert_all(
            users, collections, records, annotations
        )
        assert isinstance(graph, Graph)
        print(graph.serialize())
