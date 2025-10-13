import { channel } from 'backbone.radio';

// A radio channel is an event bus that enables long-distance communication
// without introducing tight coupling between code units. See
// https://www.npmjs.com/package/backbone.radio for documentation.
// For now, one channel for the entire application is probably enough. If the
// radio gets "crowded", we may want to consider creating multiple
// domain-specific radio channels.
export var vreChannel = channel('edpop-vre');
