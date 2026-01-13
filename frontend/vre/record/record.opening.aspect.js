import { vreChannel } from '../radio';
import { RecordDetailView } from './record.detail.view';

var currentModal = null;

function purgeModal() {
    currentModal = null;
    vreChannel.trigger('unhighlightRecord');
}

function displayRecord(model) {
    if (currentModal && currentModal.model !== model) currentModal.remove();
    if (!currentModal) {
        currentModal = new RecordDetailView({model: model})
        .on('remove', purgeModal);
    }
    currentModal.display();
    vreChannel.trigger('highlightRecord', model);
}

vreChannel.on({
    displayRecord: displayRecord,
});
