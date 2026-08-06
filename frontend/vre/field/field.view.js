import _ from 'lodash';
import { $ } from 'backbone';

import { vreChannel } from '../radio.js';
import { AggregateView } from '../core/view.js';
import { Annotation } from '../annotation/annotation.model';
import { AnnotationEditView } from '../annotation/annotation.edit.view';
import { OverlayView } from '../utils/overlay.view.js';
import { FieldValueView } from './field-value.view.js';
import fieldRelinkTemplate from './field.relink.options.mustache';

export var FieldView = AggregateView.extend({
    tagName: 'tbody',
    subview: FieldValueView,

    initialize: function(options) {
        this.collection || this.model && this.collection = this.model.content;
        this.initItems().render().initCollectionEvents();
        this.listenTo(this.collection, _.pick(this, [
            'edit', 'requestRelink', 'discard',
        ]));
    },

    remove: function() {
        this.cancel().clearRelinker();
        return FieldView.__super__.remove.call(this);
    },

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
        this.editor = new OverlayView({
            root: this.el,
            target: view.el,
            guest: editor,
        });
        this.editor.cover();
    },

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

    cancel: function() {
        if (!this.editor) return;
        this.editor.remove();
        delete this.editor;
        return this;
    },

    save: function(editor) {
        var model = editor.model;
        this.cancel();
        model = this.model.annotations.underlying.add(model, {merge: true});
        model.save();
    },

    trash: function(editor) {
        this.dropEdit(editor.model);
    },

    discard: function(model) {
        var edit = model.get('edit');
        if (edit) return this.dropEdit(edit);
        var originalText = model.get('originalText');
        if (originalText == null) return;
        edit = this.makeEdit(originalText);
        edit.set('marksDeletion', true);
        this.save({model: edit});
    },

    dropEdit: function(model) {
        this.cancel();
        this.model.annotations.underlying.remove(model);
    },

    requestRelink: function(model, view, event) {
        this.clearRelinker();
        this.relinkPopover = $(event.target).popover({
            trigger: 'focus',
            container: 'body',
            content: fieldRelinkTemplate(this.model),
            html: true,
            sanitize: false,
            placement: 'bottom',
            title: 'Relink edit to which original value?',
        });
        this.relinkPicker = $('body').one(
            'click',
            '.relink-option',
            this.pickRelinkOption.bind(this, model.get('edit')),
        );
    },

    clearRelinker: function() {
        if (!this.relinkPopover) return;
        this.relinkPopover.dispose();
        delete this.relinkPopover;
        this.relinkPicker.off();
        delete this.relinkPicker;
        return this;
    },

    pickRelinkOption: function(edit, event) {
        if (!edit) return;
        this.clearRelinker().cancel();
        edit.set('edpopcol:originalText', event.target.textContent);
        edit.save();
    },
});
