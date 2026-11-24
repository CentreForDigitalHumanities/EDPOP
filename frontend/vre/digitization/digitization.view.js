import _ from 'lodash';

import { View } from "../core/view";
import digitizationTemplate from './digitization.view.mustache';
import {IIIFManifestModel} from "./iiif.model";

export var DigitizationView = View.extend({
    tagName: 'div',
    template: digitizationTemplate,

    initialize: function() {
        if (this.model.get('field')) {
            this.empty = true;
            // Model is empty; this happens when the digitization field is absent
            if (this.model.get('isFirst')) this.render();
            return;
        }
        const manifestUrl = this.model.get('iiifManifest');
        this.encodedManifestUrl = encodeURIComponent(manifestUrl);
        if (manifestUrl) {
            // Model has a IIIF manifest
            this.iiifmodel = new IIIFManifestModel();
            this.iiifmodel.fetch({url: manifestUrl});
            this.listenTo(this.iiifmodel, 'change', this.render);
        }
        this.render();
    },

    render: function() {
        var payload = _.pick(this, 'empty', 'encodedManifestUrl');
        if (this.iiifmodel) payload.previewUrl = this.iiifmodel.thumbnailUrl();
        payload = _.defaults(payload, this.model.attributes);
        this.$el.html(this.template(payload));
        return this;
    },
});
