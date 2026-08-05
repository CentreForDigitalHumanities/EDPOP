import _ from 'lodash';

import { AggregateView } from '../core/view.js';
import { Annotation } from '../annotation/annotation.model';
import { FieldValueView } from './field-value.view.js';
import fieldRelinkTemplate from './field.relink.options.mustache';

export var FieldView = AggregateView.extend({
    tagName: 'tbody',
    subview: FieldValueView,

    initialize: function(options) {
        this.collection || this.model && this.collection = this.model.content;
        this.initItems().render().initCollectionEvents();
        this.listenTo(this.collection, _.pick(this, [
            'addValue', 'edit', 'requestRelink', 'discard',
        ]));
    },

    addValue: function(model, view, event) {

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
