import { View } from '../core/view.js';
import accountMenuTemplate from './account.menu.view.mustache';

export var AccountMenuView = View.extend({
    tagName: 'li',
    className: 'nav-item dropdown',
    template: accountMenuTemplate,

    initialize: function(options) {
        this.render().listenTo(this.model, 'change', this.render);
    },

    render: function() {
        this.$el.html(this.template(this.model.attributes));
        return this;
    },
});
