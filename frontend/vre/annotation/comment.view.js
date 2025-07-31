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
        this.render().listenTo(this.model, 'change:value', this.render);
    },

    render: function() {
        // Check if model is of Field model before using these methods, because
        // there are some tests relating to old-style annotations that assign
        // custom models
        var templateData = {};
        Object.assign(templateData, {
            displayText: this.model.get('value'),
        });
        this.$el.html(this.template(templateData));
        return this;
    },

    edit: function(event) {
        this.trigger('edit', this.model);
    },
});
