import fieldTemplate from './field.view.mustache';
import {CommentView} from "../annotation/comment.view";
import {Annotation} from "../annotation/annotation.model";
import {AnnotatableView} from "./annotatable.view";
import {parent} from "@uu-cdh/backbone-collection-transformers/src/inheritance";

/**
 * Displays a single model from a FlatFields or FlatAnnotations collection.
 */
export var FieldView = AnnotatableView.extend({
    tagName: 'tr',
    template: fieldTemplate,
    subview: CommentView,
    container: 'div.annotations',

    initialize: function(options) {
        this.render().listenTo(this.model, 'change:value', this.render);
        parent(this).initialize.call(this, options);
    },

    makeItem: function(model) {
        return new this.subview({model: model, fieldAnnotation: true});
    },

    events: {
        'click a.comment': 'addComment',
    },

    renderContainer: function() {
        const templateData = {
            field: this.model.get('key'),
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

    addComment: function(event) {
        event.preventDefault();
        var fieldId = this.model.get('key');
        var fieldContents = this.model.get('value');
        var attributes = {
            "oa:hasSource": this.collection.underlying.target,
            "edpopcol:field": fieldId,
            "motivation": "oa:commenting",
        };
        if (fieldContents) {
            attributes['edpopcol:originalText'] = fieldContents['edpoprec:originalText'];
        }
        this.edit(new Annotation(attributes));
    },
});
