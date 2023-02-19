const Vlee = require('./vlee');

const temp = null;
const result = Vlee.string(temp).required().validate();
console.log(result);