import { View } from '../core/view.js';
import projectMenuItemTemplate from './project.menu.item.view.mustache';

export var ProjectMenuItemView = View.extend({
    template: projectMenuItemTemplate,

    events: {
        'click': 'select',
    },

    initialize: function () {
        this.render().listenTo(this.model, {
            select: this.activate,
            deselect: this.deactivate,
        });
    },

    render: function () {
        this.$el.html(this.template(this.model.attributes));
        return this;
    },

    select: function (event) {
        event.preventDefault();
        this.model.trigger('select', this.model);
    },

    activate: function (model) {
        this.$(".dropdown-item").addClass('active');
    },

    deactivate: function (model) {
        this.$(".dropdown-item").removeClass('active');
    },
});
