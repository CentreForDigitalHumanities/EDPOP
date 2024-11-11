import _ from 'lodash';
import {properties} from './record-ontology';
import {getStringLiteral} from './jsonld.model';

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

const defaultColumnFeatures = {
    visible: false,
    headerFilter: true,
    headerContextMenu: columnChooseMenu,
};

const columnProperties = {
    'edpoprec:title': {
        visible: true,
        widthGrow: 5,
        formatter: 'textarea',
    },
    'edpoprec:placeOfPublication': {
        visible: true,
    },
    'edpoprec:dating': {
        visible: true,
        widthGrow: 0.5,
    },
    'edpoprec:publisherOrPrinter': {
        visible: true,
    },
    'edpoprec:contributor': {
        visible: true,
    },
    'edpoprec:activity': {
        visible: true,
    },
};

function adjustDefinition(bareDefinition) {
    const property = properties.get(bareDefinition.field);
    const addedTitle = property ? {
        title: getStringLiteral(property.get('skos:prefLabel')),
    } : null;
    const customProperties = columnProperties[bareDefinition.field];
    return _.assign(
        {},
        bareDefinition,
        defaultColumnFeatures,
        addedTitle,
        customProperties
    );
}

export const adjustDefinitions = _.partial(_.map, _, adjustDefinition);
