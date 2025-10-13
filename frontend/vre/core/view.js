import _ from 'lodash';
import { View as BBView } from 'backbone';
import { CompositeView as FComposite, CollectionView } from 'backbone-fractal';
import { getAltClickMixin } from '@uu-cdh/backbone-util';

function mix(Base) {
    return Base.extend(_.extend(getAltClickMixin(), {
        constructor: function(options) {
            Base.call(this, options);
            this.enableAltClick();
        },

        remove: function() {
            this.$el.off('click');
            return Base.prototype.remove.call(this);
        },
    }));
}

/**
 * Common base classes for all of our views.
 * Among other things, they enable alt-click debugging.
 */

/** @class */
export var View = mix(BBView);
/** @class */
export var CompositeView = mix(FComposite);
/** @class */
export var AggregateView = mix(CollectionView);
