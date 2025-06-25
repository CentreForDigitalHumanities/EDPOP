import _ from 'lodash';
import $ from 'jquery';
import Backbone from 'backbone';
import Cookies from 'jscookie';
import { wrapWithCSRF } from '@uu-cdh/backbone-util';

// Enable alt-click debugging (outcomment to disable).
window.DEBUGGING = true;

import './record/record.opening.aspect';
import { vreChannel } from './radio';
import { VRECollections } from './collection/collection.model';
import { CatalogSearchView } from './catalog/catalog.search.view';
import { BrowseCollectionView } from './collection/browse-collection.view';

import { SelectCollectionView } from './collection/select-collection.view';
import { GlobalVariables } from './globals/variables';
import './globals/user';
import './globals/projects.js';
import { accountMenu } from './globals/accountMenu';
import {Catalogs} from "./catalog/catalog.model";
import {SelectCatalogView} from "./catalog/select-catalog.view";
import { StateModel } from './utils/state.model.js';
import { WelcomeView } from './utils/welcome.view.js';

// Dangerously global variable (accessible from dependency modules).
GlobalVariables.myCollections = new VRECollections();

// Regular global variables, only visible in this module.

// All collections except for the one currently selected.
var unsalientCollections = new VRECollections();
var catalogs = new Catalogs([], {comparator: 'name'});
var catalogDropdown = new SelectCatalogView({
    collection: catalogs
});
var collectionDropdown = new SelectCollectionView({
    collection: GlobalVariables.myCollections
});
var navigationState = new StateModel;

// Override Backbone.sync so it always includes the CSRF token in requests.
Backbone.sync = wrapWithCSRF(Backbone.sync, 'X-CSRFToken', 'csrftoken');

var VRERouter = Backbone.Router.extend({
    routes: {
        'collection/:id/': 'showCollection',
        'catalog/:id/': 'showCatalog',
    },
});

var router = new VRERouter();

// We create some hooks between triggers and effects.
// Firstly, route changes should lead to different models moving to the center
// of attention.
router.on({
    'route:showCollection': id => navigationState.set({
        browsingType: 'collection',
        browsingContext: GlobalVariables.myCollections.find({name: id})
    }),
    'route:showCatalog': id => navigationState.set({
        browsingType: 'catalog',
        browsingContext: catalogs.findWhere({identifier: id})
    }),
});

// Focus/blur semantics for the catalog or collection currently being viewed.
navigationState.on({
    'enter:browsingContext': (model, newValue) => newValue.trigger('focus', newValue),
    'exit:browsingContext': (model, oldValue) => oldValue.trigger('blur', oldValue),
    'enter:browser': (model, newValue) => newValue.$el.appendTo('#content'),
    'exit:browser': (model, oldValue) => oldValue.remove(),
});

// We use different browser views depending on whether the model currently under
// attention is a catalog or a (VRE) collection. Also, there is still some
// residual code that depends on there being a global variable holding the
// currently selected collection.
catalogs.on({
    focus: catalog => navigationState.set(
        'browser', new CatalogSearchView({model: catalog})),
});

function showCollection(vreCollection) {
    unsalientCollections.remove(vreCollection);
    // The next line is not very MVC, but it works for now.
    vreChannel.request('projects:select', vreCollection.get('project'));
    navigationState.set(
        'browser', new BrowseCollectionView({model: vreCollection}));
}

function hideCollection(vreCollection) {
    unsalientCollections.add(vreCollection);
}

GlobalVariables.myCollections.on({
    focus: showCollection,
    blur: hideCollection,
});

// We ensure that unsalientCollections stays in sync with myCollections and that
// it is available via the radio.
GlobalVariables.myCollections.on({
    add: collection => unsalientCollections.add(collection),
    remove: collection => unsalientCollections.remove(collection),
});
vreChannel.reply('unsalientcollections', _.constant(unsalientCollections));

// Make current browsing type and context available to all views via the radio.
vreChannel.reply('browsingType', () => navigationState.get('browsingType'));
vreChannel.reply('browsingContext', () => navigationState.get('browsingContext'));

// Make catalog information available via channel
vreChannel.reply('getCatalog', (uri) => catalogs.get(uri));

// We want this code to run after two conditions are met:
// 1. The DOM has fully loaded;
// 2. the CSRF cookie has been obtained.
function prepareCollections() {
    $('#result-detail').modal({show: false});
    VRECollections.mine(GlobalVariables.myCollections);
    catalogs.fetch();
    vreChannel.request('projects:fetch', finish);
    GlobalVariables.myCollections.once('sync', finish);
    catalogs.once('sync', finish);

    // Add account menu
    accountMenu.$el.appendTo('#navbar-right');
    // Show the welcome view
    navigationState.set('browser', new WelcomeView);
}

// We want this code to run after prepareCollections has run and both
// GlobalVariables.myCollections and all projects have fully loaded.
function startRouting() {
    $('#navbar-left').append(
        catalogDropdown.el,
        collectionDropdown.el,
    );
    Backbone.history.start({
        pushState: true,
        root: '/',
    });
}

// _.after ensures that a function runs only after a given number of calls.
var kickoff = _.after(2, prepareCollections);
var finish = _.after(3, startRouting);

// Ensure we have a CSRF cookie.
if (Cookies.get('csrftoken')) {
    kickoff();
} else {
    $.ajax({url: '/accounts/login/'}).then(kickoff);
}

// Ensure the DOM has fully loaded.
$(kickoff);
