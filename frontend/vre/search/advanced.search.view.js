import { View } from '../core/view.js';
import advancedSearchTemplate from './advanced.search.view.mustache';

export var AdvancedSearchView = View.extend({
    template: advancedSearchTemplate,
    events: {
        'click a': 'fill',
    },
    render: function() {
        $('#search-info').show();
        $('#search-info').popover({
            'html': true,
            'content': this.$el.html(this.template()),
            'container': 'body',
            'placement': 'left'
        });
    },
    fill: function(event) {
        event.preventDefault();
        var fillIn = event.target.textContent.slice(0, -9);
        this.trigger('fill', fillIn);
    },
});
