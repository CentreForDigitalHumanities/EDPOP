import { View } from '../core/view.js';
import editSummaryTemplate from './edit-summary.view.mustache';

export var EditSummaryView = View.extend({
    tagName: 'form',
    className: 'form-inline inline-editor',
    template: editSummaryTemplate,

    events: {
        submit: 'submit',
        reset: 'reset',
    },

    initialize: function() {
        this.render();
    },

    render: function() {
        this.$el.html(this.template(this));
        this.fillValue();
        return this;
    },

    fillValue: function() {
        this.$('input').val(this.model.get('summary'));
    },

    submit: function(event) {
        event.preventDefault();
        var payload = {
            summary: this.$('input').val(),
        };
        this.trigger('submit', payload);
        this.model.save(payload, {wait: true});
    },

    reset: function(event) {
        event.preventDefault();
        this.trigger('reset').fillValue();
    },
});
