import { vreChannel } from '../radio';
import { RecordDetailView } from './record.detail.view';

var currentModal = null;

function purgeModal() {
    currentModal = null;
}

function displayRecord(model) {
    if (currentModal && currentModal.model !== model) currentModal.remove();
    if (!currentModal) {
        currentModal = new RecordDetailView({model: model})
        .on('remove', purgeModal);
    }
    currentModal.display();
}

function shift(direction) {
    return function() {
        if (!currentModal) return;
        var model = currentModal.model;
        var collection = model.collection;
        var oldIndex = collection.indexOf(model);
        var newIndex = oldIndex + direction;
        displayRecord(collection.at(newIndex));
    }
}

vreChannel.on({
    displayRecord: displayRecord,
    displayNextRecord: shift(+1),
    displayPreviousRecord: shift(-1),
});
