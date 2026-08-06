import _ from 'lodash';

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

    edit: function(model, view) {
        this.closeEditor();
        var project = vreChannel.request('projects:current').id,
            user = vreChannel.request('user'),
            original = model.get('original'),
            originalText = model.get('originalText'),
            edit = model.get('edit'),
            correctedText = model.get('correctedText'),
            annotation;
        if (
            edit && user &&
            edit.getAuthor().getUsername() === user.get('username')
        ) {
            annotation = edit.clone();
        } else {
            annotation = new Annotation({
                'context': project,
                'oa:hasSource': this.model.get('record').id,
                'edpopcol:field': this.model.id,
                'motivation': 'oa:editing',
            });
            originalText && annotation.set('edpopcol:originalText', originalText);

        }
    },

    addEdit: function(event) {
        event.preventDefault();
        var fieldId = this.model.get('key');
        var fieldContents = this.model.get('value'); // If undefined, this field did not exist in the original record
        var attributes = {
            'oa:hasSource': this.collection.underlying.target,
            'edpopcol:field': fieldId,
            'motivation': (fieldContents ? 'oa:editing' : 'oa:describing'),
        };
        if (fieldContents) {
            attributes['edpopcol:originalText'] = fieldContents['edpoprec:originalText'];
            this.edit(new Annotation(attributes), fieldContents['edpoprec:originalText']);
        } else {
            this.edit(new Annotation(attributes));
        }
    },
});
