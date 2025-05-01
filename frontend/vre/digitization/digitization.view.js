import { View } from "../core/view";
import digitizationTemplate from './digitization.view.mustache';
import {getPreviewUrlFromIIIFManifest} from "../utils/digitizations";

export var DigitizationView = View.extend({
    tagName: 'div',
    template: digitizationTemplate,

    events: {
        'click button.show-mirador': 'openMirador'
    },

    openMirador: function() {
        Mirador.viewer({
            id: "mirador",
            manifests: {
                [this.manifestUrl]: {
                    provider: "edpop",
                }
            },
            windows: [
                {
                    loadedManifest: this.manifestUrl,
                }
            ],
            workspaceControlPanel: false,
        });
    },

    initialize: function() {
        if (!this.model.get('value')) {
            // Model is empty; this happens when the digitization field is absent
            this.empty = true;
            this.render();
            return;
        }
        const manifestUrl = this.model.get('value')["edpoprec:iiifManifest"];
        if (manifestUrl) {
            // Model has a IIIF manifest
            const thumbnailUrlPromise = getPreviewUrlFromIIIFManifest(manifestUrl);
            thumbnailUrlPromise.then(url => {
                this.iiif = true;
                this.thumbnailUrl = url;
                this.manifestUrl = manifestUrl;
                this.render();
            });
        }
    },

    render: function() {
        this.$el.html(this.template(this));
        return this;
    }
});
