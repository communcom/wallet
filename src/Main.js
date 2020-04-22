const core = require('cyberway-core-service');
const BasicMain = core.services.BasicMain;

const env = require('./data/env');

const Prism = require('./services/Prism');
const Connector = require('./services/Connector');
const PrismConnector = require('./services/PrismConnector');

class Main extends BasicMain {
    constructor() {
        super(env);

        this.startMongoBeforeBoot(null, { poolSize: env.GLS_MONGO_POOL_SIZE });

        if (env.GLS_ENABLE_READ_MODE) {
            this.addNested(new Connector());
        }

        if (env.GLS_ENABLE_WRITE_MODE) {
            const prism = new Prism();
            const prismConnector = new PrismConnector({ prism });
            this.addNested(prism, prismConnector);
        }
    }
}

module.exports = Main;
