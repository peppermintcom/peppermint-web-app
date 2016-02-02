var request = require('request');

exports.postJSON = function(url, body, headers) {
  return new Promise(function(resolve, reject) {
    request({
      url: url,
      method: 'POST',
      json: true,
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

exports.get = function(url, headers) {
  return new Promise(function(resolve, reject) {
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
  });
};
