import { View } from "../core/view";
import digitizationTemplate from './digitization.view.mustache';
import {IIIFManifestModel} from "./iiif.model";

export var DigitizationView = View.extend({
    tagName: 'div',
    template: digitizationTemplate,

    initialize: function() {
        if (!this.model.get('value')) {
            // Model is empty; this happens when the digitization field is absent
            this.empty = true;
            this.render();
            return;
        }
        const manifestUrl = this.model.get('value')["edpoprec:iiifManifest"];
        this.summaryText = this.model.get('value')["edpoprec:summaryText"];
        this.previewUrl = this.model.get('value')["edpoprec:previewURL"];
        this.externalUrl = this.model.get('value')["edpoprec:url"];
        this.manifestUrl = manifestUrl;
        this.encodedManifestUrl = encodeURIComponent(manifestUrl);
        if (manifestUrl) {
            // Model has a IIIF manifest
            this.iiifmodel = new IIIFManifestModel();
            this.iiifmodel.fetch({url: manifestUrl});
            this.iiif = true;
            this.listenTo(this.iiifmodel, 'change', this.render);
        } else {
            this.iiif = false;
        }
        this.render();
    },

    render: function() {
        if (this.iiif) {
            this.previewUrl = this.iiifmodel.thumbnailUrl();
        }
        this.$el.html(this.template(this));
        return this;
    }
});
