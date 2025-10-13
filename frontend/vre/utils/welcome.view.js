import { View } from '../core/view.js';

import welcomeTemplate from './welcome.view.mustache';

export var WelcomeView = View.extend({
    template: welcomeTemplate,
    initialize: function() {
        this.render();
    },
    render: function() {
        this.$el.html(this.template());
    },
});
