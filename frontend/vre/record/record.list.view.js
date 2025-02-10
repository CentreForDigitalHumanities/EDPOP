import Backbone from "backbone";
import {vreChannel} from "../radio";
import Tabulator from "tabulator";
import {adjustDefinitions} from "../utils/tabulator-utils";

export var RecordListView = Backbone.View.extend({
    id: "record-list",
    /**
     * The Tabulator instance
     * @type {Tabulator}
     */
    table: null,

    initialize: function(options) {
        this.collection.on("sync", () => {
            this.updateTable();
        });
    },

    createTable: function(initialData) {
        this.table = new Tabulator("#record-list", {
            height: 650, // set height of table (in CSS or here), this enables the Virtual DOM and improves render speed dramatically (can be any valid css height value)
            data: initialData,
            autoColumns: true,
            autoColumnsDefinitions: adjustDefinitions,
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
    },

    updateTable: function() {
        if (this.collection.length === 0) {
            return;
        }
        const data = this.collection.toTabularData();
        if (this.table === null) {
            this.createTable(data);
        } else {
            this.table.replaceData(data);
        }
    },

    downloadXLSX: function() {
        this.table.download("xlsx", "edpop.xlsx", {sheetName: "EDPOP"});
    },

    downloadCSV: function() {
        this.table.download("csv", "edpop.csv");
    },
});
