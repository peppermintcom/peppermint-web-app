module.exports = process.env.LAMBDA_TASK_ROOT ? require('./conf.json') : process.env;
