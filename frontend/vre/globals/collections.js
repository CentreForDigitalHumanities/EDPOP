import _ from 'lodash';

import { vreChannel } from '../radio';
import { VRECollections } from '../collection/collection.model';

// The next two variables are exported, but only for consumption by the main
// module. Other code units should use the radio interface at the bottom!

// All collections that the user can access.
export var myCollections = new VRECollections();

// Same but without the one currently selected.
export var unsalientCollections = new VRECollections();

// We ensure that unsalientCollections stays in sync with myCollections.
myCollections.on({
    add: collection => unsalientCollections.add(collection),
    remove: collection => unsalientCollections.remove(collection),
});

// Deferred initialization of myCollections.
function initMine(callback) {
    VRECollections.mine(myCollections);
    myCollections.once('sync', callback);
    return myCollections;
}

// Injectable interface for unit modules.
vreChannel.reply('unsalientcollections', _.constant(unsalientCollections));
vreChannel.reply('allcollections', _.constant(myCollections));
vreChannel.reply('collections:fetch', initMine);
