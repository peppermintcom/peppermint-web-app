//@flow
//Mock results for each registration token. Mock response from GCM given state
//of each token.
import _ from 'lodash'
import _token from './randomtoken'

/*
 * Use global to fix a problem where local variable was not shared between
 * closures because this module was getting re-evaluated. It gets evaluated when
 * bundled, then again when used in tests. The store in the bundled module was
 * not shared.
 */
let store = global.store || (global.store = new Map())

function good(token: string): {message_id: string} {
  let result = {message_id: _token(24)}

  store.set(token, result)

  return result
}

function bad(token: string): {error: string} {
  let err = _.sample(['InvalidRegistration', 'NotRegistered']);
  let result = {error: err}

  store.set(token, result)

  return result
}

function old(token: string): Object {
  let result = {
    message_id: _token(24),
    registration_id: _token(64),
  }

  store.set(token, result)

  return result
}

function response(tokens: string[]): Object {
  let response = {
    multicast_id: Math.floor(Math.random() * 100000000),
    success: 0,
    failure: 0,
    canonical_ids: 0,
    results: [],
  }

  return tokens.reduce(function(response, token) {
    let result = store.get(token)

    if (!result) {
      throw new Error('need a mock for registration token ' + token)
    }
    if (result.message_id) {
      response.success++
    } else {
      response.failure++
    }

    if (result.registration_id) {
      response.canonical_ids++
    }

    response.results.push(result)

    return response;
  }, response)
}

export default {
  good,
  bad,
  old,
  response,
}
