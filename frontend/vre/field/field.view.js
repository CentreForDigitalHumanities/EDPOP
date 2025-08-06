import { View } from '../core/view.js';
import fieldTemplate from './field.view.mustache';

/**
 * Displays a single model from a FlatFields or FlatAnnotations collection.
 */
export var FieldView = View.extend({
    tagName: 'tr',
    template: fieldTemplate,

    initialize: function(options) {
        this.render().listenTo(this.model, 'change:value', this.render);
    },

    render: function() {
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
        }
        this.$el.html(this.template(templateData));
        return this;
    },
});
