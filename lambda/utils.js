//@flow
import lodash from 'lodash'
import apps from '../utils/apps'
import jwt from '../utils/jwt'

//status 400
let ErrAPIKey: Object = new Error('400')
ErrAPIKey.detail = 'Invalid API Key'

//status 401
let ErrAuthorizationHeader: Object = new Error('401')
ErrAuthorizationHeader.detail = 'Authorization header should be formatted: Bearer <JWT>'

let ErrAuth: Object = new Error('401')
ErrAuth.detail = 'Error: Signature verification failed'

type handler = {
  fn: Function;
  //if key is defined, the result of fn will be added to the state object
  key?: string;
}
type action = handler[]

//Every action comprises one or more handlers that potentially mutate the state.
//All the handlers in a single action run concurrently on the same state. When
//all the handlers in a single action return, their result is applied to the
//state, then the next action is run. If a handler does not return a result it
//does not need to include a string key name where its result will be added to
//the state object. Mutations are limited to defined points between actions when
//no handlers are running. No handler should mutate the state object directly.
async function run(state: Object, actions: action[]): Promise<Object> {
  for (let i = 0; i < actions.length; i++) {
    let action: handler[] = actions[i]
    let results = await Promise.all(action.map((handler) => handler.fn(state)))

    for (let j = 0; j < results.length; j++) {
      if (action[j].key) {
        state[action[j].key] = results[j]
      }
    }
  }

  return state
}

//Adapt a batch of Promise routines to the format expected by new Lambda Node.js
//programming environment. One of the handlers must define a "response" property
//on the state, which will be returned to the caller.
function use(actions: action[]): Function {
  return function (req: Object, context: Object, cb: Function) {
    run(req, actions)
    .then(function(state) {
      //state === req because run mutates req
      cb(null, state.response);
    })
    .catch(function(err) {
      if (err.detail) {
        //JSON-API error objects
        err.name = JSON.stringify({detail: err.detail})
      } else {
        //unexpected error
        console.log(err)
      }
      cb(err);
    });
  };
}


//Predicate whether provided key belongs to an app.
function isValidAPIKey(key: string): boolean {
  return !!apps[key];
};

//Throws an error if the state does not have a valid api_key. Returns null diff
//if the api_key is OK.
function validateAPIKey(state: Object): Promise<null> {
  return new Promise(function(resolve, reject) {
    if (!lodash.isString(state.api_key)) {
      reject(ErrAPIKey)
      return
    }
    if (!isValidAPIKey(state.api_key)) {
      reject(ErrAPIKey)
      return
    }
    resolve(null)
  })
}

/**
 * Checks and parses the JWT from an Authorization Bearer header.
 * Adds a "JWT" property to the request if authentication is ok.
 * @param {Authorization} string
 */
type identity = {
  account_id?: string;
  recorder_id?: string;
  email?: string;
}
function authenticate(state: Object): Promise<identity> {
  return new Promise(function(resolve, reject) {
    var parts = (state.Authorization || '').trim().split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      reject(ErrAuthorizationHeader);
      return;
    }

    let parsed = jwt.verify(parts[1]);

    if (parsed.err) {
      reject(ErrAuth)
      return
    }

    resolve(parsed);
  });
};

export default {
  use,
  validateAPIKey,
  authenticate,
}
