import assert from 'assert';
import sinon from 'sinon';

import _ from 'lodash';
import Backbone from 'backbone';

import { Record } from '../record/record.model.js';
import { Annotations } from '../annotation/annotation.model.js';
import { presentableContents, fieldEntryTag } from './field.model.js';

var bnode = _.partial(_.uniqueId, 'bnode:N');

var contributor = {
    value1: {
        original: 'William Shakespur',
        correction1: 'William Shakespeare',
        correction2: 'Bill Shakespur',
    },
    value2: {
        original1: 'John Irving',
        original2: 'Elizabeth Gilbert',
        correction: 'Rebecca Nandwa',
    },
    value3: {
        original: 'Zuo Qiuming',
    },
    value4: {
        original: 'Isabell Alende',
        correction: 'Isabel Allende',
    },
    value5: {
        addition: 'Publius Ovidius Naso',
    },
};
contributor.value1.id1 = `${contributor.value1.original} → ${contributor.value1.correction1}`;
contributor.value1.id2 = `${contributor.value1.original} → ${contributor.value1.correction2}`;
contributor.value2.id1 = `${contributor.value2.original1} → ${contributor.value2.correction}`;
contributor.value2.id2 = `${contributor.value2.original2} → ${contributor.value2.correction}`;
contributor.value4.id = `${contributor.value4.original} → ${contributor.value4.correction}`;
contributor.value5.id = `→ ${contributor.value5.addition}`;

var mockRecord = {
    '@id': 'http://example.com/record',
    '@type': 'edpoprec:BibliographicalRecord',
    // field with two values and no annotations
    'edpoprec:title': [{
        '@id': bnode(),
        '@type': 'edpoprec:Field',
        'edpoprec:originalText': 'The one and only title.'
    }, {
        '@id': bnode(),
        '@type': 'edpoprec:Field',
        'edpoprec:originalText': 'The other only title.'
    }],
    // field with a mix of multiple corrected and uncorrected values
    'edpoprec:contributor': [{
        '@id': bnode(),
        '@type': 'edpoprec:Field',
        'edpoprec:originalText': contributor.value1.original,
    }, {
        '@id': bnode(),
        '@type': 'edpoprec:Field',
        'edpoprec:originalText': contributor.value2.original2,
    }, {
        '@id': bnode(),
        '@type': 'edpoprec:Field',
        'edpoprec:originalText': contributor.value3.original,
    }, {
        '@id': bnode(),
        '@type': 'edpoprec:Field',
        'edpoprec:originalText': contributor.value4.original,
    }],
    // field with just a single corrected value
    'edpoprec:genre': {
        '@id': bnode(),
        '@type': 'edpoprec:Field',
        'edpoprec:originalText': 'science fiction'
    },
    // bogus field that should be ignored by the tested algorithms
    banana: true
};

var mockAnnotations = [{
    // two conflicting corrections for the same field and originalText
    '@id': bnode(),
    '@type': 'edpopcol:Annotation',
    'edpopcol:field': 'edpoprec:contributor',
    'edpopcol:originalText': contributor.value1.original,
    'oa:hasBody': contributor.value1.correction1,
}, {
    '@id': bnode(),
    '@type': 'edpopcol:Annotation',
    'edpopcol:field': 'edpoprec:contributor',
    'edpopcol:originalText': contributor.value1.original,
    'oa:hasBody': contributor.value1.correction2,
}, {
    // single correction for another originalText of the same field
    '@id': bnode(),
    '@type': 'edpopcol:Annotation',
    'edpopcol:field': 'edpoprec:contributor',
    'edpopcol:originalText': contributor.value4.original,
    'oa:hasBody': contributor.value4.correction,
}, {
    // correction on the same field for an originalText no longer present
    '@id': bnode(),
    '@type': 'edpopcol:Annotation',
    'edpopcol:field': 'edpoprec:contributor',
    'edpopcol:originalText': contributor.value2.original1,
    'oa:hasBody': contributor.value2.correction,
}, {
    // addition, again on the same field
    '@id': bnode(),
    '@type': 'edpopcol:Annotation',
    'edpopcol:field': 'edpoprec:contributor',
    'oa:hasBody': contributor.value5.addition,
}, {
    // correction on a field that is no longer set in the original record
    '@id': bnode(),
    '@type': 'edpopcol:Annotation',
    'edpopcol:field': 'edpoprec:placeOfPublication',
    'edpopcol:originalText': 'Shanghai',
    'oa:hasBody': 'Bogotá'
}, {
    // addition on a field that had no value set yet
    '@id': bnode(),
    '@type': 'edpopcol:Annotation',
    'edpopcol:field': 'edpoprec:bookseller',
    'oa:hasBody': 'Kostunrix'
}, {
    // single correction to field with single value
    '@id': bnode(),
    '@type': 'edpopcol:Annotation',
    'edpopcol:field': 'edpoprec:genre',
    'edpopcol:originalText': 'science fiction',
    'oa:hasBody': 'fantasy and horror'
}];

var expectedCompoundData = [sinon.match({
    id: 'edpoprec:title',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'The one and only title.',
        uncorrected: true,
        order: fieldEntryTag.originalValue,
        isFirst: true,
    }), sinon.match({
        id: 'The other only title.',
        uncorrected: true,
        order: fieldEntryTag.originalValue
    }), sinon.match({
        id: 'edpoprec:title',
        field: true,
        order: fieldEntryTag.wholeField
    })],
}), sinon.match({
    id: 'edpoprec:alternativeTitle',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:alternativeTitle',
        field: true,
        order: fieldEntryTag.wholeField,
        isFirst: true,
    })],
}), sinon.match({
    id: 'edpoprec:genre',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'science fiction → fantasy and horror',
        correction: sinon.match.truthy,
        order: fieldEntryTag.correction,
        original: sinon.match.truthy,
        originalText: 'science fiction',
        correctedText: 'fantasy and horror',
        isFirst: true,
    }), sinon.match({
        id: 'edpoprec:genre',
        field: true,
        order: fieldEntryTag.wholeField
    })],
}), sinon.match({
    id: 'edpoprec:language',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:language',
        field: true,
        order: fieldEntryTag.wholeField,
        isFirst: true,
    })],
}), sinon.match({
    id: 'edpoprec:contributor',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: contributor.value2.original2,
        uncorrected: true,
        order: fieldEntryTag.originalValue,
        isFirst: true,
    }), sinon.match({
        id: contributor.value3.original,
        uncorrected: true,
        order: fieldEntryTag.originalValue
    }), sinon.match({
        id: contributor.value4.id,
        correction: sinon.match.truthy,
        order: fieldEntryTag.correction,
        original: sinon.match.truthy,
        originalText: contributor.value4.original,
        correctedText: contributor.value4.correction
    }), sinon.match({
        id: contributor.value1.id2,
        correction: sinon.match.truthy,
        order: fieldEntryTag.correction,
        original: sinon.match.truthy,
        originalText: contributor.value1.original,
        correctedText: contributor.value1.correction2
    }), sinon.match({
        id: contributor.value1.id1,
        correction: sinon.match.truthy,
        order: fieldEntryTag.correction,
        original: sinon.match.truthy,
        originalText: contributor.value1.original,
        correctedText: contributor.value1.correction1
    }), sinon.match({
        id: contributor.value2.id1,
        correction: sinon.match.truthy,
        order: fieldEntryTag.danglingCorrection,
        original: undefined,
        dangling: true,
        originalText: contributor.value2.original1,
        correctedText: contributor.value2.correction
    }), sinon.match({
        id: contributor.value5.id,
        addition: sinon.match.truthy,
        order: fieldEntryTag.addition,
        correctedText: contributor.value5.addition
    }), sinon.match({
        id: 'edpoprec:contributor',
        field: true,
        order: fieldEntryTag.wholeField
    })],
}), sinon.match({
    id: 'edpoprec:dating',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:dating',
        field: true,
        order: fieldEntryTag.wholeField,
        isFirst: true,
    })],
}), sinon.match({
    id: 'edpoprec:publisherOrPrinter',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:publisherOrPrinter',
        field: true,
        order: fieldEntryTag.wholeField
    })],
}), sinon.match({
    id: 'edpoprec:placeOfPublication',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'Shanghai → Bogotá',
        correction: sinon.match.truthy,
        order: fieldEntryTag.danglingCorrection,
        original: undefined,
        dangling: true,
        originalText: 'Shanghai',
        correctedText: 'Bogotá',
        isFirst: true,
    }), sinon.match({
        id: 'edpoprec:placeOfPublication',
        field: true,
        order: fieldEntryTag.wholeField
    })],
}), sinon.match({
    id: 'edpoprec:bookseller',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: '→ Kostunrix',
        addition: sinon.match.truthy,
        order: fieldEntryTag.addition,
        correctedText: 'Kostunrix',
        isFirst: true,
    }), sinon.match({
        id: 'edpoprec:bookseller',
        field: true,
        order: fieldEntryTag.wholeField
    })],
}), sinon.match({
    id: 'edpoprec:location',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:location',
        field: true,
        order: fieldEntryTag.wholeField,
        isFirst: true,
    })],
}), sinon.match({
    id: 'edpoprec:bibliographicalFormat',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:bibliographicalFormat',
        field: true,
        order: fieldEntryTag.wholeField
    })],
}), sinon.match({
    id: 'edpoprec:collationFormula',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:collationFormula',
        field: true,
        order: fieldEntryTag.wholeField,
        isFirst: true,
    })],
}), sinon.match({
    id: 'edpoprec:fingerprint',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:fingerprint',
        field: true,
        order: fieldEntryTag.wholeField
    })],
}), sinon.match({
    id: 'edpoprec:extent',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:extent',
        field: true,
        order: fieldEntryTag.wholeField
    })],
}), sinon.match({
    id: 'edpoprec:size',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:size',
        field: true,
        order: fieldEntryTag.wholeField
    })],
}), sinon.match({
    id: 'edpoprec:physicalDescription',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:physicalDescription',
        field: true,
        order: fieldEntryTag.wholeField
    })],
}), sinon.match({
    id: 'edpoprec:typographicalFeatures',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:typographicalFeatures',
        field: true,
        order: fieldEntryTag.wholeField
    })],
}), sinon.match({
    id: 'edpoprec:annotations',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:annotations',
        field: true,
        order: fieldEntryTag.wholeField
    })],
}), sinon.match({
    id: 'edpoprec:holdings',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:holdings',
        field: true,
        order: fieldEntryTag.wholeField
    })],
}), sinon.match({
    id: 'edpoprec:digitization',
    field: sinon.match.truthy,
    content: [sinon.match({
        id: 'edpoprec:digitization',
        field: true,
        order: fieldEntryTag.wholeField
    })],
})];

function matchOriginalText(originalText) {
    return function(model) {
        var value = model.get('value');
        return value && value['edpoprec:originalText'] === originalText;
    };
}

function recordField2json(recordField) {
    var modelJson = recordField.toJSON();
    var contentJson = recordField.content.toJSON();
    return _.extend({content: contentJson}, modelJson);
}

function disableRecordFieldListeners(recordField) {
    _.each(['content', 'annotations', 'values'], (collection) => {
        recordField[collection].off().stopListening();
    });
    recordField.off().stopListening();
}

describe('presentableContents', function() {
    var record, contents;

    beforeEach(() => {
        record = new Record(mockRecord);
        record.annotations = new Annotations(mockAnnotations);
        contents = presentableContents(record);
    });

    afterEach(() => {
        record.annotations.reset();
        record.clear();
        contents.each(disableRecordFieldListeners);
        contents.off().stopListening();
        contents.values.off().stopListening();
        contents = null;
        record.annotations.off().stopListening();
        record.off().stopListening();
        record = null;
    });

    it('collects all facts about a record in a single nested collection', () => {
        assert(contents instanceof Backbone.Collection);
        sinon.assert.match(
            contents.map(recordField2json),
            expectedCompoundData
        );
        assert(contents.record === record);
        assert(contents.values instanceof Backbone.Collection);
        assert(contents.annotations === record.annotations);
    });

    describe('per-field models', () => {
        var model, fieldName = 'edpoprec:holdings';

        beforeEach(() => {
            model = contents.get(fieldName);
        });

        afterEach(() => {
            model = null;
        });

        it('are present even for empty fields', () => {
            assert(!record.has(fieldName));
            assert(model instanceof Backbone.Model);
        });

        it('keep a reference to the corresponding field model', () => {
            var fieldAttr = model.get('field');
            assert(fieldAttr instanceof Backbone.Model);
            assert(fieldAttr.id === fieldName);
            assert(model.id === fieldName);
            assert(contents.underlying.get(fieldName) === fieldAttr);
        });

        it('keep a reference to the corresponding record model', () => {
            var recordAttr = model.get('record');
            assert(recordAttr === record);
        });

        it('have a collection of original key-value pairs', () => {
            assert(model.values instanceof Backbone.Collection);
        });

        describe('original value collections', () => {
            it('only contain key-value pairs for the corresponding field', () => {
                assert(model.values.length === 0);
                _.each(['title', 'contributor', 'genre'], (fieldName) => {
                    fieldName = `edpoprec:${fieldName}`;
                    var attr = record.get(fieldName);
                    assert(attr);
                    if (!_.isArray(attr)) attr = [attr];
                    assert(attr.length);
                    model = contents.get(fieldName);
                    assert(model.values.length === attr.length);
                });
            });
        });

        it('have a collection of annotations', () => {
            assert(model.annotations instanceof Backbone.Collection);
        });

        describe('annotation collections', () => {
            it('only contain annotations for the corresponding field', () => {
                assert(model.annotations.length === 0);
                _.each(['contributor', 'bookseller', 'genre'], (fieldName) => {
                    fieldName = `edpoprec:${fieldName}`;
                    model = contents.get(fieldName);
                    var anno = record.annotations.filter({
                        'edpopcol:field': fieldName
                    });
                    assert(anno.length > 0);
                    assert(model.annotations.length === anno.length);
                });
            });
        });

        it('have a presentation-oriented content collection', () => {
            assert(model.content instanceof Backbone.Collection);
        });

        describe('presentation collections', () => {
            var content;

            beforeEach(() => {
                content = model.content;
            });

            it('always hold an entry for the field as a whole', () => {
                assert(content.length === 1);
                var entry = content.at(0);
                assert(entry.id === fieldName);
                assert(entry.get('field') === true);
            });

            describe('automatically update', () => {
                var addSpy, changeSpy, removeSpy, value = 'KBH 1700 D2';

                beforeEach(() => {
                    addSpy = sinon.spy();
                    changeSpy = sinon.spy();
                    removeSpy = sinon.spy();
                    content.on({
                        add: addSpy,
                        change: changeSpy,
                        remove: removeSpy
                    });
                });

                afterEach(() => {
                    addSpy = null;
                    changeSpy = null;
                    removeSpy = null;
                });

                it('when the field is set in the original record', () => {
                    var size = content.length;
                    var fieldEntry = content.get(fieldName);
                    assert(fieldEntry.get('isFirst'));
                    record.set(fieldName, {
                        '@id': bnode(),
                        '@type': 'edpoprec:Field',
                        'edpoprec:originalText': value
                    });
                    assert(content.length === size + 1);
                    var entry = content.get(value);
                    assert(entry instanceof Backbone.Model);
                    assert(entry.get('uncorrected') === true);
                    assert(entry.get('isFirst'));
                    assert(!fieldEntry.get('isFirst'));
                    var original = entry.get('original');
                    assert(original instanceof Backbone.Model);
                    assert(original.get('key') === fieldName);
                    assert(matchOriginalText(value)(original));
                    assert(original.collection === contents.values);
                    assert(addSpy.calledOnceWith(entry));
                    assert(removeSpy.notCalled);
                });

                // The following scenario may not seem desirable at first
                // glance, but may occur if the annotation was linked at first,
                // the originalText was removed from the record afterwards, and
                // the contents collection is already created before the
                // annotations are fetched.
                it('when an unlinked correction is fetched later', () => {
                    var size = content.length, pastValue = 'dunno somewhere';
                    var sameField = contents.values.filter({key: fieldName});
                    assert(!_.find(sameField, matchOriginalText(pastValue)));
                    var anno = record.annotations.add({
                        '@id': bnode(),
                        '@type': 'edpopcol:Annotation',
                        'edpopcol:field': fieldName,
                        'edpopcol:originalText': pastValue,
                        'oa:hasBody': value
                    });
                    assert(content.length === size + 1);
                    var entry = content.get(`${pastValue} → ${value}`);
                    assert(entry instanceof Backbone.Model);
                    assert(entry.get('edit') === anno);
                    assert(!entry.has('original'));
                    assert(entry.get('dangling') === true);
                    assert(entry.get('originalText') === pastValue);
                    assert(entry.get('correctedText') === value);
                    assert(addSpy.calledOnceWith(entry));
                    assert(removeSpy.notCalled);
                });

                it('when an addition is added', () => {
                    var size = content.length;
                    var anno = record.annotations.add({
                        '@id': bnode(),
                        '@type': 'edpopcol:Annotation',
                        'edpopcol:field': fieldName,
                        'oa:hasBody': value
                    });
                    assert(content.length === size + 1);
                    var entry = content.get(`→ ${value}`);
                    assert(entry instanceof Backbone.Model);
                    assert(entry.get('edit') === anno);
                    assert(entry.get('correctedText') === value);
                    assert(addSpy.calledOnceWith(entry));
                    assert(removeSpy.notCalled);
                });
            });
        });

        describe('prepopulated presentation collections', () => {
            var content, fieldName = 'edpoprec:contributor';

            beforeEach(() => {
                model = contents.get(fieldName);
                content = model.content;
            });

            afterEach(() => {
                content = null;
            });

            it('omit entries for original values that have corrections', () => {
                assert(content.length === 8);
                assert(!content.get(contributor.value1.original));
                assert(content.get(contributor.value1.id1));
                assert(content.get(contributor.value1.id2));
            });

            it('link entries to corresponding value and annotation models', () => {
                var values = model.values, annotations = model.annotations;
                var val1 = values.find(
                    matchOriginalText(contributor.value1.original)
                );
                var cor1 = annotations.find({
                    'oa:hasBody': contributor.value1.correction1
                });
                var cor2 = annotations.find({
                    'oa:hasBody': contributor.value1.correction2
                });
                var entry1 = content.get(contributor.value1.id1);
                var entry2 = content.get(contributor.value1.id2);
                assert(val1 && cor1 && cor2 && entry1 && entry2);
                assert(entry1.get('original') === val1);
                assert(entry1.get('edit') === cor1);
                assert(entry2.get('original') === val1);
                assert(entry2.get('edit') === cor2);
                var val3 = values.find(matchOriginalText(contributor.value2.original2));
                var entry3 = content.get(contributor.value2.original2);
                var cor4 = annotations.find({
                    'oa:hasBody': contributor.value2.correction
                });
                var entry4 = content.get(contributor.value2.id1);
                assert(val3 && entry3 && cor4 && entry4);
                assert(entry3.get('original') === val3);
                assert(!entry4.has('original'));
                assert(entry4.get('edit') === cor4);
                var val5 = values.find(matchOriginalText(contributor.value3.original));
                var entry5 = content.get(contributor.value3.original);
                assert(val5 && entry5);
                assert(entry5.get('original') === val5);
                var val6 = values.find(matchOriginalText(contributor.value4.original));
                var cor6 = annotations.find({
                    'oa:hasBody': contributor.value4.correction
                });
                var entry6 = content.get(contributor.value4.id);
                assert(val6 && cor6 && entry6);
                assert(entry6.get('original') === val6);
                assert(entry6.get('edit') === cor6);
                var add7 = annotations.find({
                    'oa:hasBody': contributor.value5.addition
                });
                var entry7 = content.get(contributor.value5.id);
                assert(add7 && entry7);
                assert(entry7.get('edit') === add7);
            });

            describe('update automatically', () => {
                var addSpy, changeSpy, removeSpy, oldValue,
                    newName = 'Zuo Qiu Ming',
                    fullName = 'Isabel Angélica Allende Llona';

                beforeEach(() => {
                    addSpy = sinon.spy();
                    changeSpy = sinon.spy();
                    removeSpy = sinon.spy();
                    content.on({
                        add: addSpy,
                        change: changeSpy,
                        remove: removeSpy
                    });
                    oldValue = record.get(fieldName);
                });

                afterEach(() => {
                    addSpy = null;
                    changeSpy = null;
                    removeSpy = null;
                });

                function updateValue(position, oldName, newName) {
                    assert(oldValue && oldValue.length === 4);
                    var oldField = oldValue[position];
                    assert(oldField['edpoprec:originalText'] === oldName);
                    var newValue = _.clone(oldValue);
                    if (newName) {
                        var newField = _.defaults({
                            'edpoprec:originalText': newName,
                        }, oldField);
                        newValue.splice(position, 1, newField);
                    } else {
                        newValue.splice(position, 1);
                    }
                    record.set(fieldName, newValue);
                }

                it('when a correction is removed', () => {
                    var cor = model.annotations.find({
                        'oa:hasBody': contributor.value1.correction1,
                    });
                    var entry = content.get(contributor.value1.id1);
                    record.annotations.remove(cor);
                    assert(addSpy.notCalled);
                    assert(changeSpy.notCalled);
                    assert(removeSpy.calledOnceWith(entry));
                    assert(content.length === 7);
                });

                it('when a dangling correction is relinked', () => {
                    var cor = model.annotations.find({
                        'oa:hasBody': contributor.value2.correction,
                    });
                    assert(!content.get(contributor.value2.original1));
                    var entry1 = content.get(contributor.value2.original2);
                    var entry2 = content.get(contributor.value2.id1);
                    assert(entry2.get('dangling'));
                    var val = entry1.get('original');
                    cor.set('edpopcol:originalText', contributor.value2.original2);
                    var entry3 = content.get(contributor.value2.id2);
                    assert(addSpy.calledOnceWith(entry3));
                    assert(removeSpy.calledTwice);
                    assert(removeSpy.calledWith(entry1));
                    assert(removeSpy.calledWith(entry2));
                    assert(content.length === 7);
                    assert(entry3.get('original') === val);
                    assert(!entry3.get('dangling'));
                    assert(entry3.get('edit') === cor);
                    assert(entry3.get('originalText') === contributor.value2.original2);
                    assert(entry3.get('correctedText') === contributor.value2.correction);
                });

                it('when an original value is updated', () => {
                    assert(!content.get(newName));
                    var entry1 = content.get(contributor.value3.original);
                    updateValue(2, contributor.value3.original, newName);
                    var entry2 = content.get(newName);
                    assert(entry2 instanceof Backbone.Model);
                    assert(addSpy.calledOnceWith(entry2));
                    assert(changeSpy.notCalled);
                    assert(removeSpy.calledOnceWith(entry1));
                    assert(content.length === 8);
                });

                it('when a correction is added', () => {
                    var newId = `${contributor.value3.original} → ${newName}`;
                    var val = model.values.find(
                        matchOriginalText(contributor.value3.original)
                    );
                    var uncor = content.get(contributor.value3.original);
                    assert(uncor instanceof Backbone.Model);
                    assert(uncor.get('original') === val);
                    var cor = record.annotations.add({
                        '@id': bnode(),
                        '@type': 'edpopcol:Annotation',
                        'edpopcol:field': fieldName,
                        'edpopcol:originalText': contributor.value3.original,
                        'oa:hasBody': newName,
                    });
                    var entry = content.get(newId);
                    assert(entry instanceof Backbone.Model);
                    assert(entry.get('original') === val);
                    assert(entry.get('edit') === cor);
                    assert(entry.get('originalText') === contributor.value3.original);
                    assert(entry.get('correctedText') === newName);
                    assert(addSpy.calledOnceWith(entry));
                    assert(changeSpy.notCalled);
                    assert(removeSpy.calledOnceWith(uncor));
                    assert(content.length === 8);
                });

                it('when an original value is removed', () => {
                    var entry = content.get(contributor.value3.original);
                    updateValue(2, contributor.value3.original, null);
                    assert(addSpy.notCalled);
                    assert(changeSpy.notCalled);
                    assert(removeSpy.calledOnceWith(entry));
                    assert(content.length === 7);
                });

                it('when a correction is updated', () => {
                    var newId = `${contributor.value4.original} → ${fullName}`;
                    assert(!content.get(newId));
                    var cor = model.annotations.find({
                        'oa:hasBody': contributor.value4.correction,
                    });
                    var entry1 = content.get(contributor.value4.id);
                    cor.set('oa:hasBody', fullName);
                    var entry2 = content.get(newId);
                    assert(entry2 && entry2 !== entry1);
                    assert(addSpy.calledOnceWith(entry2));
                    assert(changeSpy.notCalled);
                    assert(removeSpy.calledOnceWith(entry1));
                    assert(content.length === 8);
                });

                it('when an original value becomes unmasked', () => {
                    var cor = model.annotations.find({
                        'oa:hasBody': contributor.value4.correction,
                    });
                    var entry1 = content.get(contributor.value4.id);
                    record.annotations.remove(cor);
                    var entry2 = content.get(contributor.value4.original);
                    assert(entry2 instanceof Backbone.Model);
                    assert(addSpy.calledOnceWith(entry2));
                    assert(changeSpy.notCalled);
                    assert(removeSpy.calledOnceWith(entry1));
                    assert(content.length === 8);
                });

                it('when a correction becomes unlinked', () => {
                    assert(!content.get(fullName));
                    var entry1 = content.get(contributor.value4.id);
                    assert(!entry1.get('dangling'));
                    var entry1spy = sinon.spy(() => {
                        var changedAttributes = entry1.changedAttributes();
                        assert('original' in changedAttributes);
                        assert('order' in changedAttributes);
                        assert('dangling' in changedAttributes);
                        assert(_.size(changedAttributes) === 3);
                    });
                    entry1.on('change', entry1spy);
                    updateValue(3, contributor.value4.original, fullName);
                    var entry2 = content.get(fullName);
                    assert(entry2 instanceof Backbone.Model);
                    var original = entry2.get('original');
                    assert(original instanceof Backbone.Model);
                    assert(addSpy.calledOnceWith(entry2));
                    assert(changeSpy.calledOnceWith(entry1));
                    assert(removeSpy.notCalled);
                    assert(entry1spy.calledOnce);
                    assert(!entry1.has('original'));
                    assert(entry1.get('dangling'));
                    entry1.off();
                    assert(content.length === 9);
                });

                it('when an addition is removed', () => {
                    var add = model.annotations.find({
                        'oa:hasBody': contributor.value5.addition,
                    });
                    var entry = content.get(contributor.value5.id);
                    record.annotations.remove(add);
                    assert(addSpy.notCalled);
                    assert(changeSpy.notCalled);
                    assert(removeSpy.calledOnceWith(entry));
                    assert(content.length === 7);
                });

                it('when an addition is updated', () => {
                    var newName = 'Lucius Domitius Ahenobarbus';
                    var newId = `→ ${newName}`;
                    assert(!content.get(newId));
                    var add = model.annotations.find({
                        'oa:hasBody': contributor.value5.addition,
                    });
                    var entry1 = content.get(contributor.value5.id);
                    add.set('oa:hasBody', newName);
                    var entry2 = content.get(newId);
                    assert(addSpy.calledOnceWith(entry2));
                    assert(changeSpy.notCalled);
                    assert(removeSpy.calledOnceWith(entry1));
                    assert(content.length === 8);
                    assert(entry2.get('edit') === add);
                    assert(entry2.get('correctedText') === newName);
                });

                it('when an original value is marked as deleted', () => {
                    var incorrect = contributor.value3.original;
                    var entry1 = content.get(incorrect);
                    assert(entry1);
                    var del = model.annotations.underlying.add({
                        '@id': bnode(),
                        '@type': 'oa:Annotation',
                        'edpopcol:field': fieldName,
                        'edpopcol:originalText': incorrect,
                        'marksDeletion': true,
                    });
                    assert(del instanceof Backbone.Model);
                    assert(removeSpy.calledOnceWith(entry1));
                    assert(changeSpy.notCalled);
                    assert(addSpy.calledOnce);
                    var entry2 = addSpy.lastCall.firstArg;
                    assert(entry2 instanceof Backbone.Model);
                    assert(content.get(entry2));
                    assert(entry2 !== entry1);
                    assert(entry2.get('original') === entry1.get('original'));
                    assert(entry2.get('originalText') === incorrect);
                    assert(entry2.get('edit') === del);
                    assert(content.length === 8);
                });
            });

            it('mark the first model with an attribute', () => {
                var first = content.first();
                assert(first.get('isFirst'));
                _.each(content.tail(), model => assert(!model.get('isFirst')));
                var formerFirst = first;
                _.each([content.values, content.annotations], collection => {
                    _.chain(collection.models).clone().each(model => {
                        collection.remove(model);
                        first = content.first();
                        if (first !== formerFirst) {
                            assert(first.get('isFirst'));
                            assert(!formerFirst.get('isFirst'));
                        }
                        formerFirst = first;
                    });
                });
            });
        });
    });
});
