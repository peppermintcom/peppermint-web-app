//@flow
import type {Recorder} from '../domain'

import http from './http'
import conf from './conf'
import Recorders from '../repository/recorders'
import gcmMocks from './gcmMocks'
import _ from 'lodash'

//call the GCM API in production
//get the mock response in development
function send(message: Object): Promise<Object> {
  if (conf.NODE_ENV === 'development') {
    return Promise.resolve({
      statusCode: 200,
      headers: {},
      body: gcmMocks.response(message.to ? [message.to] : message.registration_ids),
    })
  }

  return http.postJSON('https://gcm-http.googleapis.com/gcm/send', message, {
      Authorization: 'key=' + conf.PEPPERMINT_GCM_API_KEY,
    })
    .then(function(res) {
      return _.pick(res, 'statusCode', 'body', 'headers')
    })
}

//message should already be formatted other than to field
function deliver(receivers: Recorder[], message: Object): Promise<Object> {
  let gcmTokens = receivers.map((r) => (r.gcm_registration_token))
  let res:Object = {}

  if (gcmTokens.length === 1) {
    message.to = gcmTokens[0]
  } else {
    message.registration_ids = gcmTokens;
  }

  return send(message)
    .then(function(response) {
      res = response

      if (response.body.failure || response.body.canonical_ids) {
        return Promise.all([
          changeOldTokens(receivers, response.body.results),
          removeInvalidTokens(receivers, response.body.results),
        ])
      }
    })
    .then(function() {
      return res
    })
}

//iterate over all results and change any outdated tokens
function changeOldTokens(receivers, results) {
  return Promise.all(results.map(function(result, i) {
    if (result.message_id && result.registration_id) {
      return Recorders.updateGCMToken(receivers[i].client_id, result.registration_id);
    }
    return Promise.resolve();
  }));
}

//iterate over all results and delete any invalid tokens
function removeInvalidTokens(receivers, results) {
  return Promise.all(results.map(function(result, i) {
    if (result.error && /InvalidRegistration|NotRegistered/.test(result.error)) {
      return Recorders.updateGCMToken(receivers[i].client_id, null);
    }
    return Promise.resolve();
  }))
}

export default deliver
