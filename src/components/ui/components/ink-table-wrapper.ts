import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const InkTable = require('ink-table');

export default InkTable.default;
