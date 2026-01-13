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

vreChannel.on({
    displayRecord: displayRecord,
});
