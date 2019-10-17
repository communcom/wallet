const core = require('cyberway-core-service');
const BasicMain = core.services.BasicMain;

const env = require('./data/env');

const Prism = require('./services/Prism');
const Connector = require('./services/Connector');

class Main extends BasicMain {
    constructor() {
        super(env);

        const connector = new Connector();
        const prism = new Prism();

        this.startMongoBeforeBoot(null, {
            poolSize: 500,
        });

        if (env.GLS_ENABLE_READ_MODE) {
            this.addNested(connector);
        }

        if (env.GLS_ENABLE_WRITE_MODE) {
            this.addNested(prism);
        }
    }
}

module.exports = Main;
