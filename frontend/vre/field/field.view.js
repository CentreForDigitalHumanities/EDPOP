import { AggregateView } from '../core/view.js';
import {Annotation} from "../annotation/annotation.model";
import { FieldValueView } from './field-value.view.js';
import fieldRelinkTemplate from './field.relink.options.mustache';

export var FieldView = AggregateView.extend({
    tagName: 'tr',
    template: fieldTemplate,
    subview: CommentView,
    container: 'div.annotations',

    initialize: function(options) {
        this.render().listenTo(this.model, 'change:value', this.render);
        this.listenTo(this.collection, 'update', this.render);
        parent(this).initialize.call(this, options);
    },

    makeItem: function(model) {
        return new this.subview({model: model, fieldAnnotation: true});
    },

    events: {
        'click a.comment': 'addEdit',
    },

    hasEdit: function() {
        return this.collection.length > 0; // TODO check for just edits
    },

    renderContainer: function() {
        const templateData = {
            field: this.model.get('key'),
            hasNoEdit: !this.hasEdit(),
            isEmpty: !this.model.has('value'),
        };
        // Check if model is of Field model before using these methods, because
        // there are some tests relating to old-style annotations that assign
        // custom models
        if (typeof this.model.getMainDisplay === 'function') {
            Object.assign(templateData, {
                displayText: this.model.getMainDisplay(),
                fieldInfo: this.model.getFieldInfo(),
            });
            var linkedUri = this.model.getLinkedUri();
            if (linkedUri) {
                templateData.linkedRecordUri = encodeURIComponent(linkedUri);
            }
        }
        this.$el.html(this.template(templateData));
        return this;
    },

    addEdit: function(event) {
        event.preventDefault();
        var fieldId = this.model.get('key');
        var fieldContents = this.model.get('value'); // If undefined, this field did not exist in the original record
        var attributes = {
            "oa:hasSource": this.collection.underlying.target,
            "edpopcol:field": fieldId,
            "motivation": (fieldContents ? "oa:editing" : "oa:describing"),
        };
        if (fieldContents) {
            attributes['edpopcol:originalText'] = fieldContents['edpoprec:originalText'];
            this.edit(new Annotation(attributes), fieldContents['edpoprec:originalText']);
        } else {
            this.edit(new Annotation(attributes));
        }
    },
});
