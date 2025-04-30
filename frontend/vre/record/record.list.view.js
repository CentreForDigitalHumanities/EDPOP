import _ from 'lodash';
import Backbone from "backbone";
import Tabulator from "tabulator";

import {vreChannel} from "../radio";
import {adjustDefinitions} from "../utils/tabulator-utils";

function getModelId(rowData) {
    return rowData.model.id;
}

export var RecordListView = Backbone.View.extend({
    id: "record-list",
    /**
     * The Tabulator instance
     * @type {Tabulator}
     */
    table: null,
    /**
     * The record class (BIBLIOGRAPHICAL or BIOGRAPHICAL)
     * @type {?string}
     */
    recordClass: null,

    initialize: function(options) {
        _.assign(this, _.pick(options, ['recordClass']));
        this.render().listenTo(this.collection, 'update', this.render);
    },

    createTable: function(initialData) {
        this.table = new Tabulator(this.el, {
            height: "calc(100vh - 360px)", // set height to table approximately to what is left of viewport height
            data: initialData,
            autoColumns: true,
            autoColumnsDefinitions: (autodetected) => {return adjustDefinitions(autodetected, this.recordClass)},
            layout: "fitColumns",
            rowHeader: {
                width: 50,
                formatter: "rowSelection",
                titleFormatter: "rowSelection",
                headerSort: false,
                resizable: false,
                frozen:true,
                headerHozAlign:"center",
                hozAlign:"center",
                cellClick:function(e, cell){
                    cell.getRow().toggleSelect();
                },
            },
            headerFilterLiveFilterDelay: 0,
        });
        this.table.on("rowClick", (e, row) => {
            const model = row.getData().model;
            vreChannel.trigger('displayRecord', model);
        });
        return this;
    },

    render: function() {
        if (this.collection.length === 0) return this.removeTable();
        const data = this.collection.toTabularData();
        if (this.table === null) return this.createTable(data);
        this.table.replaceData(data);
        return this;
    },

    removeTable: function() {
        if (this.table) {
            this.table.destroy();
            this.table = null;
        }
        return this;
    },

    currentSelection: function() {
        return _.map(this.table.getSelectedData(), getModelId);
    },

    downloadXLSX: function() {
        this.table.download("xlsx", "edpop.xlsx", {sheetName: "EDPOP"});
        return this;
    },

    downloadCSV: function() {
        this.table.download("csv", "edpop.csv");
        return this;
    },
});
