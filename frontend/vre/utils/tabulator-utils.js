import _ from 'lodash';
import {Model, Collection} from 'backbone';
import {MappedCollection} from './mapped.collection.js';
import {properties} from './record-ontology';
import {getStringLiteral} from './jsonld.model';
import recordTypeIcon from '../record/record.type.icon.mustache';

/**
 * A Tabulator menu to hide and show the available columns.
 * Adapted from: https://tabulator.info/examples/6.2#menu
 */
export const columnChooseMenu = function(){
    const menu = [];
    const columns = this.getColumns();
    menu.push({
        label: "Show/hide columns",
        disabled: true,
    }, {
        separator: true,
    });

    for (let column of columns) {
        const definition = column.getDefinition();
        if (definition.field === "model" || !definition.title) {
            /* Do not add the 'model' column (for internal use only) and
               do not add columns that do not have a title */
            continue;
        }
        // create checkbox element using font awesome icons
        const icon = document.createElement("i");
        icon.classList.add("glyphicon");
        icon.classList.add(column.isVisible() ? "glyphicon-check" : "glyphicon-unchecked");

        // build label
        let label = document.createElement("span");
        let title = document.createElement("span");

        title.textContent = " " + definition.title;

        label.appendChild(icon);
        label.appendChild(title);

        // create menu item
        menu.push({
            label: label,
            action: function(e){
                // prevent menu closing
                e.stopPropagation();

                // toggle current column visibility
                column.toggle();

                // change menu item icon
                if (column.isVisible()) {
                    icon.classList.remove("glyphicon-unchecked");
                    icon.classList.add("glyphicon-check");
                } else {
                    icon.classList.remove("glyphicon-check");
                    icon.classList.add("glyphicon-unchecked");
                }
            }
        });
    }

    return menu;
};

const typeTranslation = {
    'edpoprec:BibliographicalRecord': {isBibliographical: true},
    'edpoprec:BiographicalRecord': {isBiographical: true},
};

const defaultColumnFeatures = {
    visible: false,
    headerFilter: true,
    headerContextMenu: columnChooseMenu,
};

const columnProperties = {
    type: {},
    'edpoprec:title': {
        widthGrow: 5,
    },
    'edpoprec:placeOfPublication': {},
    'edpoprec:dating': {
        widthGrow: 0.5,
    },
    'edpoprec:publisherOrPrinter': {},
    'edpoprec:contributor': {},
    'edpoprec:activity': {},
};

const columnOrder = _.invert(_.keys(columnProperties));

const ColumnDefinition = Model.extend({
    idAttribute: 'field',
});

function byPreference(columnDef) {
    const definedOrder = columnOrder[columnDef.id];
    return definedOrder != null ? definedOrder : columnOrder.length;
}

function property2definition(property) {
    return _.assign({
        title: getStringLiteral(property.get('skos:prefLabel')),
        field: property.id,
    }, defaultColumnFeatures, columnProperties[property.id])
}

const standardColumns = new MappedCollection(
    properties,
    property2definition,
    {model: ColumnDefinition, comparator: byPreference},
);

standardColumns.unshift({
    field: 'type',
    title: 'Type',
    visible: true,
    headerContextMenu: columnChooseMenu,
    formatter: cell => recordTypeIcon(typeTranslation[cell.getValue()]),
    hozAlign: 'right',
    tooltip: (e, cell) => cell.getValue().slice(9, -6),
    width: 48,
    _ucid: {},
}, {convert: false});

export function adjustDefinitions(autodetected) {
    const customizedColumns = standardColumns.clone();
    _.each(autodetected, autoColumn => {
        if (!(autoColumn.field in columnProperties)) return;
        const customColumn = customizedColumns.get(autoColumn.field);
        customColumn && customColumn.set('visible', true);
    });
    return customizedColumns.toJSON();
}
