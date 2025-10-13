import Backbone from 'backbone';

/**
 * Common base for views that provide behaviour revolving around a
 * single checkbox. When deriving a subclass, bind the `toggle`
 * method to the right checkbox and set `this.$checkbox` in the
 * `render` method.
 */
export var SelectableView = Backbone.View.extend({
    toggle: function(event) {
        // The assignment in the if condition is on purpose (assign + check).
        event.preventDefault();
        if (this.selected = event.target.checked) {
            this.trigger('check');
        } else {
            this.trigger('uncheck');
        }
    },
    check: function() {
        this.$checkbox.prop('checked', true);
        this.selected = true;
        return this;
    },
    uncheck: function() {
        this.$checkbox.prop('checked', false);
        this.selected = false;
        return this;
    },
});
