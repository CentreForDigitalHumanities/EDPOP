import {APIModel} from "../utils/api.model";

export var BlankRecordModel = APIModel.extend({
    url: '/api/blank-record/',

    createRecord: function(options) {
        return this.save({collection: this.get('collection')}, _.extend({type: 'POST'}, options));
    }
});
