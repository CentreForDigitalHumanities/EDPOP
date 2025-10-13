from django.db import models
from django.contrib.auth.models import User

from projects.models import Project


class Collection(models.Model):
    """ a collection of records imported from an external resource,
    which can be annotated and extended in the Virtual Research Environment.
    """
    description = models.CharField(max_length=200)
    context = models.ForeignKey(Project, on_delete=models.CASCADE)

    class Meta:
        permissions = (
            ("give_access_to_collection", "Can give access to a collection"),
        )

    def __str__(self):
        return self.description


class Record(models.Model):
    """ an item in one or several collections in the
    Virtual Research Environment.
    """
    uri = models.CharField(max_length=200, blank=True)
    collection = models.ManyToManyField(Collection)
    content = models.JSONField(dict)

    def __str__(self):
        return self.uri


class Annotation(models.Model):
    """ Import the fields of a given record, and stores annotations to its
    fields, as well as extra information.
    An annotation is related to exactly one record.
    One record can have multiple annotations.
    An annotation is also linked to exactly one Project."""
    record = models.ForeignKey(Record, on_delete=models.CASCADE)
    context = models.ForeignKey(Project, on_delete=models.CASCADE)
    content = models.JSONField(dict)

    def __str__(self):
        return '{} ({})'.format(self.record.uri, self.context.name)
