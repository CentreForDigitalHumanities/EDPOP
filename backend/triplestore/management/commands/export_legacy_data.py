import json
from collections import defaultdict

from django.core.management import BaseCommand

from vre.models import Annotation, Collection, Record


class Command(BaseCommand):
    help = 'Export all legacy data from the VRE to a JSON file.'

    def handle(self, **options):
        records = []
        for record in Record.objects.all():
            records.append(record.uri)

        collections = {}
        for collection in Collection.objects.all():
            name = collection.description
            collections[name] = []
            for record in collection.record_set.all():
                collections[name].append(record.uri)

        annotations = defaultdict(list)
        for annotation in Annotation.objects.all():
            uri = annotation.record.uri
            annotations[uri].append(annotation.content)

        json.dump({'records': records, 'collections': collections, 'annotations': annotations}, open('export.json', 'w'), indent=4)
