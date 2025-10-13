import { vreChannel } from '../radio.js';
import { Projects } from '../project/project.model.js';
import { ProjectMenuView } from '../project/project.menu.view';

var allProjects = new Projects;
var myProjects, projectMenu;

function fetch(callback) {
    allProjects.fetch();
    myProjects = Projects.mine();
    projectMenu = new ProjectMenuView({collection: myProjects});
    allProjects.once('sync', callback);
}

function select(name) {
    projectMenu.select(name);
}

function currentProject() {
    return projectMenu.model;
}

vreChannel.reply({
    'projects:fetch': fetch,
    'projects:select': select,
    'projects:get': allProjects.get.bind(allProjects),
    'projects:find': allProjects.find.bind(allProjects),
    'projects:current': currentProject,
});
