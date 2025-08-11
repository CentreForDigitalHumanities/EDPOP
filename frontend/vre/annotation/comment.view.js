import { View } from '../core/view.js';
import commentTemplate from './comment.view.mustache';

/**
 * Displays a single model from a FlatFields or FlatAnnotations collection.
 */
export var CommentView = View.extend({
    tagName: 'tr',
    template: commentTemplate,

    events: {
        'click': 'edit',
    },

    initialize: function(options) {
        _.assign(this, _.pick(options, ['fieldAnnotation']));
        this.render().listenTo(this.model, 'change', this.render);
    },

    render: function() {
        // Check if model is of Field model before using these methods, because
        // there are some tests relating to old-style annotations that assign
        // custom models
        var templateData = {};
        var publishedDate = this.model.getPublishedDate();
        var updatedDate = this.model.getUpdatedDate();
        var author = this.model.getAuthor();
        Object.assign(templateData, {
            isFieldAnnotation: this.fieldAnnotation,
            isTag: this.model.getAnnotationType() === 'tag',
            displayText: this.model.getDisplayText(),
            author: (author ? author.getUsername() : null),
            publishedDate: (publishedDate ? publishedDate.toLocaleString() : null),
            updatedDate: (updatedDate ? updatedDate.toLocaleString() : null),
        });
        this.$el.html(this.template(templateData));
        return this;
    },

    edit: function(event) {
        this.model.trigger('edit', this.model);
    },
});
