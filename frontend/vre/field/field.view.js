import _ from 'lodash';

import { vreChannel } from '../radio.js';
import { AggregateView } from '../core/view.js';
import { Annotation } from '../annotation/annotation.model';
import { AnnotationEditView } from '../annotation/annotation.edit.view';
import { OverlayView } from '../utils/overlay.view.js';
import { FieldValueView } from './field-value.view.js';

/**
 * Table section with one or more rows presenting any original value(s) and
 * edit(s) of a field in a record. Always ends with a single empty row that
 * enables users to create additions.
 * @class
 * @extends AggregateView
 */
export var FieldView = AggregateView.extend(/**
                                             * @lends FieldView.prototype
                                             */{
    tagName: 'tbody',
    /** @member {module:'./field.model.js'.RecordField} model */
    /** @member {module:'./field.model.js'.CombinedFieldValues} collection */
    /**
     * @member subview
     * @class
     * @extends FieldValueView
     */

    initialize: function(options) {
        this.collection = this.collection || this.model && this.model.content;
        this.initItems().render().initCollectionEvents();
        this.listenTo(this.collection, _.pick(this, ['edit', 'discard']));
    },

    makeItem: function(model) {
        return new FieldValueView({
            model: model,
            relinkOptions: this.model.values,
        });
    },

    remove: function() {
        this.cancel();
        return FieldView.__super__.remove.call(this);
    },

    /**
     * Create a correction for the model that triggered an `edit` event and
     * overlay the corresponding subview with an {@link AnnotationEditView}.
     * @listens #collection~event:edit
     * @param {module:'./field.model.js'.CombinedFieldValues#model} model
     * @param {FieldValueView} view
     */
    edit: function(model, view) {
        this.cancel();
        var user = vreChannel.request('user'),
            originalText = model.get('originalText'),
            edit = model.get('edit'),
            correctedText = model.get('correctedText'),
            newEdit;
        if (
            edit && user &&
            edit.getAuthor().getUsername() === user.get('username')
        ) {
            newEdit = edit.clone();
        } else {
            newEdit = this.makeEdit(originalText);
            correctedText && newEdit.set('oa:hasBody', correctedText);
        }
        var editor = new AnnotationEditView({
            model: newEdit,
            defaultText: originalText,
        }).on(_.pick(this, ['save', 'cancel', 'trash']), this);
        /** @member */
        this.editor = new OverlayView({
            root: view.el,
            target: 'td.vre-field-value',
            guest: editor,
        });
        this.editor.cover();
    },

    /**
     * Common logic of methods that create edits.
     */
    makeEdit: function(originalText) {
        var newEdit = new Annotation({
            'context': vreChannel.request('projects:current').id,
            'oa:hasSource': this.model.get('record').id,
            'edpopcol:field': this.model.id,
            'motivation': 'oa:editing',
        });
        originalText && newEdit.set('edpopcol:originalText', originalText);
        return newEdit;
    },

    /**
     * If one of the subviews currently has an editor overlay, remove the
     * overlay.
     * @listens #editor~event:cancel
     * @returns {FieldView} this
     */
    cancel: function() {
        if (!this.editor) return;
        this.editor.remove();
        delete this.editor;
        return this;
    },

    /**
     * Save the current edit while removing the editor overlay.
     * @listens #editor~event:save
     * @param {AnnotationEditView} editor
     */
    save: function(editor) {
        var model = editor.model;
        this.cancel();
        model = this.model.annotations.underlying.add(model, {merge: true});
        model.save();
    },

    /**
     * Delete the current edit while removing the editor overlay.
     * @listens #editor~event:trash
     * @param {AnnotationEditView} editor
     */
    trash: function(editor) {
        this.dropEdit(editor.model);
    },

    /**
     * Remove an edit OR mark an original value as deleted, depending on the
     * targeted `model`. Indirect handler for the xmark buttons in the subviews.
     * @listens #collection~event:discard
     * @param {module:'./field.model.js'.CombinedFieldValues#model} model
     */
    discard: function(model) {
        var edit = model.get('edit');
        if (edit) return this.dropEdit(edit);
        var originalText = model.get('originalText');
        if (originalText == null) return;
        edit = this.makeEdit(originalText);
        edit.set('marksDeletion', true);
        this.save({model: edit});
    },

    /**
     * Delete the given edit while removing any editor overlay.
     * @param {Annotation} model
     */
    dropEdit: function(model) {
        this.cancel();
        this.model.annotations.underlying.remove(model);
    },
});
