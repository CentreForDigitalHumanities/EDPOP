import { APIModel, APICollection } from '../utils/api.model';

export var Project = APIModel.extend({
    idAttribute: 'uri',
});

export var Projects = APICollection.extend({
    url: '/api/projects/',
    model: Project,
}, {
    mine: function () {
        var myProjects = new Projects();
        myProjects.fetch({ url: myProjects.url + 'mine/' });
        return myProjects;
    },
});
