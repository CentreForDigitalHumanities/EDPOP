import { Model } from 'backbone';
import { getStateMixin } from '@uu-cdh/backbone-util';

export var StateModel = Model.extend(getStateMixin());
