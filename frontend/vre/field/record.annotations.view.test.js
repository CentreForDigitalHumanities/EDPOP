import assert from 'assert';
import sinon from 'sinon';
import { isEmpty, last, indexOf, find, compact } from 'lodash';
import { Collection }  from 'backbone';

import { vreChannel } from '../radio.js';
import { FlatAnnotations } from '../annotation/annotation.model.js';
import { AnnotationEditView } from '../annotation/annotation.edit.view.js';
import { RecordFieldsBaseView } from './record.base.view.js';
import { RecordAnnotationsView } from './record.annotations.view.js';

// Test fixtures.

var currentContext = 'monsters';

var fakeProjectMenu = {
    model: {
        get() {
            return currentContext;
        }
    }
};

var TestCollection = Collection.extend({
    modelId: FlatAnnotations.prototype.modelId,
});

var testAnnotations = [{
    key: 'Color',
    value: 'moss',
    context: 'me, myself and I',
}, {
    key: 'Pet',
    value: 'Slimey',
    context: currentContext,
}];

var numAnnotations = testAnnotations.length;
var oneUp = numAnnotations + 1;
var oneDown = numAnnotations - 1;

// Specs and suites that apply under multiple circumstances.

function assertEditorAppended() {
    assert(this.view.items.length === oneUp);
    assert(this.view.$('tr').length === oneUp);
    assert(this.editor instanceof AnnotationEditView);
    assert(this.view.$('tr').get(-1) === this.editor.el);
}

function assertEditorRemoved() {
    assert(!find(this.view.items, this.editor));
    assert(!find(this.view.$('tr').get(), this.editor.el));
}

function assertFieldRestored() {
    assert(this.view.items.length === numAnnotations);
    assert(this.view.$('tr').length === numAnnotations);
    var newFieldView = this.view.items[this.position];
    assert(newFieldView.model === this.fieldView.model)
    assert(!(newFieldView instanceof AnnotationEditView));
}

function assertNoNewField() {
    assert(compact(this.view.items).length === numAnnotations);
    assert(this.view.$('tr').length === numAnnotations);
}

function assertCollectionUnchanged() {
    assert(this.detectChange.notCalled);
    assert(this.collection.length === numAnnotations);
}

function newAnnotationCanceled() {
    beforeEach(function() {
        this.editor.trigger('cancel', this.editor);
    });

    it('discards the new AnnotationEditView', assertEditorRemoved);
    it('does not add a new fieldView', assertNoNewField);
    it('does not touch the models in the collection', assertCollectionUnchanged);
}

function newAnnotationSaved() {
    beforeEach(function() {
        this.position = indexOf(this.view.items, this.editor);
        this.editor.trigger('save', this.editor);
    });

    it('discards the new AnnotationEditView', assertEditorRemoved);

    it('adds a static FieldView', function() {
        assert((this.view.items).length === oneUp);
        assert(this.view.$('tr').length === oneUp);
        assert(this.view.items[this.position].model === this.editor.model);
    });

    it('adds the corresponding model to the collection', function() {
        assert(this.detectAdd.called);
        assert(this.detectChange.notCalled);
        assert(this.detectRemove.notCalled);
        assert(this.collection.length === oneUp);
        assert(this.collection.at(this.position) === this.editor.model);
    });
}

function newAnnotationTrashed() {
    beforeEach(function() {
        this.editor.trigger('trash', this.editor);
    });

    it('discards the new AnnotationEditView', assertEditorRemoved);
    it('does not add a new fieldView', assertNoNewField);
    it('does not touch the models in the collection', assertCollectionUnchanged);
}

// Finally! The actual suite.

describe('RecordAnnotationsView', function() {
    before(function() {
        vreChannel.reply('projects:current', () => fakeProjectMenu.model);
    });

    beforeEach(function() {
        this.collection = new TestCollection(testAnnotations).on({
            add: this.detectAdd = sinon.fake(),
            change: this.detectChange = sinon.fake(),
            remove: this.detectRemove = sinon.fake(),
        });
        this.view = new RecordAnnotationsView({collection: this.collection});
        this.view.render();
    });

    afterEach(function() {
        this.view.remove();
        this.collection.off();
    });

    after(function() {
        vreChannel.stopReplying('projects:current');
    });

    it('inherits from RecordFieldsBaseView', function() {
        assert(this.view instanceof RecordFieldsBaseView);
    });

    it('has a button for adding new fields', function() {
        var button = this.view.$('table + button');
        assert(button.length === 1);
        var text = button.text();
        assert(/new.+field/i.test(text));
    });

    describe('when adding a new field', function() {
        beforeEach(function() {
            this.view.$('table + button').click();
            this.editor = last(this.view.items);
        });

        it('appends a new AnnotationEditView', assertEditorAppended);

        describe('on cancel', newAnnotationCanceled);
        describe('on save', newAnnotationSaved);
        describe('on trash', newAnnotationTrashed);
    });

    describe('when editing a previously unedited field', function() {
        beforeEach(function() {
            this.fieldView = this.view.items[0];
            this.affectedModel = this.fieldView.model;
            assert(this.affectedModel === this.collection.at(0));
            assert(this.affectedModel.get('context') !== currentContext);
            this.affectedElement = this.fieldView.$el;
            assert(this.affectedElement.get(0) === this.view.$('tr').get(0));
            this.affectedElement.click();
            this.editor = last(this.view.items);
        });

        it('leaves the original row in place', function() {
            assert(this.detectChange.notCalled);
            assert(this.detectRemove.notCalled);
            assert(this.fieldView === this.view.items[0]);
            assert(this.affectedModel === this.collection.at(0));
            assert(this.affectedElement.get(0) === this.view.$('tr').get(0));
        });

        it('appends a new AnnotationEditView', assertEditorAppended);

        it('copies key and value but overrides the context', function () {
            var newModel = this.editor.model;
            assert(newModel.get('key') === this.affectedModel.get('key'));
            assert(newModel.get('value') === this.affectedModel.get('value'));
            assert(newModel.get('context') === currentContext);
        });

        describe('on cancel', newAnnotationCanceled);
        describe('on save', newAnnotationSaved);
        describe('on trash', newAnnotationTrashed);
    });

    describe('when editing a previously edited field', function() {
        beforeEach(function() {
            this.position = 1;
            this.fieldView = this.view.items[this.position];
            this.affectedModel = this.fieldView.model;
            assert(this.affectedModel === this.collection.at(this.position));
            assert(this.affectedModel.get('context') === currentContext);
            this.affectedElement = this.fieldView.$el;
            assert(this.affectedElement.get(0) === this.view.$('tr').get(this.position));
            this.affectedElement.click();
            this.editor = this.view.items[this.position];
        });

        it('removes the original row but keeps the model', function() {
            assert(this.detectChange.notCalled);
            assert(this.detectRemove.notCalled);
            assert(!find(this.view.items, this.fieldView));
            assert(this.affectedModel === this.collection.at(this.position));
            assert(!find(this.view.$('tr').get(), this.affectedElement.get(0)));
        });

        it('inserts a new AnnotationEditView', function() {
            assert(this.view.items.length === numAnnotations);
            assert(this.view.$('tr').length === numAnnotations);
            assert(this.editor instanceof AnnotationEditView);
            assert(this.view.$('tr').get(this.position) === this.editor.el);
        });

        it('edits the pre-existing model', function() {
            assert(this.editor.model === this.fieldView.model);
        });

        describe('on cancel', function() {
            beforeEach(function() {
                this.editor.trigger('cancel', this.editor);
            });

            it('discards the new AnnotationEditView', assertEditorRemoved);
            it('reinstates the fieldView', assertFieldRestored);
            it('does not touch the models in the collection', assertCollectionUnchanged);
        });

        describe('on save', function() {
            beforeEach(function() {
                this.editor.trigger('save', this.editor);
            });

            it('discards the new AnnotationEditView', assertEditorRemoved);
            it('reinstates the fieldView', assertFieldRestored);

            it('saves the corresponding model in place', function() {
                assert(this.detectAdd.notCalled);
                assert(this.detectRemove.notCalled);
                assert(this.collection.length === numAnnotations);
                assert(this.collection.at(this.position) === this.editor.model);
            });
        });

        describe('on trash', function() {
            beforeEach(function() {
                this.editor.trigger('trash', this.editor);
            });

            it('discards the new AnnotationEditView', assertEditorRemoved);

            it('does not reinstate the fieldView', function() {
                assert(compact(this.view.items).length === oneDown);
                assert(this.view.$('tr').length === oneDown);
                assert(!find(this.view.items, row => row.model === this.affectedModel));
            });

            it('removes the model from the collection', function() {
                assert(this.collection.length === oneDown);
                assert(this.detectRemove.calledWith(this.affectedModel));
            });
        });
    });
});
