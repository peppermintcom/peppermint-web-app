//This module contains all utilities in index.js plus more used only in tests.
var request = require('request');
var fake = require('./fake');
var _ = require('./index');

const API_URL = 'https://qdkkavugcd.execute-api.us-west-2.amazonaws.com/prod/v1';

exports.API_URL = API_URL;

exports.fake = require('./fake');

var deleteAccount = exports.deleteAccount = function(email) {
  return new Promise(function(resolve, reject) {
    _.dynamo.deleteItem({
      Key: {email: {S: email}},
      TableName: 'accounts',
    }, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};
exports.deleteAccountAfter = function(email) {
  return function() {
    return deleteAccount(email);
  };
};

exports.deleteRecorder = function(client_id) {
  return new Promise(function(resolve, reject) {
    _.dynamo.deleteItem({
      Key: {client_id: {S: client_id}},
      TableName: 'recorders',
    }, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

exports.verifyAccount = function(email, ip) {
  return new Promise(function(resolve, reject) {
    _.dynamo.updateItem({
      TableName: 'accounts',
      Key: {
        email: {S: email.toLowerCase()},
      },
      AttributeUpdates: {
        verification_ts: {Value: {N: Date.now().toString()}},
        verification_ip: {Value: {S: ip}},
      },
    }, function(err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

var base64Creds = exports.base64Creds = function(user, pass) {
  return Buffer(user + ':' + pass).toString('base64');
};

exports.basic = function(user, password) {
  return 'Basic ' + base64Creds(user, password);
};

var GOOGLE = 1;
var FACEBOOK = 2;
var peppermintScheme = exports.peppermintScheme = function(recorderUser, recorderPass, accountUser, accountPass, provider) {
  var h = 'Peppermint ';

  if (recorderUser) {
    h += 'recorder=' + base64Creds(recorderUser, recorderPass);
  }

  if (accountUser) {
    if (recorderUser) {
      h += ', ';
    }
    if (provider === GOOGLE) {
      h += 'google=';
    } else if (provider === FACEBOOK) {
      h += 'facebook=';
    } else {
      h += 'account=';
    }
    h += base64Creds(accountUser, accountPass);
  }

  return h;
};

exports.httpPlain = function(method, path, body, headers) {
  return new Promise(function(resolve, reject) {
    request({
      url: API_URL + path,
      method: method,
      body: body,
      headers: headers,
    }, function(err, res, body) {
      if (err) {
        reject(err);
        return;
      }
      res.body = body;
      resolve(res);
    });
  });
};

var http = exports.http = function(method, path, body, headers) {
  return new Promise(function(resolve, reject) {
    var url = /^http/.test(path) ? path : API_URL + path;

    //GET
    if (method.toLowerCase() === 'get') {
      request(url, {
        headers: headers,
      }, function(err, res, body) {
        if (err) {
          reject(err);
          return;
        }
        res.body = JSON.parse(body);
        resolve(res);
      });
      return;
    }

    //DELETE
    if (method.toLowerCase() === 'delete') {
      request({
        url: url,
        body: body,
        method: 'DELETE',
        headers: headers,
      }, function(err, res, body) {
        if (err) {
          reject(err);
          return;
        }
        if (res.headers['content-type'] && /json$/.test(res.headers['content-type'])) {
          res.body = JSON.parse(body);
        } else {
          res.body = body;
        }
        resolve(res);
      });
      return;
    }

    var type = (headers && (headers['Content-Type'] || headers['content-type'])) || 'application/json';

    request({
      url: url,
      method: method,
      json: /json$/.test(type),
      body: body,
      headers: headers,
    }, function(err, res, body) {
      if (err) {
        reject(err);
        return;
      }
      res.body = body;
      resolve(res);
    });
  });
};

exports.gcm = require('./gcmstub');

exports.auth = function (recorderUser, recorderPass, accountUser, accountPass) {
  return http('POST', '/jwts', {}, {
    Authorization: peppermintScheme(recorderUser, recorderPass, accountUser, accountPass),
    'X-Api-Key': fake.API_KEY,
  })
  .then(function(response) {
    if (response.statusCode !== 200) {
      console.log(response.body);
      throw new Error(response.statusCode);
    }
    return response.body.data.attributes.token;
  });
};

module.exports = _.assign({}, _, exports);
