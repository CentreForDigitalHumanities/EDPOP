from django.db import models


class RegisteredRecord(models.Model):
    """
    Keeps track of the number of collections that each record is a member of.

    This is an internal model purely to enable garbage collection of unused
    records. There is no need to provide any user-oriented interfaces, such as a
    model admin.

    Intended usage:

    - Whenever a record (re)enters our triplestore, a corresponding instance of
      RegisteredRecord should be created or retrieved and (re)saved. This bumps
      the lastupdate field automatically.
    - When a record is added to a collection that it was not a member of yet,
      its refcount should be incremented.
    - When a record is removed from a collection, its refcount should be
      decremented.
    - Records with a zero refcount that weren't recently updated, are eligible
      for garbage collection. The definition of "recently" is up to the
      programmer.
    """

    uri = models.CharField(unique=True, editable=False)
    refcount = models.IntegerField(default=0, editable=False)
    lastupdate = models.DateField(auto_now=True, editable=False)

    class Meta:
        indexes = [models.Index(fields=('refcount', 'lastupdate'))]
